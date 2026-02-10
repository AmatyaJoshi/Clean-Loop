import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or phone already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get or create default organization
    let organization = await prisma.organization.findFirst({
      where: { name: "CleanLoop" }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: "CleanLoop",
          subscriptionTier: "pro",
          status: "active",
        }
      });
    }

    // Create user and customer profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: "customer",
          emailVerified: new Date(), // Auto-verify for demo
        }
      });

      // Generate customer code
      const customerCode = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          organizationId: organization!.id,
          customerCode,
          addresses: [],
          loyaltyPoints: 100, // Welcome bonus
        }
      });

      return { user, customer };
    });

    return NextResponse.json({
      message: "Registration successful",
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}
