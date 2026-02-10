import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tracking/[orderNumber] - Track order by order number (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            service: true
          }
        },
        outlet: true,
        customer: {
          select: {
            customerCode: true,
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Return public tracking information
    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      pickupScheduledAt: order.pickupScheduledAt,
      pickupCompletedAt: order.pickupCompletedAt,
      deliveryScheduledAt: order.deliveryScheduledAt,
      deliveryCompletedAt: order.deliveryCompletedAt,
      expectedCompletionAt: order.expectedCompletionAt,
      statusHistory: order.statusHistory,
      outlet: {
        name: order.outlet.name,
        contactDetails: order.outlet.contactDetails,
      },
      items: order.items.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        service: item.service.name,
        status: item.status,
      })),
    };

    return NextResponse.json({ tracking: trackingInfo });
  } catch (error) {
    console.error("Error fetching tracking info:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking information" },
      { status: 500 }
    );
  }
}
