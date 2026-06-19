import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

// Tip creation/update schema
const tipSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters"),
  content: z.string().optional(),
  summary: z.string().optional(),
  odds: z.number().positive("Odds must be positive").optional(),
  oddsSource: z.enum(["manual", "api_auto"]).default("manual"),
  sport: z.string().trim().min(1, "Sport is required"),
  league: z.string().trim().optional(),
  matchId: z.string().uuid().optional(),
  matchDate: z.string().optional(),
  // Team relations for predictions
  homeTeamId: z.string().uuid().optional(),
  awayTeamId: z.string().uuid().optional(),
  // predictionType: z
  //   .enum([
  //     "winner",
  //     "over_under",
  //     "both_teams_score",
  //     "correct_score",
  //     "handicap",
  //     "other",
  //   ])
  //   .optional(), // Match Prisma PredictionType enum
  predictedOutcome: z.string().optional(), // home_win, draw, away_win, over, under, yes, no
  // Ticket snapshots (up to 10)
  ticketSnapshots: z
    .array(z.string().url())
    .max(10, "Maximum 10 ticket snapshots allowed")
    .default([]),
  publishAt: z.string().optional(),
  isVIP: z.boolean().default(false),
  featured: z.boolean().default(false),
  authorId: z.string().uuid().optional(),
  authorName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
  status: z
    .enum(["draft", "scheduled", "published", "archived"])
    .default("draft"),
  result: z.enum(["won", "lost", "void", "pending"]).optional(),
  category: z.enum(["tip", "update"]).default("tip"),
  confidenceLevel: z.number().min(1).max(100).optional(),
  matchResult: z.string().optional(),
});

