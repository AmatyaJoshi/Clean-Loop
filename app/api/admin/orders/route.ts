import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdminLike(role: string | undefined | null) {
  if (!role) return false;
  return ["staff", "outlet_manager", "admin", "owner", "super_admin"].includes(role);
}

/* ── Outlet-load cache (shared across requests, refreshed every 2 min) ── */
let outletLoadCache: { data: Map<string, { load: number; name: string; code: string; cap: number }>; ts: number } | null = null;
const LOAD_TTL = 120_000;

async function getOutletLoadMap() {
  if (outletLoadCache && Date.now() - outletLoadCache.ts < LOAD_TTL) return outletLoadCache.data;

  const [outlets, activeCounts] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT id, name, code, capacityPerDay FROM outlet WHERE isActive = 1`) as Promise<any[]>,
    prisma.$queryRawUnsafe(`SELECT outletId, COUNT(*) AS cnt FROM \`order\` WHERE status NOT IN ('delivered','cancelled') GROUP BY outletId`) as Promise<any[]>,
  ]);

  const activeMap = new Map<string, number>();
  for (const r of activeCounts) activeMap.set(r.outletId, Number(r.cnt));

  const m = new Map<string, { load: number; name: string; code: string; cap: number }>();
  for (const r of outlets) {
    const cap = Number(r.capacityPerDay) || 100;
    const active = activeMap.get(r.id) ?? 0;
    m.set(r.id, {
      load: Math.min(100, Math.round((active / cap) * 100)),
      name: r.name, code: r.code, cap,
    });
  }
  outletLoadCache = { data: m, ts: Date.now() };
  return m;
}

/* ── Total-count cache per filter combo (refreshed every 2 min) ── */
const countCache = new Map<string, { count: number; ts: number }>();
const COUNT_TTL = 120_000;

function computeDelayRisk(status: string, expectedMs: number | null, loadPct: number, priority: string): number {
  if (status === "delivered" || status === "cancelled") return 0;
  let score = 0;
  if (loadPct >= 90) score += 40;
  else if (loadPct >= 80) score += 30;
  else if (loadPct >= 60) score += 20;
  else if (loadPct >= 40) score += 10;

  if (expectedMs !== null) {
    const hoursLeft = (expectedMs - Date.now()) / 3_600_000;
    if (hoursLeft <= 0) score += 40;
    else if (hoursLeft <= 2) score += 30;
    else if (hoursLeft <= 4) score += 20;
    else if (hoursLeft <= 8) score += 10;
  } else {
    score += 10;
  }
  if (priority === "urgent") score += 10;
  if (priority === "express") score += 5;
  return Math.max(0, Math.min(100, score));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || !isAdminLike(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const status = sp.get("status") || undefined;
    const outletId = sp.get("outletId") || undefined;
    const q = sp.get("q") || undefined;
    const page = Math.max(1, Number(sp.get("page") ?? "1"));
    const take = Math.min(50, Number(sp.get("take") ?? "25"));
    const skip = (page - 1) * take;

    // Sorting
    const sortByParam = sp.get("sortBy") || "createdAt";
    const sortDirParam = sp.get("sortDir") === "asc" ? "ASC" : "DESC";
    const validOrderFields: Record<string, string> = {
      createdAt: "o.createdAt",
      totalAmount: "o.totalAmount",
      status: "o.status",
      delayRisk: "o.createdAt", // delay risk is computed, fallback to date
    };
    const orderField = validOrderFields[sortByParam] ?? "o.createdAt";
    const orderClause = `${orderField} ${sortDirParam}`;

    /* ── Build WHERE conditions ── */
    const conditions: string[] = [];
    const params: any[] = [];

    if (status && status !== "all") {
      conditions.push("o.status = ?");
      params.push(status);
    }
    if (outletId && outletId !== "all") {
      conditions.push("o.outletId = ?");
      params.push(outletId);
    }
    if (q) {
      conditions.push("(o.orderNumber LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const hasFilters = conditions.length > 0;
    const whereClause = hasFilters ? conditions.join(" AND ") : "1=1";
    const needsJoin = !!q; // only JOIN user table when searching by name/phone
    const fromClause = needsJoin
      ? "`order` o JOIN customer c ON c.id = o.customerId JOIN `user` u ON u.id = c.userId"
      : "`order` o";

    /* ── Get total count (cached when no search query) ── */
    const cacheKey = `${status ?? ""}|${outletId ?? ""}|${q ?? ""}`;
    const cached = countCache.get(cacheKey);
    let total: number;

    if (cached && Date.now() - cached.ts < COUNT_TTL) {
      total = cached.count;
    } else {
      const countSql = hasFilters
        ? `SELECT COUNT(*) AS cnt FROM ${needsJoin ? "`order` o JOIN customer c ON c.id = o.customerId JOIN \`user\` u ON u.id = c.userId" : "`order` o"} WHERE ${whereClause}`
        : `SELECT COUNT(*) AS cnt FROM \`order\``;
      const countResult: any[] = await prisma.$queryRawUnsafe(countSql, ...params);
      total = Number(countResult[0]?.cnt ?? 0);
      countCache.set(cacheKey, { count: total, ts: Date.now() });
    }

    /* ── Fetch page rows + outlet load in parallel ── */
    // Deferred JOIN: first grab 25 IDs from the index-only scan, then JOIN for details
    const idsSql = needsJoin
      ? `SELECT o.id FROM \`order\` o JOIN customer c ON c.id = o.customerId JOIN \`user\` u ON u.id = c.userId WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`
      : `SELECT id FROM \`order\` o WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`;

    const [idRows, loadMap] = await Promise.all([
      prisma.$queryRawUnsafe(idsSql, ...params, take, skip) as Promise<any[]>,
      getOutletLoadMap(),
    ]);

    let orders: any[] = [];
    if (idRows.length > 0) {
      const ids = idRows.map((r: any) => `'${r.id}'`).join(",");
      const detailRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT o.id, o.orderNumber, o.status, o.priority, o.totalAmount, o.outletId,
          o.pickupScheduledAt, o.expectedCompletionAt, o.createdAt,
          u.name AS customerName, u.phone AS customerPhone, u.email AS customerEmail
        FROM \`order\` o
        JOIN customer c ON c.id = o.customerId
        JOIN \`user\` u ON u.id = c.userId
        WHERE o.id IN (${ids})
        ORDER BY ${orderClause}
      `);

      orders = detailRows.map((r: any) => {
        const outletInfo = loadMap.get(r.outletId);
        const loadPct = outletInfo?.load ?? 0;
        const expectedMs = r.expectedCompletionAt ? new Date(r.expectedCompletionAt).getTime() : null;
        return {
          id: r.id,
          orderNumber: r.orderNumber,
          status: r.status,
          priority: r.priority,
          totalAmount: Number(r.totalAmount),
          outletId: r.outletId,
          pickupScheduledAt: r.pickupScheduledAt,
          expectedCompletionAt: r.expectedCompletionAt,
          createdAt: r.createdAt,
          customer: { user: { name: r.customerName, phone: r.customerPhone, email: r.customerEmail } },
          outlet: { id: r.outletId, name: outletInfo?.name ?? "", code: outletInfo?.code ?? "" },
          outletLoadPercent: loadPct,
          delayRisk: computeDelayRisk(r.status, expectedMs, loadPct, r.priority),
        };
      });
    }

    return NextResponse.json(
      { orders, total, page, pageSize: take, totalPages: Math.ceil(total / take) },
      { headers: { "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json({ error: "Failed to fetch admin orders" }, { status: 500 });
  }
}

