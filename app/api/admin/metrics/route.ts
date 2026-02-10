import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdminLike(role: string | undefined | null) {
  if (!role) return false;
  return ["staff", "outlet_manager", "admin", "owner", "super_admin"].includes(role);
}

/* ── Staleness threshold: background re-compute if summary older than 30 min ── */
const STALE_MS = 30 * 60_000;

/* ── In-memory cache so concurrent requests don't all hit DB ───── */
let memCache: { payload: any; ts: number } | null = null;
const MEM_TTL_MS = 5 * 60_000; // 5 min

/* ── Guard: only one background recompute at a time ── */
let recomputeInFlight = false;

/**
 * Heavy aggregation — runs ~15s on cold DB.
 * Result is stored in MetricsSummary table + memory cache.
 */
async function computeAndStore() {
  const currentDate = new Date();
  const thisMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0, 23, 59, 59);

  const thisMonthISO = thisMonthStart.toISOString().slice(0, 19).replace("T", " ");
  const lastMonthStartISO = lastMonthStart.toISOString().slice(0, 19).replace("T", " ");
  const lastMonthEndISO = lastMonthEnd.toISOString().slice(0, 19).replace("T", " ");

  // Run the mega subquery + 4 GROUP BY queries in parallel
  const [megaRow, monthlyRaw, yearlyRaw, outletStatsRaw, statusRaw, outletYearlyRaw] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*) FROM \`order\`) AS totalOrders,
        (SELECT COUNT(*) FROM \`order\` WHERE status = 'delivered') AS completedOrders,
        (SELECT COUNT(*) FROM \`order\` WHERE status = 'cancelled') AS cancelledOrders,
        (SELECT COUNT(*) FROM \`order\` WHERE status NOT IN ('delivered','cancelled')) AS activeOrders,
        (SELECT COUNT(*) FROM customer) AS totalCustomers,
        (SELECT COUNT(*) FROM staff) AS totalStaff,
        (SELECT COUNT(*) FROM staff WHERE isActive = 1) AS activeStaff,
        (SELECT CAST(COALESCE(SUM(amount),0) AS DECIMAL(15,2)) FROM payment WHERE status IN ('verified','completed')) AS totalRevenue,
        (SELECT COUNT(*) FROM \`order\` WHERE createdAt >= '${thisMonthISO}') AS thisMonthOrders,
        (SELECT COUNT(*) FROM \`order\` WHERE createdAt >= '${lastMonthStartISO}' AND createdAt <= '${lastMonthEndISO}') AS lastMonthOrders,
        (SELECT CAST(COALESCE(SUM(amount),0) AS DECIMAL(15,2)) FROM payment WHERE status IN ('verified','completed') AND paidAt >= '${thisMonthISO}') AS thisMonthRevenue,
        (SELECT CAST(COALESCE(SUM(amount),0) AS DECIMAL(15,2)) FROM payment WHERE status IN ('verified','completed') AND paidAt >= '${lastMonthStartISO}' AND paidAt <= '${lastMonthEndISO}') AS lastMonthRevenue
    `).then((r: any) => (r as any[])[0]),

    prisma.$queryRawUnsafe(`
      SELECT DATE_FORMAT(createdAt,'%Y-%m') AS month, COUNT(*) AS orders,
        CAST(SUM(CASE WHEN status='delivered' THEN totalAmount ELSE 0 END) AS DECIMAL(15,2)) AS revenue,
        SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) AS completed
      FROM \`order\` WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 13 MONTH)
      GROUP BY month ORDER BY month
    `) as Promise<any[]>,

    prisma.$queryRawUnsafe(`
      SELECT YEAR(createdAt) AS year, COUNT(*) AS orders,
        CAST(SUM(CASE WHEN status='delivered' THEN totalAmount ELSE 0 END) AS DECIMAL(15,2)) AS revenue
      FROM \`order\` GROUP BY year ORDER BY year
    `) as Promise<any[]>,

    prisma.$queryRawUnsafe(`
      SELECT o.outletId, ot.code, ot.name, ot.capacityPerDay,
        COUNT(*) AS totalOrders,
        CAST(SUM(CASE WHEN o.status='delivered' THEN o.totalAmount ELSE 0 END) AS DECIMAL(15,2)) AS totalRevenue,
        SUM(CASE WHEN o.status NOT IN ('delivered','cancelled') THEN 1 ELSE 0 END) AS activeOrders,
        CAST(AVG(CASE WHEN o.status='delivered' AND o.pickupCompletedAt IS NOT NULL AND o.deliveryCompletedAt IS NOT NULL
          THEN TIMESTAMPDIFF(HOUR, o.pickupCompletedAt, o.deliveryCompletedAt) ELSE NULL END) AS DECIMAL(10,1)) AS avgTurnaround
      FROM \`order\` o JOIN outlet ot ON ot.id = o.outletId WHERE ot.isActive = 1
      GROUP BY o.outletId, ot.code, ot.name, ot.capacityPerDay
    `) as Promise<any[]>,

    prisma.$queryRawUnsafe(`
      SELECT status, COUNT(*) AS cnt FROM \`order\` GROUP BY status
    `) as Promise<any[]>,

    prisma.$queryRawUnsafe(`
      SELECT o.outletId, ot.code, ot.name, YEAR(o.createdAt) AS year,
        COUNT(*) AS orders,
        CAST(SUM(CASE WHEN o.status='delivered' THEN o.totalAmount ELSE 0 END) AS DECIMAL(15,2)) AS revenue
      FROM \`order\` o JOIN outlet ot ON ot.id = o.outletId WHERE ot.isActive = 1
      GROUP BY o.outletId, ot.code, ot.name, year ORDER BY ot.code, year
    `) as Promise<any[]>,
  ]);

  const m = megaRow as any;
  const totalRevenue = Number(m.totalRevenue);
  const completedOrders = Number(m.completedOrders);
  const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;
  const lastMonthRevenue = Number(m.lastMonthRevenue);
  const thisMonthRevenue = Number(m.thisMonthRevenue);
  const growthPercent = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 1000) / 10
    : 0;

  const payload = {
    overview: {
      totalRevenue,
      totalOrders: Number(m.totalOrders),
      totalCustomers: Number(m.totalCustomers),
      totalStaff: Number(m.totalStaff),
      activeStaff: Number(m.activeStaff),
      activeOrders: Number(m.activeOrders),
      completedOrders,
      cancelledOrders: Number(m.cancelledOrders),
      avgOrderValue,
    },
    monthly: monthlyRaw.map((r: any) => ({
      month: String(r.month), orders: Number(r.orders),
      revenue: Number(r.revenue), completed: Number(r.completed),
    })),
    yearly: yearlyRaw.map((r: any) => ({
      year: Number(r.year), orders: Number(r.orders), revenue: Number(r.revenue),
    })),
    outlets: outletStatsRaw.map((s: any) => {
      const activeCount = Number(s.activeOrders);
      const capacity = s.capacityPerDay || 100;
      return {
        id: s.outletId, code: s.code, name: s.name,
        totalOrders: Number(s.totalOrders), totalRevenue: Number(s.totalRevenue),
        activeOrders: activeCount,
        capacityLoadPercent: Math.min(100, Math.round((activeCount / capacity) * 100)),
        avgTurnaroundHours: Number(s.avgTurnaround ?? 0),
      };
    }),
    ordersByStatus: Object.fromEntries(statusRaw.map((g: any) => [g.status, Number(g.cnt)])),
    outletYearly: (() => {
      const map: Record<string, { code: string; name: string; years: { year: number; revenue: number; orders: number }[] }> = {};
      for (const r of outletYearlyRaw as any[]) {
        const id = r.outletId as string;
        if (!map[id]) map[id] = { code: r.code, name: r.name, years: [] };
        map[id].years.push({ year: Number(r.year), revenue: Number(r.revenue), orders: Number(r.orders) });
      }
      return map;
    })(),
    recentActivity: {
      thisMonthRevenue,
      thisMonthOrders: Number(m.thisMonthOrders),
      lastMonthRevenue,
      lastMonthOrders: Number(m.lastMonthOrders),
      growthPercent,
    },
  };

  // Persist to DB (upsert singleton row)
  await prisma.metricsSummary.upsert({
    where: { id: "singleton" },
    update: { payload: payload as any, refreshedAt: new Date() },
    create: { id: "singleton", payload: payload as any, refreshedAt: new Date() },
  });

  // Update memory cache
  memCache = { payload, ts: Date.now() };
  return payload;
}