// Query schema
const tipsQuerySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("100"),
  search: z.string().optional(),
  sport: z.string().optional(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
  category: z.enum(["tip", "update"]).optional(),
  result: z.enum(["won", "lost", "void", "pending"]).optional(),
  isVIP: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  featured: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  authorId: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "publishAt", "viewCount", "successRate"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const { error, session } = await requireAdmin();
    if (error || !session) return error as NextResponse;

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = tipsQuerySchema.parse(query);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (validatedQuery.search) {
      where.OR = [
        { title: { mode: "insensitive", contains: validatedQuery.search } },
        { content: { mode: "insensitive", contains: validatedQuery.search } },
        { summary: { mode: "insensitive", contains: validatedQuery.search } },
      ];
    }

    if (validatedQuery.sport) {
      where.sport = { mode: "insensitive", equals: validatedQuery.sport };
    }

    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }

    if (validatedQuery.category) {
      where.category = validatedQuery.category;
    }

    if (validatedQuery.result) {
      where.result = validatedQuery.result;
    }

    if (validatedQuery.isVIP !== undefined) {
      where.isVIP = validatedQuery.isVIP;
    }

    if (validatedQuery.featured !== undefined) {
      where.featured = validatedQuery.featured;
    }

    if (validatedQuery.authorId) {
      where.authorId = validatedQuery.authorId;
    }

    // Get pagination info
    const skip = (validatedQuery.page - 1) * validatedQuery.limit;
    const take = Math.min(validatedQuery.limit, 100);

    // Build order by
    const orderBy: Record<string, "asc" | "desc"> = {};
    orderBy[validatedQuery.sortBy] = validatedQuery.sortOrder;

    // Query tips with detailed information
    const [tips, total] = await Promise.all([
      prisma.tip.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          match: true,
          homeTeam: {
            include: {
              sport: {
                select: {
                  name: true,
                  displayName: true,
                },
              },
            },
          },
          awayTeam: {
            include: {
              sport: {
                select: {
                  name: true,
                  displayName: true,
                },
              },
            },
          },
          bets: {
            select: {
              id: true,
              amount: true,
              odds: true,
              status: true,
              placedAt: true,
            },
          },
          _count: {
            select: {
              bets: true,
            },
          },
        },
      }),
      prisma.tip.count({ where }),
    ]);

    const hasMore = skip + tips.length < total;

    // Calculate additional metrics for each tip
    interface BetSnapshot {
      id: string;
      amount: number;
      odds: number;
      status: string;
      placedAt: Date;
    }

    interface TeamInfo {
      id: string;
      name: string;
      shortName: string | null;
      logoUrl: string | null;
      sport: {
        name: string;
        displayName: string;
      };
    }

    interface MatchInfo {
      homeTeam: TeamInfo;
      awayTeam: TeamInfo;
      score: string;
      status: string;
      scheduledAt: Date;
    }

    interface Match {
      id: string;
      homeTeam: string;
      awayTeam: string;
      homeTeamScore: number | null;
      awayTeamScore: number | null;
      status: string;
      scheduledAt: Date;
    }

    interface TipWithMetrics {
      id: string;
      title: string;
      content: string | null;
      summary: string | null;
      odds: number | null;
      oddsSource: string;
      sport: string;
      league: string | null;
      matchId: string | null;
      matchDate: string | null;
      homeTeamId: string | null;
      awayTeamId: string | null;
      predictionType: string | null;
      predictedOutcome: string | null;
      ticketSnapshots: string[];
      publishAt: string | null;
      isVIP: boolean;
      featured: boolean;
      authorId: string | null;
      authorName: string | null;
      tags: string[];
      attachments: string[];
      status: string;
      result: string | null;
      totalBets: number;
      betWinRate: number;
      totalStaked: number;
      matchInfo: MatchInfo | null;
      _count: {
        bets: number;
      };
      bets: BetSnapshot[];
      match: Match | null;
      homeTeam: TeamInfo | null;
      awayTeam: TeamInfo | null;
      category: string;
      confidenceLevel: number | null;
      matchResult: string | null;
      createdAt: string;
    }
    interface BetMetrics {
      totalBets: number;
      betWinRate: number;
      totalStaked: number;
    }

    // Helper function
    function calculateWinRate(bets: BetSnapshot[]): number {
      if (!bets || bets.length === 0) return 0;

      const wonBets = bets.filter((bet) => bet.status === "won").length;
      return (wonBets / bets.length) * 100;
    }

    const tipsWithMetrics: TipWithMetrics[] = tips.map(
      (tip): TipWithMetrics => {
        const normalizedBets: BetSnapshot[] = tip.bets.map((bet) => ({
          id: bet.id,
          amount: Number(bet.amount),
          odds: bet.odds ? Number(bet.odds) : 0,
          status: bet.status,
          placedAt: bet.placedAt,
        }));

        const metrics: BetMetrics = {
          totalBets: tip._count.bets,
          betWinRate: calculateWinRate(normalizedBets),
          totalStaked: normalizedBets.reduce(
            (sum: number, bet: BetSnapshot): number => sum + bet.amount,
            0,
          ),
        };

        return {
          ...tip,
          odds: tip.odds ? Number(tip.odds) : null,
          bets: normalizedBets,
          ...metrics,
          matchInfo:
            tip.match && tip.homeTeam && tip.awayTeam
              ? {
                  homeTeam: tip.homeTeam,
                  awayTeam: tip.awayTeam,
                  score: `${tip.match.homeTeamScore} - ${tip.match.awayTeamScore}`,
                  status: tip.match.status,
                  scheduledAt: tip.match.scheduledAt,
                }
              : null,
          category: tip.category,
          confidenceLevel: tip.confidenceLevel,
          matchResult: tip.matchResult,
          createdAt: tip.createdAt.toISOString(),
          publishAt: tip.publishAt?.toISOString() || null,
          matchDate: tip.matchDate?.toISOString() || null,
        };
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        tips: tipsWithMetrics,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          hasMore,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin tips GET error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const { error, session } = await requireAdmin();
    if (error || !session) return error as NextResponse;

    const body = await request.json();

    // Validate input
    const validatedData = tipSchema.parse(body);

    // Destructure relational fields from validatedData
    const { matchId, homeTeamId, awayTeamId, ...createData } = validatedData;
    const normalizedTitle = normalizeText(validatedData.title);
    const normalizedSport = normalizeText(validatedData.sport);
    const normalizedLeague = validatedData.league?.trim() || null;
    const authorId = validatedData.authorId || session.user.id;

    const existingTip = await prisma.tip.findFirst({
      where: {
        title: {
          equals: normalizedTitle,
          mode: "insensitive",
        },
        sport: {
          equals: normalizedSport,
          mode: "insensitive",
        },
        league: normalizedLeague,
        matchId: matchId ?? null,
        homeTeamId: homeTeamId ?? null,
        awayTeamId: awayTeamId ?? null,
        predictedOutcome: validatedData.predictedOutcome ?? null,
        category: validatedData.category,
        odds: validatedData.odds ?? null,
        isVIP: validatedData.isVIP,
        featured: validatedData.featured,
        authorId,
      },
      select: {
        id: true,
        title: true,
        sport: true,
        status: true,
        publishAt: true,
      },
    });

    if (existingTip) {
      return NextResponse.json(
        {
          success: false,
          error: "Tip already exists",
          data: { tip: existingTip },
        },
        { status: 409 },
      );
    }

    // Create tip
    const tip = await prisma.tip.create({
      data: {
        ...createData,
        content: validatedData.content || "",
        summary: validatedData.summary || "",
        matchDate: validatedData.matchDate
          ? new Date(validatedData.matchDate)
          : undefined,
        publishAt: validatedData.publishAt
          ? new Date(validatedData.publishAt)
          : new Date(),
        authorId,
        authorName: validatedData.authorName || session.user.displayName,
        ...(matchId && { match: { connect: { id: matchId } } }),
        ...(homeTeamId && { homeTeam: { connect: { id: homeTeamId } } }),
        ...(awayTeamId && { awayTeam: { connect: { id: awayTeamId } } }),
      },
      include: {
        match: true,
        homeTeam: true,
        awayTeam: true,
        _count: {
          select: {
            bets: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.adminAuditLog.create({
      data: {
        userId: session.user.id,
        action: "create_tip",
        resource: tip.id,
        details: {
          title: tip.title,
          sport: tip.sport,
          isVIP: tip.isVIP,
          status: tip.status,
        },
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tip created successfully",
      data: { tip },
    });
  } catch (error) {
    console.error("Admin tips POST error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check admin authentication
    const { error, session } = await requireAdmin();
    if (error || !session) return error as NextResponse;

    const { searchParams } = new URL(request.url);
    const tipId = searchParams.get("id");

    if (!tipId) {
      return NextResponse.json(
        { success: false, error: "Tip ID required" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = tipSchema.parse(body);

    // Destructure relational fields from validatedData
    const { matchId, homeTeamId, awayTeamId, ...updateData } = validatedData;

    // Update tip
    const tip = await prisma.tip.update({
      where: { id: tipId },
      data: {
        ...updateData,
        matchDate: validatedData.matchDate
          ? new Date(validatedData.matchDate)
          : undefined,
        publishAt: validatedData.publishAt
          ? new Date(validatedData.publishAt)
          : undefined,
        ...(matchId && { match: { connect: { id: matchId } } }),
        ...(homeTeamId && { homeTeam: { connect: { id: homeTeamId } } }),
        ...(awayTeamId && { awayTeam: { connect: { id: awayTeamId } } }),
      },
      include: {
        match: true,
        homeTeam: true,
        awayTeam: true,
        _count: {
          select: {
            bets: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.adminAuditLog.create({
      data: {
        userId: session.user.id,
        action: "update_tip",
        resource: tip.id,
        details: {
          title: tip.title,
          sport: tip.sport,
          updatedFields: Object.keys(validatedData),
        },
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tip updated successfully",
      data: { tip },
    });
  } catch (error) {
    console.error("Admin tips PUT error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication
    const { error, session } = await requireAdmin();
    if (error || !session) return error as NextResponse;

    const { searchParams } = new URL(request.url);
    const tipId = searchParams.get("id");

    if (!tipId) {
      return NextResponse.json(
        { success: false, error: "Tip ID required" },
        { status: 400 },
      );
    }

    // Check if tip has associated bets
    const betCount = await prisma.bet.count({
      where: { tipId },
    });

    if (betCount > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete tip with associated bets" },
        { status: 400 },
      );
    }

    // Get tip details for audit log
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
    });

    if (!tip) {
      return NextResponse.json(
        { success: false, error: "Tip not found" },
        { status: 404 },
      );
    }

    // Delete tip
    await prisma.tip.delete({
      where: { id: tipId },
    });

    // Create audit log
    await prisma.adminAuditLog.create({
      data: {
        userId: session.user.id,
        action: "delete_tip",
        resource: tipId,
        details: {
          title: tip.title,
          sport: tip.sport,
        },
        ipAddress: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tip deleted successfully",
    });
  } catch (error) {
    console.error("Admin tips DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
