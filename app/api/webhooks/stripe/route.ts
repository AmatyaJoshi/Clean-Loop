import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// NOTE: This webhook is for Stripe integration which is optional
// Currently using manual payment verification (UPI/COD)
// To enable Stripe, install: npm install stripe
// And uncomment the code below

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Return not implemented for now since we're using manual payment verification
    return NextResponse.json(
      { error: "Stripe webhooks not configured. Using manual payment verification." },
      { status: 501 }
    );

    /* Uncomment when Stripe is configured:
    
    import Stripe from "stripe";
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-11-20.acacia',
    });
    
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
    */
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/* 
// Uncomment when Stripe is configured:

async function handlePaymentSuccess(paymentIntent: any) {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
    include: { order: true }
  });

  if (!payment) {
    console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
    return;
  }

  if (!payment.orderId) {
    console.error(`Payment ${payment.id} has no associated order`);
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "completed",
      paidAt: new Date(),
      transactionId: paymentIntent.id,
      gatewayResponse: paymentIntent as any,
    }
  });

  // Update order status to confirmed
  if (payment.order) {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: "confirmed",
        statusHistory: [
          ...(Array.isArray(payment.order.statusHistory) ? payment.order.statusHistory : []),
          {
            status: "confirmed",
            timestamp: new Date().toISOString(),
            note: "Payment received",
          }
        ]
      }
    });

    console.log(`Payment succeeded for order: ${payment.order.orderNumber}`);
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id }
  });

  if (!payment) {
    console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "failed",
      gatewayResponse: paymentIntent as any,
    }
  });

  console.log(`Payment failed for PaymentIntent: ${paymentIntent.id}`);
}

async function handlePaymentCanceled(paymentIntent: any) {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id }
  });

  if (!payment) {
    console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "failed",
      gatewayResponse: paymentIntent as any,
    }
  });

  console.log(`Payment canceled for PaymentIntent: ${paymentIntent.id}`);
}

*/