/** Trigger background recompute (fire-and-forget). */
function triggerBackgroundRecompute() {
  if (recomputeInFlight) return;
  recomputeInFlight = true;
  computeAndStore()
    .catch((e) => console.error("Background metrics recompute failed:", e))
    .finally(() => { recomputeInFlight = false; });
}

/**
 * Fast path: ALWAYS return data in <100ms.
 * Memory cache → DB summary → only block if nothing exists at all.
 * Background recompute if stale.
 */
async function getMetrics() {
  // 1. Memory cache — instant
  if (memCache) {
    // If stale, trigger background refresh but still serve cached data now
    if (Date.now() - memCache.ts > MEM_TTL_MS) {
      triggerBackgroundRecompute();
    }
    return memCache.payload;
  }

  // 2. DB summary table — ~50ms
  const row = await prisma.metricsSummary.findUnique({ where: { id: "singleton" } });
  if (row) {
    const payload = row.payload;
    memCache = { payload, ts: Date.now() };
    // Recompute in background if stale
    if (Date.now() - row.refreshedAt.getTime() > STALE_MS) {
      triggerBackgroundRecompute();
    }
    return payload;
  }

  // 3. Truly first-ever request — no choice but to block
  return computeAndStore();
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || !isAdminLike(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await getMetrics();

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Error fetching admin metrics:", error);
    return NextResponse.json({ error: "Failed to fetch admin metrics" }, { status: 500 });
  }
}
