import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function isAdminLike(role: string | undefined | null) {
  if (!role) return false;
  return ["outlet_manager", "admin", "owner", "super_admin"].includes(role);
}

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  basePrice: z.number().min(0).optional(),
  processingTimeHours: z.number().min(1).optional(),
  unit: z.enum(["piece", "kg", "set"]).optional(),
  isExpressAvailable: z.boolean().optional(),
  expressMultiplier: z.number().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/admin/services/[id] - Update a service
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || !isAdminLike(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateServiceSchema.parse(body);

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const service = await prisma.service.update({
      where: { id },
      data,
      include: { category: true },
    });

    return NextResponse.json({ service });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 });
    }
    console.error("Error updating service:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

// DELETE /api/admin/services/[id] - Soft-delete (deactivate) a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || !isAdminLike(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Check if service has orders
    const orderCount = await prisma.orderItem.count({ where: { serviceId: id } });
    
    if (orderCount > 0) {
      // Soft delete - just deactivate
      await prisma.service.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: "Service deactivated (has existing orders)" });
    } else {
      // Hard delete - no orders reference it
      await prisma.service.delete({ where: { id } });
      return NextResponse.json({ message: "Service deleted" });
    }
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
