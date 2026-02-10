import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { MEMBERSHIP_PLANS } from '@/types/membership';

// GET /api/memberships/my-membership - Get current user's membership
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        customer: {
          include: {
            memberships: {
              include: {
                transactions: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!user?.customer) {
      return NextResponse.json(
        { success: false, error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    // Find active membership
    const activeMembership = user.customer.memberships.find(
      m => m.status === 'active' && m.expiryDate && new Date(m.expiryDate) > new Date()
    );

    // Get plan details if membership exists
    let membershipWithPlan = null;
    if (activeMembership) {
      const plan = MEMBERSHIP_PLANS.find(p => p.id === activeMembership.planId);
      membershipWithPlan = {
        ...activeMembership,
        plan,
      };
    }

    // Get all memberships history
    const membershipHistory = user.customer.memberships.map(m => {
      const plan = MEMBERSHIP_PLANS.find(p => p.id === m.planId);
      return { ...m, plan };
    });

    return NextResponse.json({
      success: true,
      activeMembership: membershipWithPlan,
      membershipHistory,
    });

  } catch (error) {
    console.error('Get membership error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership' },
      { status: 500 }
    );
  }
}
