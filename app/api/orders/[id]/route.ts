import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateOrderSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "picked_up",
    "in_progress",
    "quality_check",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled"
  ]).optional(),
  internalNotes: z.string().optional(),
});

// GET /api/orders/[id] - Get single order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            service: true
          }
        },
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              }
            }
          }
        },
        outlet: true,
        payments: true,
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check authorization
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true }
    });

    const userRole = (session.user as any).role;
    const isOwner = user?.customer?.id === order.customerId;
    const isAdmin = ["admin", "super_admin", "outlet_manager"].includes(userRole);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateOrderSchema.parse(body);

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // Only staff and admins can update orders
    if (!["staff", "outlet_manager", "admin", "super_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update status history if status is changing
    let updateData: any = {
      ...validatedData,
      updatedAt: new Date(),
    };

    if (validatedData.status && validatedData.status !== existingOrder.status) {
      const statusHistory = Array.isArray(existingOrder.statusHistory)
        ? existingOrder.statusHistory
        : [];
      
      updateData.statusHistory = [
        ...statusHistory,
        {
          status: validatedData.status,
          timestamp: new Date().toISOString(),
          updatedBy: userId,
        }
      ];

      // Update completion timestamps
      if (validatedData.status === "picked_up") {
        updateData.pickupCompletedAt = new Date();
      } else if (validatedData.status === "delivered") {
        updateData.deliveryCompletedAt = new Date();
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            service: true
          }
        },
        outlet: true,
        payments: true,
      }
    });

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Cancel order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true }
    });

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user owns this order
    if (user?.customer?.id !== order.customerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only cancel if order is in certain statuses
    if (!["pending", "confirmed"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order cannot be cancelled at this stage" },
        { status: 400 }
      );
    }

    // Update status to cancelled instead of deleting
    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "cancelled",
        statusHistory: [
          ...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
          {
            status: "cancelled",
            timestamp: new Date().toISOString(),
            updatedBy: userId,
          }
        ]
      }
    });

    return NextResponse.json({ order: cancelledOrder });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
