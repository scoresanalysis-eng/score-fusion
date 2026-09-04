import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { cacheHelpers } from "@/lib/redis";
import { hasVIPAccess } from "@/lib/vip-access";
import { Prisma } from "@prisma/client";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  end.setHours(23, 59, 59, 999);
  return end;
}

// Public predictions (tips) query schema
const predictionsQuerySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("10000000000"),
  sport: z.string().optional(),
  vip: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  history: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  category: z.enum(["tip", "update"]).optional(),
  featured: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",") : undefined)),
  today: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const validatedQuery = predictionsQuerySchema.parse(query);

    const cacheKey = `predictions:${JSON.stringify({
      ...validatedQuery,
      vip: validatedQuery.vip ? "vip" : "public",
      history: validatedQuery.history ? "history" : "current",
    })}`;

    if (!validatedQuery.vip) {
      const cached = await cacheHelpers.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const session = await getCurrentSession();

    if (validatedQuery.vip && !validatedQuery.history) {
      if (!session || !session.user) {
        return NextResponse.json(
          { success: false, error: "Authentication required for VIP content" },
          { status: 401 }
        );
      }
      const vipAccess = await hasVIPAccess(session.user.id);
      if (!vipAccess) {
        return NextResponse.json(
          { success: false, error: "VIP subscription required" },
          { status: 403 }
        );
      }
    }

    let tipViewLimit: number | null = null;

    const where: Prisma.TipWhereInput = {
      status: "published",
      publishAt: { lte: new Date() },
      ...(validatedQuery.history
        ? {}
        : { isVIP: validatedQuery.vip ? true : false }),
    };

    // Filter for historical predictions if requested
    if (validatedQuery.history) {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      where.OR = [
        {
          AND: [{ result: { not: null } }, { result: { not: "pending" } }],
        },
        { matchDate: { lt: twoHoursAgo } },
      ];
    }

    // Filter to today's matches if requested
    if (validatedQuery.today) {
      where.matchDate = {
        gte: startOfDay(new Date()),
        lt: endOfDay(new Date()),
      };
    }

    if (validatedQuery.sport) {
      where.sport = { mode: "insensitive", equals: validatedQuery.sport };
    }
    if (validatedQuery.category) {
      where.category = validatedQuery.category;
    }
    // isVIP already set in initial object

    if (validatedQuery.search) {
      const searchOR = [
        {
          title: {
            mode: "insensitive" as const,
            contains: validatedQuery.search,
          },
        },
        {
          content: {
            mode: "insensitive" as const,
            contains: validatedQuery.search,
          },
        },
        {
          summary: {
            mode: "insensitive" as const,
            contains: validatedQuery.search,
          },
        },
        { tags: { hasSome: [validatedQuery.search] } },
      ];
      if (where.OR) {
        where.OR = [...where.OR, ...searchOR];
      } else {
        where.OR = searchOR;
      }
    }
    if (validatedQuery.tags && validatedQuery.tags.length > 0) {
      where.tags = { hasSome: validatedQuery.tags };
    }

    const skip = (validatedQuery.page - 1) * validatedQuery.limit;
    const take = Math.min(
      validatedQuery.limit,
      tipViewLimit || validatedQuery.limit
    );

    const [tips, total] = await Promise.all([
      prisma.tip.findMany({
        where,
        skip,
        take,
        orderBy: [
          { featured: "desc" },
          { publishAt: "desc" },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          title: true,
          summary: true,
          content: true,
          odds: true,
          oddsSource: true,
          sport: true,
          league: true,
          matchId: true,
          matchDate: true,
          homeTeamId: true,
          awayTeamId: true,
          category: true,
          homeTeam: {
            select: { id: true, name: true, shortName: true, logoUrl: true },
          },
          awayTeam: {
            select: { id: true, name: true, shortName: true, logoUrl: true },
          },
          predictionType: true,
          predictedOutcome: true,
          ticketSnapshots: true,
          publishAt: true,
          isVIP: true,
          featured: true,
          authorName: true,
          status: true,
          attachments: true,
          tags: true,
          viewCount: true,
          successRate: true,
          result: true,
          matchResult: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.tip.count({ where }),
    ]);

    if (session?.user && tips.length > 0) {
      try {
        await prisma.analyticsEvent.create({
          data: {
            userId: session?.user?.id ?? undefined,
            type: "predictions_viewed",
            payload: {
              tipIds: tips.map((t: { id: string }) => t.id),
              filters: validatedQuery,
              page: validatedQuery.page,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        console.error("Failed to track predictions view analytics:", error);
      }
    }

    const hasMore = skip + tips.length < total;

    const result = {
      success: true,
      data: {
        predictions: tips,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          hasMore,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
      },
    };

    if (!validatedQuery.vip) {
      await cacheHelpers.set(cacheKey, result, 300);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Predictions fetch error:", error);
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
