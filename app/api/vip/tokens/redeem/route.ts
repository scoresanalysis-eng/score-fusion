import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { rateLimit } from "@/lib/redis";

// Validation schema
const redeemTokenSchema = z.object({
  token: z
    .string()
    .min(6, "Token must be at least 6 characters")
    .max(7, "Token must be 6 or 7 characters")
    .regex(/^[A-Za-z0-9]+$/, "Token must be alphanumeric"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitResult = await rateLimit.check(`redeem:ip:${ip}`, 5, 300000); // 5 per 5 min

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many redemption attempts. Please try again later.",
        },
        { status: 429 }
      );
    }

    // Get authenticated user from NextAuth session
    const session = await getCurrentSession();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = redeemTokenSchema.parse(body);
    validatedData.token = validatedData.token.trim().toUpperCase();

    // Use transaction to prevent race conditions
    interface VIPTokenWithTip {
      id: string;
      token: string;
      type: string;
      quantity: number;
      used: number;
      expiresAt: Date;
      userId: string | null;
      tipId: string | null;
      createdAt: Date;
      updatedAt?: Date | null;
      usedAt: Date | null;
      tip: {
        id: string;
        title: string;
        sport: string;
        summary: string | null;
      } | null;
    }

    interface UpdatedToken {
      id: string;
      token: string;
      type: string;
      quantity: number;
      used: number;
      expiresAt: Date;
      userId: string | null;
      tipId: string | null;
      createdAt: Date;
      updatedAt?: Date | null;
      usedAt: Date | null;
    }

    const result: UpdatedToken = await prisma.$transaction(
      async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
        // Find the token (case-insensitive - tokens are stored uppercase)
        const vipToken: VIPTokenWithTip | null = await tx.vIPToken.findUnique({
          where: { token: validatedData.token },
          include: {
            tip: {
              select: {
                id: true,
                title: true,
                sport: true,
                summary: true,
              },
            },
          },
        });

        if (!vipToken) {
          throw new Error("Invalid token");
        }

        // Check if token is expired
        if (vipToken.expiresAt < new Date()) {
          throw new Error("Token has expired");
        }

        // Check if token has been used up
        if (vipToken.used >= vipToken.quantity) {
          throw new Error("Token has already been fully used");
        }

        // Check if token is tied to a different user
        if (vipToken.userId && vipToken.userId !== session.user.id) {
          throw new Error("Token is already assigned to another user");
        }

        // Check if token is for a specific tip that exists
        if (vipToken.tipId && !vipToken.tip) {
          throw new Error("Associated tip not found");
        }

        // Update token usage
        const updatedToken: UpdatedToken = await tx.vIPToken.update({
          where: { id: vipToken.id },
          data: {
            userId: session.user.id, // Assign to user if not already assigned
            // used: vipToken.used + 1,
            // usedAt: new Date(),
          },
        });

        return updatedToken;
      }
    );

    // Track redemption analytics
    try {
      await prisma.analyticsEvent.create({
        data: {
          userId: session.user.id,
          type: "vip_token_redeemed",
          payload: {
            tokenId: result.id,
            tokenType: result.type,
            tipId: result.tipId,
            timestamp: new Date().toISOString(),
          },
          ipAddress: ip,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      });
    } catch (error) {
      console.error("Failed to track token redemption analytics:", error);
    }

    // Clear user-specific caches
    try {
      const { cacheHelpers } = await import("@/lib/redis");
      await cacheHelpers.clearPattern(`vip:entitlements:${session.user.id}:*`);
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }

    return NextResponse.json({
      success: true,
      message: "Token redeemed successfully",
      data: {
        tokenId: result.id,
        type: result.type,
        tipId: result.tipId,
        remainingUses: result.quantity - result.used,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    console.error("VIP token redemption error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Failed to redeem token";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
}

// GET endpoint to check user's VIP entitlements
export async function GET() {
  try {
    // Get authenticated user from NextAuth session
    const session = await getCurrentSession();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check cache first
    const { cacheHelpers } = await import("@/lib/redis");
    const cacheKey = `vip:entitlements:${userId}`;
    const cached = await cacheHelpers.get(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    // Get active subscriptions
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: "active",
        currentPeriodEnd: { gte: new Date() },
      },
      orderBy: { currentPeriodEnd: "desc" },
    });

    // Get available VIP tokens
    const allTokens = await prisma.vIPToken.findMany({
      where: {
        userId,
        expiresAt: { gte: new Date() },
      },
      include: {
        tip: {
          select: {
            id: true,
            title: true,
            sport: true,
            summary: true,
          },
        },
      },
      orderBy: { expiresAt: "asc" },
    });

    // Filter tokens where used < quantity
    const availableTokens = allTokens.filter(
      (token: { used: number; quantity: number }) => token.used < token.quantity
    );

    const hasActiveSubscription = activeSubscriptions.length > 0;
    const hasAvailableTokens = availableTokens.length > 0;

    interface SubscriptionData {
      id: string;
      plan: string;
      status: string;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
    }

    interface TipData {
      id: string;
      title: string;
      sport: string;
      summary: string | null;
    }

    interface TokenData {
      id: string;
      type: string;
      quantity: number;
      used: number;
      remainingUses: number;
      expiresAt: Date;
      tipId: string | null;
      tip: TipData | null;
    }

    interface EntitlementsData {
      hasActiveSubscription: boolean;
      hasVipAccess: boolean;
      subscriptions: SubscriptionData[];
      availableTokens: TokenData[];
    }

    interface Entitlements {
      success: boolean;
      data: EntitlementsData;
    }

    interface Subscription {
      id: string;
      plan: string;
      status: string;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
    }

    interface VIPTokenWithRelations {
      id: string;
      type: string;
      quantity: number;
      used: number;
      expiresAt: Date;
      tipId: string | null;
      tip: {
        id: string;
        title: string;
        sport: string;
        summary: string | null;
      } | null;
    }

    const entitlements: Entitlements = {
      success: true,
      data: {
        hasActiveSubscription,
        hasVipAccess: hasActiveSubscription || hasAvailableTokens,
        subscriptions: activeSubscriptions.map(
          (sub: Subscription): SubscriptionData => ({
            id: sub.id,
            plan: sub.plan,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          })
        ),
        availableTokens: availableTokens.map(
          (token: VIPTokenWithRelations): TokenData => ({
            id: token.id,
            type: token.type,
            quantity: token.quantity,
            used: token.used,
            remainingUses: token.quantity - token.used,
            expiresAt: token.expiresAt,
            tipId: token.tipId,
            tip: token.tip,
          })
        ),
      },
    };

    // Cache for 1 minute
    await cacheHelpers.set(cacheKey, entitlements, 60);

    return NextResponse.json(entitlements);
  } catch (error) {
    console.error("VIP entitlements check error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
