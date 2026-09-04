import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { Prisma, User } from "@prisma/client";

// Query schema for getting earnings
const earningsQuerySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("20"),
  type: z.string().optional(),
  status: z.enum(["pending", "confirmed", "expired"]).optional(),
});

// GET endpoint: Get user's earnings and wallet
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const auth = await getAuthenticatedUser(request);

    if (!auth.user || false) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = earningsQuerySchema.parse(query);

    // Get or create user wallet
    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        balance: 0,
        tokens: 0,
      },
    });

    // Build where clause for earnings
    const where: Prisma.EarningWhereInput = { userId };

    if (validatedQuery.type) {
      where.type = validatedQuery.type;
      where.type = validatedQuery.type;
    }

    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }

    // Get earnings with pagination
    const skip = (validatedQuery.page - 1) * validatedQuery.limit;
    const take = Math.min(validatedQuery.limit, 50);

    const [earnings, total] = await Promise.all([
      prisma.earning.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.earning.count({ where }),
    ]);

    // Get earning statistics
    const [confirmedEarnings, pendingEarnings, totalTokens] = await Promise.all(
      [
        prisma.earning.aggregate({
          where: { userId, status: "confirmed" },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.earning.aggregate({
          where: { userId, status: "pending" },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.earning.aggregate({
          where: { userId },
          _sum: { tokens: true },
        }),
      ]
    );

    // Get earning rules
    const earningRules = await prisma.earningRule.findMany({
      where: {
        isActive: true,
        OR: [{ validFrom: { lte: new Date() } }, { validFrom: null }],
        AND: [{ validUntil: { gte: new Date() } }, { validUntil: null }],
      },
    });

    // Get user achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            tokenReward: true,
            cashReward: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalConfirmed = Number(confirmedEarnings._sum.amount || 0);
    const totalPending = Number(pendingEarnings._sum.amount || 0);
    const confirmedCount = confirmedEarnings._count.id || 0;
    const pendingCount = pendingEarnings._count.id || 0;
    const tokensEarned = totalTokens._sum.tokens || 0;

    const hasMore = skip + earnings.length < total;

    return NextResponse.json({
      success: true,
      data: {
        wallet: {
          balance: Number(wallet.balance),
          currency: wallet.currency,
          tokens: wallet.tokens,
          bonusTokens: wallet.bonusTokens,
          totalEarned: Number(wallet.totalEarned),
          totalWithdrawn: Number(wallet.totalWithdrawn),
        },
        statistics: {
          totalConfirmed,
          totalPending,
          confirmedCount,
          pendingCount,
          tokensEarned,
        },
        earnings: earnings.map((earning) => ({
          id: earning.id,
          type: earning.type,
          amount: Number(earning.amount),
          currency: earning.currency,
          tokens: earning.tokens,
          status: earning.status,
          description: earning.description,
          source: earning.source,
          expiresAt: earning.expiresAt,
          createdAt: earning.createdAt,
          confirmedAt: earning.confirmedAt,
        })),
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          hasMore,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
        earningRules: earningRules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          type: rule.type,
          description: rule.description,
          tokenReward: rule.tokenReward,
          cashReward: Number(rule.cashReward),
          conditions: rule.conditions,
          maxOccurrences: rule.maxOccurrences,
          cooldownHours: rule.cooldownHours,
        })),
        achievements: userAchievements.map((userAchievement) => ({
          id: userAchievement.id,
          achievement: userAchievement.achievement,
          earnedAt: userAchievement.earnedAt,
          rewardClaimed: userAchievement.rewardClaimed,
        })),
      },
    });
  } catch (error) {
    console.error("Earnings GET error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST endpoint: Claim earnings or trigger earning actions
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = (request.headers.get("x-forwarded-for") ?? "127.0.0.1").split(
      ","
    )[0];
    const rateLimitResult = await rateLimit.check(
      `earnings:ip:${ip}`,
      20,
      300000
    ); // 20 per 5 min

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Get authenticated user
    const auth = await getAuthenticatedUser(request);

    if (!auth.user || false) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const body = await request.json();

    // Handle different earning actions
    const { action, data } = body;

    switch (action) {
      case "claim_daily_login":
        return await claimDailyLogin(
          userId,
          auth.user,
          ip,
          request.headers.get("user-agent") ?? undefined
        );

      case "claim_achievement":
        return await claimAchievement(
          userId,
          data?.achievementId,
          ip,
          request.headers.get("user-agent") ?? undefined
        );

      case "view_tip":
        return await awardTipView(
          userId,
          data?.tipId,
          ip,
          request.headers.get("user-agent") ?? undefined
        );

      case "place_bet":
        return await awardBetPlacement(
          userId,
          data?.betId,
          data?.amount,
          ip,
          request.headers.get("user-agent") ?? undefined
        );

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Earnings POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions for different earning actions
async function claimDailyLogin(
  userId: string,
  user: User,
  ip: string,
  userAgent?: string
): Promise<NextResponse> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already claimed today
  const existingClaim = await prisma.earning.findFirst({
    where: {
      userId,
      type: "daily_login",
      status: "confirmed",
      createdAt: { gte: today },
    },
  });

  if (existingClaim) {
    return NextResponse.json(
      { success: false, error: "Daily login bonus already claimed" },
      { status: 400 }
    );
  }

  // Award daily login bonus
  const result = await prisma.$transaction(async (tx) => {
    const earning = await tx.earning.create({
      data: {
        userId,
        type: "daily_login",
        amount: 0.5, // $0.50 daily bonus
        currency: "USD",
        tokens: 5, // 5 tokens
        status: "confirmed",
        description: "Daily login bonus",
        confirmedAt: new Date(),
      },
    });

    await tx.wallet.update({
      where: { userId },
      data: {
        balance: { increment: 0.5 },
        tokens: { increment: 5 },
        totalEarned: { increment: 0.5 },
      },
    });

    return earning;
  });

  // Track analytics
  await prisma.analyticsEvent.create({
    data: {
      userId,
      type: "daily_login_claimed",
      payload: {
        amount: 0.5,
        tokens: 5,
        earningId: result.id,
        timestamp: new Date().toISOString(),
      },
      ipAddress: ip,
      userAgent,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Daily login bonus claimed successfully",
    data: {
      amount: 0.5,
      tokens: 5,
      nextClaimTime: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  });
}

async function claimAchievement(
  userId: string,
  achievementId: string,
  ip: string,
  userAgent?: string
): Promise<NextResponse> {
  if (!achievementId) {
    return NextResponse.json(
      { success: false, error: "Achievement ID required" },
      { status: 400 }
    );
  }

  // Check if achievement exists and is active
  const achievement = await prisma.achievement.findUnique({
    where: { id: achievementId },
  });

  if (!achievement || !achievement.isActive) {
    return NextResponse.json(
      { success: false, error: "Achievement not found" },
      { status: 404 }
    );
  }

  // Check if already claimed
  const existingClaim = await prisma.userAchievement.findUnique({
    where: {
      userId_achievementId: {
        userId,
        achievementId,
      },
    },
  });

  if (existingClaim) {
    return NextResponse.json(
      { success: false, error: "Achievement already claimed" },
      { status: 400 }
    );
  }

  // TODO: Validate achievement conditions
  // For now, we'll assume conditions are met

  // Award achievement
  const result = await prisma.$transaction(async (tx) => {
    const userAchievement = await tx.userAchievement.create({
      data: {
        userId,
        achievementId,
        earnedAt: new Date(),
        rewardClaimed: true,
      },
    });

    if (achievement.tokenReward > 0 || Number(achievement.cashReward) > 0) {
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: Number(achievement.cashReward) },
          tokens: { increment: achievement.tokenReward },
          totalEarned: { increment: Number(achievement.cashReward) },
        },
      });

      await tx.earning.create({
        data: {
          userId,
          type: "achievement",
          source: achievementId,
          amount: achievement.cashReward,
          currency: achievement.currency,
          tokens: achievement.tokenReward,
          status: "confirmed",
          description: `Achievement: ${achievement.name}`,
          confirmedAt: new Date(),
        },
      });
    }

    return userAchievement;
  });

  // Track analytics
  await prisma.analyticsEvent.create({
    data: {
      userId,
      type: "achievement_claimed",
      payload: {
        achievementId,
        achievementName: achievement.name,
        cashReward: Number(achievement.cashReward),
        tokenReward: achievement.tokenReward,
        timestamp: new Date().toISOString(),
      },
      ipAddress: ip,
      userAgent,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Achievement claimed successfully",
    data: {
      achievement: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
      },
      rewards: {
        cash: Number(achievement.cashReward),
        tokens: achievement.tokenReward,
      },
    },
  });
}

