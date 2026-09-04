import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";

// Validation schema for placing bets
const placeBetSchema = z.object({
  tipId: z.string().uuid("Invalid tip ID"),
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(10000, "Maximum amount is 10,000"),
  stakeType: z.enum(["single", "parlay", "system"], {
    errorMap: () => ({ message: "Invalid stake type" }),
  }),
  odds: z.number().positive("Odds must be positive").optional(),
});

// Query schema for getting bets
const betsQuerySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("20"),
  status: z.enum(["pending", "won", "lost", "void"]).optional(),
  sport: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await rateLimit.check(`bet:ip:${ip}`, 10, 300000); // 10 per 5 min

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many bet attempts. Please try again later.",
        },
        { status: 429 }
      );
    }

    // Get authenticated user (no guest users for betting)
    const auth = await getAuthenticatedUser(request);

    if (!auth.user || false) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = placeBetSchema.parse(body);

    // Check if user has self-exclusion or limits
    const userProfile = await prisma.profile.findUnique({
      where: { userId: auth.user.id },
    });

    if (
      userProfile?.selfExclusionUntil &&
      userProfile.selfExclusionUntil > new Date()
    ) {
      return NextResponse.json(
        { success: false, error: "Account is self-excluded" },
        { status: 403 }
      );
    }

    // Check deposit limits
    if (userProfile?.depositLimits) {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const startOfWeek = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - today.getDay()
      );
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Calculate current betting amounts
      const [dailyTotal, weeklyTotal, monthlyTotal] = await Promise.all([
        prisma.bet.aggregate({
          where: {
            userId: auth.user.id,
            placedAt: { gte: startOfDay },
          },
          _sum: { amount: true },
        }),
        prisma.bet.aggregate({
          where: {
            userId: auth.user.id,
            placedAt: { gte: startOfWeek },
          },
          _sum: { amount: true },
        }),
        prisma.bet.aggregate({
          where: {
            userId: auth.user.id,
            placedAt: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
      ]);

      const limits = userProfile.depositLimits as {
        daily?: number;
        weekly?: number;
        monthly?: number;
      };
      const dailyAmount = Number(dailyTotal._sum.amount || 0);
      const weeklyAmount = Number(weeklyTotal._sum.amount || 0);
      const monthlyAmount = Number(monthlyTotal._sum.amount || 0);

      if (limits.daily && dailyAmount + validatedData.amount > limits.daily) {
        return NextResponse.json(
          { success: false, error: "Daily betting limit exceeded" },
          { status: 429 }
        );
      }

      if (
        limits.weekly &&
        weeklyAmount + validatedData.amount > limits.weekly
      ) {
        return NextResponse.json(
          { success: false, error: "Weekly betting limit exceeded" },
          { status: 429 }
        );
      }

      if (
        limits.monthly &&
        monthlyAmount + validatedData.amount > limits.monthly
      ) {
        return NextResponse.json(
          { success: false, error: "Monthly betting limit exceeded" },
          { status: 429 }
        );
      }
    }

    // Get tip information
    const tip = await prisma.tip.findUnique({
      where: { id: validatedData.tipId },
    });

    if (!tip) {
      return NextResponse.json(
        { success: false, error: "Tip not found" },
        { status: 404 }
      );
    }

    if (tip.status !== "published") {
      return NextResponse.json(
        { success: false, error: "Tip is not available for betting" },
        { status: 400 }
      );
    }

    // Check if tip has already started (if it has a match date)
    if (tip.matchDate && tip.matchDate < new Date()) {
      return NextResponse.json(
        { success: false, error: "Betting is closed for this tip" },
        { status: 400 }
      );
    }

    // Get current odds or use provided odds
    const currentOdds = validatedData.odds || tip.odds;

    if (!currentOdds) {
      return NextResponse.json(
        { success: false, error: "Odds not available for this tip" },
        { status: 400 }
      );
    }

    // Create bet record
    const bet = await prisma.bet.create({
      data: {
        userId: auth.user.id,
        tipId: validatedData.tipId,
        amount: validatedData.amount,
        stakeType: validatedData.stakeType,
        odds: currentOdds,
        status: "pending",
        placedAt: new Date(),
      },
    });

    // Track bet placement analytics
    await prisma.analyticsEvent.create({
      data: {
        userId: auth.user.id,
        type: "bet_placed",
        payload: {
          betId: bet.id,
          tipId: validatedData.tipId,
          amount: validatedData.amount,
          odds: currentOdds,
          stakeType: validatedData.stakeType,
          sport: tip.sport,
          timestamp: new Date().toISOString(),
        },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        bet: {
          id: bet.id,
          tipId: bet.tipId,
          amount: bet.amount,
          odds: bet.odds,
          stakeType: bet.stakeType,
          status: bet.status,
          placedAt: bet.placedAt,
          potentialPayout: Number(bet.amount) * Number(bet.odds),
        },
      },
    });
  } catch (error) {
    console.error("Bet placement error:", error);

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

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const validatedQuery = betsQuerySchema.parse(query);

    // Build where clause
    const where: Prisma.BetWhereInput = {
      userId: auth.user.id,
    };

    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }

    if (validatedQuery.sport) {
      where.tip = {
        sport: { mode: "insensitive", equals: validatedQuery.sport },
      };
    }

    // Get pagination info
    const skip = (validatedQuery.page - 1) * validatedQuery.limit;
    const take = Math.min(validatedQuery.limit, 50);

    // Query bets
    const [bets, total] = await Promise.all([
      prisma.bet.findMany({
        where,
        skip,
        take,
        orderBy: { placedAt: "desc" },
        include: {
          tip: {
            select: {
              id: true,
              title: true,
              sport: true,
              league: true,
              matchDate: true,
              result: true,
            },
          },
        },
      }),
      prisma.bet.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.bet.groupBy({
      by: ["status"],
      where: {
        userId: auth.user.id,
      },
      _count: { id: true },
      _sum: { amount: true, payout: true },
    });

    const totalBets = bets.length;
    const totalStaked =
      Number(stats.find((s) => s.status === "pending")?._sum.amount || 0) +
      Number(stats.find((s) => s.status === "won")?._sum.amount || 0) +
      Number(stats.find((s) => s.status === "lost")?._sum.amount || 0);

    const totalWon = Number(
      stats.find((s) => s.status === "won")?._sum.payout || 0
    );
    const totalLost = Number(
      stats.find((s) => s.status === "lost")?._sum.amount || 0
    );
    const winCount = stats.find((s) => s.status === "won")?._count.id || 0;
    const lossCount = stats.find((s) => s.status === "lost")?._count.id || 0;

    const winRate = totalBets > 0 ? (winCount / totalBets) * 100 : 0;
    const profit = totalWon - totalStaked;
    const roi = totalStaked > 0 ? (profit / totalStaked) * 100 : 0;

    const hasMore = skip + bets.length < total;

    return NextResponse.json({
      success: true,
      data: {
        bets: bets.map((bet) => ({
          id: bet.id,
          tip: bet.tip,
          amount: bet.amount,
          odds: bet.odds,
          stakeType: bet.stakeType,
          status: bet.status,
          payout: bet.payout,
          placedAt: bet.placedAt,
          settledAt: bet.settledAt,
          potentialPayout: bet.odds
            ? Number(bet.amount) * Number(bet.odds)
            : null,
        })),
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          hasMore,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
        statistics: {
          totalBets,
          winRate: Math.round(winRate * 100) / 100,
          totalStaked: Math.round(totalStaked * 100) / 100,
          totalWon: Math.round(totalWon * 100) / 100,
          totalLost: Math.round(totalLost * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          roi: Math.round(roi * 100) / 100,
          winCount,
          lossCount,
          pendingCount:
            stats.find((s) => s.status === "pending")?._count.id || 0,
        },
      },
    });
  } catch (error) {
    console.error("Bets fetch error:", error);

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
