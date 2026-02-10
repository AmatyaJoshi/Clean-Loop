import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MEMBERSHIP_PLANS } from '@/types/membership';
import { FileUploadService, EmailService } from '@/lib/appwrite';
import { z } from 'zod';

const purchaseSchema = z.object({
  planId: z.string(),
  billingCycle: z.enum(['monthly', 'yearly']),
  paymentMethod: z.enum(['upi', 'cod']),
  upiTransactionId: z.string().optional(),
});

// POST /api/memberships/purchase - Purchase a membership plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get form data (may include file uploads)
    const formData = await request.formData();
    
    const planId = formData.get('planId') as string;
    const billingCycle = formData.get('billingCycle') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const upiTransactionId = formData.get('upiTransactionId') as string | null;
    const paymentProofFile = formData.get('paymentProof') as File | null;

    // Validate input
    const validatedData = purchaseSchema.parse({
      planId,
      billingCycle,
      paymentMethod,
      upiTransactionId: upiTransactionId || undefined,
    });

    // Find the membership plan
    const plan = MEMBERSHIP_PLANS.find(p => p.id === validatedData.planId);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Invalid membership plan' },
        { status: 400 }
      );
    }

    // Calculate amount based on billing cycle
    const amount = validatedData.billingCycle === 'yearly' 
      ? plan.priceYearly 
      : plan.priceMonthly;

    // Get user and customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { customer: true },
    });

    if (!user?.customer) {
      return NextResponse.json(
        { success: false, error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    // Check if customer already has this plan
    const existingMembership = await prisma.customerMembership.findUnique({
      where: {
        customerId_planId: {
          customerId: user.customer.id,
          planId: validatedData.planId,
        },
      },
    });

    if (existingMembership && existingMembership.status === 'active') {
      return NextResponse.json(
        { success: false, error: 'You already have an active membership for this plan' },
        { status: 400 }
      );
    }

    // Create membership and payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update membership
      const membership = existingMembership
        ? await tx.customerMembership.update({
            where: { id: existingMembership.id },
            data: {
              status: 'pending',
              billingCycle: validatedData.billingCycle,
              updatedAt: new Date(),
            },
          })
        : await tx.customerMembership.create({
            data: {
              customerId: user.customer!.id,
              planId: validatedData.planId,
              status: 'pending',
              billingCycle: validatedData.billingCycle,
            },
          });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          organizationId: user.customer!.organizationId,
          customerId: user.customer!.id,
          membershipId: membership.id,
          amount,
          paymentMethod: validatedData.paymentMethod,
          paymentGateway: 'manual',
          upiTransactionId: validatedData.upiTransactionId,
          status: 'pending',
        },
      });

      // Upload payment proof if provided
      if (paymentProofFile && validatedData.paymentMethod === 'upi') {
        const uploadResult = await FileUploadService.uploadPaymentProof(
          paymentProofFile,
          payment.id
        );

        if (uploadResult.success && uploadResult.fileId && uploadResult.fileUrl) {
          await tx.paymentProof.create({
            data: {
              paymentId: payment.id,
              fileUrl: uploadResult.fileUrl,
              fileId: uploadResult.fileId,
              fileName: paymentProofFile.name,
              fileType: paymentProofFile.type,
              fileSize: paymentProofFile.size,
            },
          });
        }
      }

      // Create membership transaction
      await tx.membershipTransaction.create({
        data: {
          membershipId: membership.id,
          type: 'purchase',
          amount,
          status: 'pending',
          description: `Purchase ${plan.name} membership (${validatedData.billingCycle})`,
        },
      });

      return { membership, payment };
    });

    // Send confirmation email (async, don't wait)
    EmailService.sendMembershipConfirmation({
      customerEmail: user.email!,
      customerName: user.name || 'Customer',
      planName: plan.name,
      billingCycle: validatedData.billingCycle,
      amount,
      startDate: 'Pending verification',
      expiryDate: 'To be confirmed',
      features: plan.features,
    }).catch(error => console.error('Email send failed:', error));

    return NextResponse.json({
      success: true,
      message: 'Membership purchase initiated. Payment verification pending.',
      membership: result.membership,
      payment: result.payment,
    });

  } catch (error) {
    console.error('Membership purchase error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process membership purchase' },
      { status: 500 }
    );
  }
}
