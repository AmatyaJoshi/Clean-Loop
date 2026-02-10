import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdminLike(role: string | undefined | null) {
  if (!role) return false;
  return ["staff", "outlet_manager", "admin", "owner", "super_admin"].includes(role);
}

/**
 * POST /api/admin/metrics/refresh
 * Force-recompute the metrics summary. Used after bulk data changes or by a cron job.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || !isAdminLike(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const start = Date.now();

    // Import and call computeAndStore from the metrics route
    // Since we can't easily share, we duplicate the light call
    const { GET } = await import("../route");
    // Instead, just invalidate the DB summary so the next GET recomputes
    await prisma.metricsSummary.deleteMany();

    return NextResponse.json({
      message: "Metrics cache invalidated. Next request will recompute.",
      ms: Date.now() - start,
    });
  } catch (error) {
    console.error("Error refreshing metrics:", error);
    return NextResponse.json({ error: "Failed to refresh" }, { status: 500 });
  }
}