async function awardTipView(
  userId: string,
  tipId: string,
  ip: string,
  userAgent?: string
): Promise<NextResponse> {
  if (!tipId) {
    return NextResponse.json(
      { success: false, error: "Tip ID required" },
      { status: 400 }
    );
  }

  // Check if already rewarded for this tip
  const existingReward = await prisma.earning.findFirst({
    where: {
      userId,
      type: "tip_view",
      source: tipId,
      status: "confirmed",
    },
  });

  if (existingReward) {
    return NextResponse.json({
      success: true,
      data: { alreadyRewarded: true },
    });
  }

  // Award small token for tip view
  await prisma.$transaction(async (tx) => {
    await tx.earning.create({
      data: {
        userId,
        type: "tip_view",
        source: tipId,
        amount: 0,
        currency: "USD",
        tokens: 1, // 1 token per tip view
        status: "confirmed",
        description: "Tip view reward",
        confirmedAt: new Date(),
      },
    });

    await tx.wallet.update({
      where: { userId },
      data: {
        tokens: { increment: 1 },
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: "Tip view reward granted",
    data: { tokens: 1 },
  });
}

async function awardBetPlacement(
  userId: string,
  betId: string,
  amount: number,
  ip: string,
  userAgent?: string
): Promise<NextResponse> {
  if (!betId) {
    return NextResponse.json(
      { success: false, error: "Bet ID required" },
      { status: 400 }
    );
  }

  // Check if already rewarded for this bet
  const existingReward = await prisma.earning.findFirst({
    where: {
      userId,
      type: "bet_placed",
      source: betId,
    },
  });

  if (existingReward) {
    return NextResponse.json({
      success: true,
      data: { alreadyRewarded: true },
    });
  }

  // Calculate reward based on bet amount (1% in tokens)
  const tokenReward = Math.floor((amount || 0) * 0.01);

  if (tokenReward === 0) {
    return NextResponse.json({ success: true, data: { noReward: true } });
  }

  await prisma.$transaction(async (tx) => {
    await tx.earning.create({
      data: {
        userId,
        type: "bet_placed",
        source: betId,
        amount: 0,
        currency: "USD",
        tokens: tokenReward,
        status: "confirmed",
        description: "Bet placement reward",
        confirmedAt: new Date(),
      },
    });

    await tx.wallet.update({
      where: { userId },
      data: {
        tokens: { increment: tokenReward },
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: "Bet placement reward granted",
    data: { tokens: tokenReward },
  });
}
