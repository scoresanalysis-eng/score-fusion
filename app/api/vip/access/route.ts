import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    // Get authenticated user from NextAuth session
    const session = await getCurrentSession();

    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          message: "You must be logged in to access VIP content",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { resourceId, resourceType } = body; // tipId or 'section'

    // Check if user has VIP access
    // 1. Check active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: "active",
        currentPeriodEnd: { gte: new Date() },
      },
    });

    // 2. Check valid token redemption
    const validTokens = await prisma.vIPToken.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gte: new Date() },
      },
    });

    const validToken = validTokens.find(
      (token: { used: number; quantity: number }) => token.used < token.quantity
    );

    const hasAccess = !!(activeSubscription || validToken);

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "VIP access required",
          message:
            "This content requires an active VIP subscription or valid access token",
          hasAccess: false,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      hasAccess: true,
      message: "Access granted",
      accessType: activeSubscription ? "subscription" : "token",
      resourceId,
      resourceType,
    });
  } catch (error) {
    console.error("VIP access check error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify access" },
      { status: 500 }
    );
  }
}
