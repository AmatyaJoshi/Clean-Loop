import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function isAdminLike(role: string | undefined | null) {
  if (!role) return false;
  return ["outlet_manager", "admin", "owner", "super_admin"].includes(role);
}

// GET /api/admin/services - List all services (including inactive) for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || !isAdminLike(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [services, categories] = await Promise.all([
      prisma.service.findMany({
        include: { category: true },
        orderBy: [{ category: { displayOrder: "asc" } }, { name: "asc" }],
      }),
      prisma.serviceCategory.findMany({
        orderBy: { displayOrder: "asc" },
      }),
    ]);

    return NextResponse.json({ services, categories });
  } catch (error) {
    console.error("Error fetching admin services:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

const createServiceSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().min(0),
  processingTimeHours: z.number().min(1),
  unit: z.enum(["piece", "kg", "set"]),
  isExpressAvailable: z.boolean().optional(),
  expressMultiplier: z.number().optional(),
  categoryId: z.string().min(1),
  isActive: z.boolean().optional(),
});

// POST /api/admin/services - Create a new service
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || !isAdminLike(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = createServiceSchema.parse(body);

    // Get organization
    const org = await prisma.organization.findFirst({ where: { name: "CleanLoop" } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 500 });
    }

    // Check code uniqueness
    const existing = await prisma.service.findUnique({ where: { code: data.code } });
    if (existing) {
      return NextResponse.json({ error: "Service code already exists" }, { status: 409 });
    }

    const service = await prisma.service.create({
      data: {
        organizationId: org.id,
        categoryId: data.categoryId,
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        basePrice: data.basePrice,
        processingTimeHours: data.processingTimeHours,
        unit: data.unit,
        isExpressAvailable: data.isExpressAvailable ?? false,
        expressMultiplier: data.expressMultiplier ?? 1.5,
        isActive: data.isActive ?? true,
      },
      include: { category: true },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error creating service:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
