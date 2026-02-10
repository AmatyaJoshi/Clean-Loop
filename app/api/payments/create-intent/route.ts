import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentIntent } from "@/lib/stripe";
import { z } from "zod";

const createPaymentSchema = z.object({
  orderId: z.string(),
  paymentMethod: z.enum(["card", "upi", "wallet", "net_banking"]),
});

// POST /api/payments/create-intent - Create Stripe Payment Intent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, paymentMethod } = createPaymentSchema.parse(body);

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true }
    });

    if (!user?.customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify order belongs to user
    if (order.customerId !== user.customer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if already paid
    const existingPayment = order.payments.find(p => p.status === "completed");
    if (existingPayment) {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    // Create Stripe Payment Intent
    const paymentIntent = await createPaymentIntent({
      amount: Number(order.totalAmount),
      currency: "inr",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: user.customer.id,
        userId: user.id,
      }
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        organizationId: order.organizationId,
        orderId: order.id,
        customerId: user.customer.id,
        amount: order.totalAmount,
        paymentMethod,
        paymentGateway: "stripe",
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
        metadata: {
          paymentIntentId: paymentIntent.id,
        }
      }
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
