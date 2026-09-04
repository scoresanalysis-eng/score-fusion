import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { hasTipAccess } from "@/lib/vip-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUser(request);

    // Fetch the prediction
    const tip = await prisma.tip.findUnique({
      where: { id },
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
          select: { id: true, name: true, shortName: true, logoUrl: true },
        },
        awayTeam: {
          select: { id: true, name: true, shortName: true, logoUrl: true },
        },
        predictionType: true,
        predictedOutcome: true,
        confidenceLevel: true,
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
        tipResult: {
          select: {
            id: true,
            settledAt: true,
            outcome: true,
            payout: true,
            createdAt: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tip) {
      return NextResponse.json(
        { success: false, error: "Prediction not found" },
        { status: 404 }
      );
    }

    // Check if prediction is published and has a valid publishAt
    if (
      tip.status !== "published" ||
      !tip.publishAt ||
      tip.publishAt > new Date()
    ) {
      return NextResponse.json(
        { success: false, error: "Prediction not available" },
        { status: 404 }
      );
    }

    // VIP access control
    let hasVipAccess = true;
    if (tip.isVIP) {
      if (!auth.user) {
        return NextResponse.json(
          {
            success: false,
            error: "Authentication required for VIP content",
          },
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

      hasVipAccess = await hasTipAccess(auth.user.id, id);
      if (!hasVipAccess) {
        return NextResponse.json(
          { success: false, error: "VIP subscription or token required" },
          { status: 403 }
        );
      }
    }

    // Increment view count
    await prisma.tip.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Track analytics
    if (auth.user) {
      try {
        await prisma.analyticsEvent.create({
          data: {
            userId: false ? undefined : auth.user.id,
            type: "prediction_viewed",
            payload: {
              tipId: id,
              isVIP: tip.isVIP,
              hasAccess: true,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        console.error("Failed to track prediction view:", error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        prediction: tip,
        hasVipAccess,
      },
    });
  } catch (error) {
    console.error("Prediction fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
