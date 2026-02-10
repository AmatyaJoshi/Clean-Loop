import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ALLOWED_CREATOR_ROLES = ["owner", "admin", "super_admin"];
const TEAM_ROLES = ["admin", "outlet_manager", "staff"] as const;

const createTeamMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  role: z.enum(TEAM_ROLES),
  outletId: z.string().optional(),
  position: z.enum(["manager", "cleaner", "delivery_agent"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user || !role || !ALLOWED_CREATOR_ROLES.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTeamMemberSchema.parse(body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: parsed.email }, { phone: parsed.phone }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or phone already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 10);

    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        password: hashedPassword,
        role: parsed.role,
        emailVerified: new Date(),
      },
    });

    if (parsed.outletId && parsed.position) {
      await prisma.staff.create({
        data: {
          userId: user.id,
          outletId: parsed.outletId,
          position: parsed.position,
        },
      });
    }

    return NextResponse.json(
      {
        message: "Team member created. They can sign in to the portal.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Create team member error:", error);
    return NextResponse.json(
      { error: "Failed to create team member" },
      { status: 500 }
    );
  }
}
