import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/payments/upi-details - Get UPI payment details
export async function GET(request: NextRequest) {
  try {
    // Get default UPI account (for now, just return first active one)
    const upiAccount = await prisma.upiAccount.findFirst({
      where: {
        isActive: true,
        isDefault: true,
      },
    });

    if (!upiAccount) {
      // Return a default UPI for development/demo
      return NextResponse.json({
        success: true,
        upiAccount: {
          upiId: process.env.NEXT_PUBLIC_UPI_ID || 'cleanloop@paytm',
          name: process.env.NEXT_PUBLIC_UPI_NAME || 'CleanLoop Services',
          qrCodeUrl: process.env.NEXT_PUBLIC_UPI_QR_URL || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      upiAccount: {
        upiId: upiAccount.upiId,
        name: upiAccount.name,
        qrCodeUrl: upiAccount.qrCodeUrl,
      },
    });

  } catch (error) {
    console.error('Get UPI details error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UPI details' },
      { status: 500 }
    );
  }
}
