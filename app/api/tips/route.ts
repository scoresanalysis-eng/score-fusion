import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/session";
import { cacheHelpers } from "@/lib/redis";
import { hasVIPAccess } from "@/lib/vip-access";

// Query schema
const tipsQuerySchema = z.object({
  page: z.string().transform(Number).default("1"),
  limit: z.string().transform(Number).default("10000000000"),
  sport: z.string().optional(),
  vip: z
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
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = tipsQuerySchema.parse(query);

    // Check cache for public tips
    const cacheKey = `tips:${JSON.stringify({
      ...validatedQuery,
      vip: validatedQuery.vip ? "vip" : "public",
    })}`;

    if (!validatedQuery.vip) {
      const cached = await cacheHelpers.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Get authenticated user (optional)
    const session = await getCurrentSession();

    // Check VIP access for VIP tips
    if (validatedQuery.vip) {
      if (!session || !session.user) {
        return NextResponse.json(
          { success: false, error: "Authentication required for VIP content" },
          { status: 401 }
        );
      }

      // Check if user has active subscription or valid VIP tokens
      const vipAccess = await hasVIPAccess(session.user.id);
      if (!vipAccess) {
        return NextResponse.json(
          { success: false, error: "VIP subscription required" },
          { status: 403 }
        );
      }
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: "published",
      publishAt: { lte: new Date() },
    };

    if (validatedQuery.sport) {
      where.sport = { mode: "insensitive", equals: validatedQuery.sport };
    }

    if (validatedQuery.featured !== undefined) {
      where.featured = validatedQuery.featured;
    }

    if (validatedQuery.vip) {
      where.isVIP = true;
    } else {
      where.isVIP = false;
    }

    if (validatedQuery.category) {
      where.category = validatedQuery.category;
    }

    if (validatedQuery.search) {
      where.OR = [
        { title: { mode: "insensitive", contains: validatedQuery.search } },
        { content: { mode: "insensitive", contains: validatedQuery.search } },
        { summary: { mode: "insensitive", contains: validatedQuery.search } },
        { tags: { hasSome: [validatedQuery.search] } },
      ];
    }

    if (validatedQuery.tags && validatedQuery.tags.length > 0) {
      where.tags = { hasSome: validatedQuery.tags };
    }

    // Get pagination info
    const skip = (validatedQuery.page - 1) * validatedQuery.limit;
    const take = validatedQuery.limit;

    // Query tips
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
          homeTeam: {
            select: {
              id: true,
              name: true,
              shortName: true,
              logoUrl: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              shortName: true,
              logoUrl: true,
            },
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
          category: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.tip.count({ where }),
    ]);

    // Track tip views for analytics
    if (session?.user && tips.length > 0) {
      try {
        await prisma.analyticsEvent.create({
          data: {
            userId: session?.user?.id ?? undefined,
            type: "tips_viewed",
            payload: {
              tipIds: tips.map((t: { id: string }) => t.id),
              filters: validatedQuery,
              page: validatedQuery.page,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        console.error("Failed to track tips view analytics:", error);
      }
    }

    const hasMore = skip + tips.length < total;

    const result = {
      success: true,
      data: {
        tips,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          hasMore,
          totalPages: Math.ceil(total / validatedQuery.limit),
        },
      },
    };

    // Cache public tips for 5 minutes
    if (!validatedQuery.vip) {
      await cacheHelpers.set(cacheKey, result, 300);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tips fetch error:", error);

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
