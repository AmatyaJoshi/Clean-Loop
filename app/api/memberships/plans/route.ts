import { NextRequest, NextResponse } from 'next/server';
import { MEMBERSHIP_PLANS } from '@/types/membership';

// GET /api/memberships/plans - Get all membership plans
export async function GET(request: NextRequest) {
  try {
    // Return all active membership plans
    const activePlans = MEMBERSHIP_PLANS.filter(plan => plan.isActive);
    
    return NextResponse.json({
      success: true,
      plans: activePlans,
    });
  } catch (error) {
    console.error('Get membership plans error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership plans' },
      { status: 500 }
    );
  }
}
