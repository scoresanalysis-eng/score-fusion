import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession, getUserInfo } from "@/lib/session";

export async function GET() {
  console.log("=== VIP STATUS CHECK START ===");
  try {
    // Get authenticated user from NextAuth session
    const session = await getCurrentSession();
    const userInfo = getUserInfo(session);

    console.log("Auth result:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userInfo,
    });

    if (!session || !session.user) {
      console.log("❌ No authenticated user - returning hasAccess: false");
      return NextResponse.json({
        success: false,
        data: {
          hasAccess: false,
        },
        error: "Authentication required",
      });
    }

    console.log("Checking VIP access for user:", session.user.id);

    // Check for active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: "active",
        currentPeriodEnd: { gte: new Date() },
      },
    });

    console.log("Active subscription query result:", {
      found: !!activeSubscription,
      subscriptionId: activeSubscription?.id,
      plan: activeSubscription?.plan,
      status: activeSubscription?.status,
      currentPeriodEnd: activeSubscription?.currentPeriodEnd,
    });

    // Check for valid VIP tokens
    // Note: Prisma doesn't support direct field-to-field comparison, so we fetch and filter
    const validTokens = await prisma.vIPToken.findMany({
      where: {
        userId: session.user.id,
        expiresAt: { gte: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    });

    console.log("VIP tokens query result:", {
      totalTokens: validTokens.length,
      tokens: validTokens.map(
        (t: {
          id: string;
          type: string;
          used: number;
          quantity: number;
          expiresAt: Date;
        }) => ({
          id: t.id,
          type: t.type,
          used: t.used,
          quantity: t.quantity,
          available: t.quantity - t.used,
          expiresAt: t.expiresAt,
          isValid: t.used < t.quantity,
        })
      ),
    });

    const validToken = validTokens.find(
      (token: { used: number; quantity: number }) => token.used < token.quantity
    );

    console.log("Valid token after filter:", {
      found: !!validToken,
      tokenId: validToken?.id,
      type: validToken?.type,
      remaining: validToken ? validToken.quantity - validToken.used : 0,
    });

    const hasAccess = !!(activeSubscription || validToken);

    console.log("=== FINAL VIP ACCESS DECISION ===", {
      hasAccess,
      reason: activeSubscription
        ? "Active subscription found"
        : validToken
        ? "Valid token found"
        : "No subscription or valid token",
    });

    const response = {
      success: true,
      data: {
        hasAccess,
        subscription: activeSubscription
          ? {
              plan: activeSubscription.plan,
              status: activeSubscription.status,
              currentPeriodEnd:
                activeSubscription.currentPeriodEnd.toISOString(),
              cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
            }
          : null,
        tokenAccess: validToken
          ? {
              expiresAt: validToken.expiresAt.toISOString(),
              remaining: validToken.quantity - validToken.used,
              type: validToken.type,
            }
          : null,
      },
    };

    console.log("Response being sent:", JSON.stringify(response, null, 2));
    console.log("=== VIP STATUS CHECK END ===\n");

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ VIP status check error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check VIP status" },
      { status: 500 }
    );
  }
}
