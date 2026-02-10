import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema
const createOrderSchema = z.object({
  items: z.array(z.object({
    serviceId: z.string(),
    itemName: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number(),
  })),
  pickupAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }),
  deliveryAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }),
  pickupScheduledAt: z.string(),
  priority: z.enum(["normal", "express", "urgent"]).optional(),
  specialInstructions: z.string().optional(),
});

// GET /api/orders - Get all orders for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true }
    });

    if (!user?.customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId: user.customer.id
      },
      include: {
        items: {
          include: {
            service: true
          }
        },
        outlet: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createOrderSchema.parse(body);

    const userId = (session.user as any).id;
    
    // Get user and customer info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true }
    });

    if (!user?.customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 404 }
      );
    }

    // Calculate totals
    const subtotal = validatedData.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const taxAmount = subtotal * 0.18; // 18% GST
    const totalAmount = subtotal + taxAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Get the first active outlet (in production, use location-based logic)
    const outlet = await prisma.outlet.findFirst({
      where: { isActive: true }
    });

    if (!outlet) {
      return NextResponse.json(
        { error: "No active outlet available" },
        { status: 400 }
      );
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        organizationId: user.customer.organizationId,
        customerId: user.customer.id,
        outletId: outlet.id,
        status: "pending",
        priority: validatedData.priority || "normal",
        subtotal,
        taxAmount,
        totalAmount,
        pickupAddress: validatedData.pickupAddress,
        deliveryAddress: validatedData.deliveryAddress,
        pickupScheduledAt: new Date(validatedData.pickupScheduledAt),
        specialInstructions: validatedData.specialInstructions,
        statusHistory: [
          {
            status: "pending",
            timestamp: new Date().toISOString(),
            updatedBy: userId,
          }
        ],
        items: {
          create: validatedData.items.map(item => ({
            serviceId: item.serviceId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          }))
        }
      },
      include: {
        items: {
          include: {
            service: true
          }
        },
        outlet: true,
      }
    });

    // Update customer stats
    await prisma.customer.update({
      where: { id: user.customer.id },
      data: {
        totalOrders: { increment: 1 },
        lifetimeValue: { increment: totalAmount }
      }
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
