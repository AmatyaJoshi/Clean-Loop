import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdminLike(role: string | undefined | null) {
  if (!role) return false;
  return ["staff", "outlet_manager", "admin", "owner", "super_admin"].includes(role);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    if (!session?.user || !isAdminLike(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize") ?? "50")));
    const skip = (page - 1) * pageSize;

    // Sorting
    const sortBy = searchParams.get("sortBy") || "lifetimeValue";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
    const validSortFields: Record<string, any> = {
      lifetimeValue: { lifetimeValue: sortDir },
      totalOrders: { totalOrders: sortDir },
      name: { user: { name: sortDir } },
      loyaltyPoints: { loyaltyPoints: sortDir },
    };
    const orderBy = validSortFields[sortBy] ?? { lifetimeValue: "desc" };

    const where: any = {};
    if (q) {
      where.OR = [
        { customerCode: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
        },
        orderBy,
        take: pageSize,
        skip,
      }),
      prisma.customer.count({ where }),
    ]);

    // Totals always from full dataset (ignoring search filter)
    const totalsRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS totalCustomers,
        CAST(SUM(totalOrders) AS UNSIGNED) AS totalOrders,
        CAST(SUM(lifetimeValue) AS DECIMAL(15,2)) AS totalLifetimeValue
      FROM customer
    `);

    const t = totalsRaw[0] ?? {};

    const mapped = customers.map((c) => ({
      id: c.id,
      customerCode: c.customerCode,
      totalOrders: c.totalOrders,
      lifetimeValue: Number(c.lifetimeValue),
      loyaltyPoints: c.loyaltyPoints,
      user: c.user,
    }));

    return NextResponse.json({
      customers: mapped,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totals: {
        totalCustomers: Number(t.totalCustomers ?? 0),
        totalOrders: Number(t.totalOrders ?? 0),
        totalLifetimeValue: Number(t.totalLifetimeValue ?? 0),
        avgValue: Number(t.totalCustomers) > 0 ? Number(t.totalLifetimeValue ?? 0) / Number(t.totalCustomers) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching admin customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
