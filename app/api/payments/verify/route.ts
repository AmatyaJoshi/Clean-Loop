import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/appwrite';
import { z } from 'zod';

const verifyPaymentSchema = z.object({
  paymentId: z.string(),
  status: z.enum(['verified', 'rejected']),
  notes: z.string().optional(),
});

// GET /api/payments/verify - Get all pending payments (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !['admin', 'super_admin', 'outlet_manager'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get all pending payments with related data
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'pending',
      },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        order: true,
        membership: {
          include: {
            plan: false, // We'll map this manually from MEMBERSHIP_PLANS
          },
        },
        paymentProofs: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      payments: pendingPayments,
      count: pendingPayments.length,
    });

  } catch (error) {
    console.error('Get pending payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending payments' },
      { status: 500 }
    );
  }
}

// POST /api/payments/verify - Verify or reject a payment (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !['admin', 'super_admin', 'outlet_manager'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = verifyPaymentSchema.parse(body);

    // Get payment with related data
    const payment = await prisma.payment.findUnique({
      where: { id: validatedData.paymentId },
      include: {
        customer: {
          include: { user: true },
        },
        order: true,
        membership: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Payment already processed' },
        { status: 400 }
      );
    }

    // Update payment and related records in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update payment status
      const updatedPayment = await tx.payment.update({
        where: { id: validatedData.paymentId },
        data: {
          status: validatedData.status === 'verified' ? 'completed' : 'failed',
          verifiedAt: new Date(),
          verifiedBy: user.id,
          metadata: {
            verificationNotes: validatedData.notes,
            verifiedBy: user.email,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      // If verified, activate membership or confirm order
      if (validatedData.status === 'verified') {
        // If this is a membership payment
        if (payment.membershipId) {
          const startDate = new Date();
          const expiryDate = new Date();
          
          const membership = await tx.customerMembership.findUnique({
            where: { id: payment.membershipId },
          });

          if (membership?.billingCycle === 'yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }

          await tx.customerMembership.update({
            where: { id: payment.membershipId },
            data: {
              status: 'active',
              startDate,
              expiryDate,
            },
          });

          await tx.membershipTransaction.updateMany({
            where: {
              membershipId: payment.membershipId,
              status: 'pending',
            },
            data: {
              status: 'completed',
            },
          });
        }

        // If this is an order payment
        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              status: 'confirmed',
              statusHistory: {
                push: {
                  status: 'confirmed',
                  timestamp: new Date().toISOString(),
                  note: 'Payment verified by admin',
                },
              },
            },
          });
        }
      }

      return updatedPayment;
    });

    // Send email notification (async)
    if (validatedData.status === 'verified') {
      if (payment.orderId) {
        EmailService.sendPaymentVerified({
          customerEmail: payment.customer.user.email!,
          customerName: payment.customer.user.name || 'Customer',
          orderNumber: payment.order?.orderNumber || 'N/A',
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
        }).catch(error => console.error('Email send failed:', error));
      }
    }

    return NextResponse.json({
      success: true,
      message: validatedData.status === 'verified' 
        ? 'Payment verified successfully' 
        : 'Payment rejected',
      payment: result,
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
