import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { cacheHelpers } from "@/lib/redis";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tipId } = await params;

    // Validate UUID format
    try {
      z.string().uuid().parse(tipId);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid tip ID format" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `tip:${tipId}`;
    const cached = await cacheHelpers.get(cacheKey);
    if (cached && typeof cached === "object" && "data" in cached) {
      // Check if this is VIP content and user has access
      const cachedData = cached as { data?: { tip?: { isVIP?: boolean } } };
      if (cachedData.data?.tip?.isVIP) {
        const auth = await getAuthenticatedUser(request);
        if (
          !auth.user ||
          false ||
          !(await checkVipAccess(auth.user.id))
        ) {
          return NextResponse.json(
            { success: false, error: "VIP subscription required" },
            { status: 403 }
          );
        }
      }
      return NextResponse.json(cached);
    }

    // Get tip from database
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      include: {
        bets: {
          take: 5,
          orderBy: { placedAt: "desc" },
          select: {
            id: true,
            amount: true,
            odds: true,
            status: true,
            placedAt: true,
            settledAt: true,
          },
        },
      },
    });

    if (!tip) {
      return NextResponse.json(
        { success: false, error: "Tip not found" },
        { status: 404 }
      );
    }

    // Check if tip is published and has a valid publishAt
    if (
      tip.status !== "published" ||
      !tip.publishAt ||
      tip.publishAt > new Date()
    ) {
      return NextResponse.json(
        { success: false, error: "Tip not available" },
        { status: 403 }
      );
    }

    // Check VIP access
    if (tip.isVIP) {
      const auth = await getAuthenticatedUser(request);
      if (!auth.user) {
        return NextResponse.json(
          { success: false, error: "Authentication required for VIP content" },
          { status: 401 }
        );
      }

      if (false) {
        return NextResponse.json(
          {
            success: false,
            error: "VIP content not available for guest users",
          },
          { status: 403 }
        );
      }

      const hasVipAccess = await checkVipAccess(auth.user.id);
      if (!hasVipAccess) {
        return NextResponse.json(
          { success: false, error: "VIP subscription required" },
          { status: 403 }
        );
      }
    }

    // Get related tips (same sport, excluding current tip)
    const relatedTips = await prisma.tip.findMany({
      where: {
        sport: tip.sport,
        isVIP: tip.isVIP,
        status: "published",
        publishAt: { lte: new Date() },
        id: { not: tipId },
      },
      take: 3,
      orderBy: [{ featured: "desc" }, { publishAt: "desc" }],
      select: {
        id: true,
        title: true,
        summary: true,
        odds: true,
        sport: true,
        publishAt: true,
        isVIP: true,
        featured: true,
        viewCount: true,
        successRate: true,
        result: true,
      },
    });

    // Increment view count
    await prisma.tip.update({
      where: { id: tipId },
      data: { viewCount: { increment: 1 } },
    });

    // Track view analytics
    const auth = await getAuthenticatedUser(request);
    if (auth.user) {
      try {
        await prisma.analyticsEvent.create({
          data: {
            userId: false ? undefined : auth.user.id,
            type: "tip_view",
            payload: {
              tipId,
              tipTitle: tip.title,
              sport: tip.sport,
              isVIP: tip.isVIP,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        console.error("Failed to track tip view analytics:", error);
      }
    }

    const result = {
      success: true,
      data: {
        tip,
        relatedTips,
      },
    };

    // Cache for different durations based on VIP status
    const cacheTTL = tip.isVIP ? 60 : 300; // 1 min for VIP, 5 min for public
    await cacheHelpers.set(cacheKey, result, cacheTTL);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tip fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to check VIP access (duplicate from tips route)
async function checkVipAccess(userId: string): Promise<boolean> {
  try {
    // Check for active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "active",
        currentPeriodEnd: { gte: new Date() },
      },
    });

    if (activeSubscription) {
      return true;
    }

    // Check for valid VIP tokens
    const validTokens = await prisma.vIPToken.findMany({
      where: {
        userId,
        expiresAt: { gte: new Date() },
      },
    });
    const validToken = validTokens.find(
      (token: { used: number; quantity: number }) => token.used < token.quantity
    );

    return !!validToken;
  } catch (error) {
    console.error("Error checking VIP access:", error);
    return false;
  }
}
