import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";

// Validation schema
const convertTokensSchema = z.object({
  tokens: z.number().positive("Number of tokens must be positive").int(),
});

// Conversion rates (can be made configurable)
const TOKEN_CONVERSION_RATE = 0.01; // 1 token = $0.01
const MIN_CONVERSION_TOKENS = 100; // Minimum 100 tokens to convert
const MAX_CONVERSION_TOKENS = 10000; // Maximum 10,000 tokens per conversion

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await rateLimit.check(
      `convert:ip:${ip}`,
      5,
      300000
    ); // 5 per 5 min

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many conversion attempts. Please try again later.",
        },
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

    // Validate input
    const validatedData = convertTokensSchema.parse(body);

    // Validate conversion limits
    if (validatedData.tokens < MIN_CONVERSION_TOKENS) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum ${MIN_CONVERSION_TOKENS} tokens required for conversion`,
        },
        { status: 400 }
      );
    }

    if (validatedData.tokens > MAX_CONVERSION_TOKENS) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_CONVERSION_TOKENS} tokens allowed per conversion`,
        },
        { status: 400 }
      );
    }

    // Get user wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 }
      );
    }

    // Check if user has enough tokens
    const totalTokens = wallet.tokens + wallet.bonusTokens;
    if (totalTokens < validatedData.tokens) {
      return NextResponse.json(
        { success: false, error: "Insufficient tokens" },
        { status: 400 }
      );
    }

    // Calculate conversion amount
    const amountEarned = validatedData.tokens * TOKEN_CONVERSION_RATE;
    const conversionId = `conv_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Process conversion
    const result = await prisma.$transaction(async (tx) => {
      // Create conversion record
      const conversion = await tx.tokenConversion.create({
        data: {
          userId,
          tokensConverted: validatedData.tokens,
          tokenRate: TOKEN_CONVERSION_RATE,
          amountEarned,
          currency: "USD",
          status: "completed",
          conversionId,
          processedAt: new Date(),
        },
      });

      // Deduct tokens (use bonus tokens first, then regular tokens)
      let tokensToDeduct = validatedData.tokens;
      let bonusTokensDeducted = 0;
      let regularTokensDeducted = 0;

      if (wallet.bonusTokens > 0) {
        bonusTokensDeducted = Math.min(tokensToDeduct, wallet.bonusTokens);
        tokensToDeduct -= bonusTokensDeducted;
      }

      if (tokensToDeduct > 0) {
        regularTokensDeducted = tokensToDeduct;
      }

      // Update wallet
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amountEarned },
          tokens: { decrement: regularTokensDeducted },
          bonusTokens: { decrement: bonusTokensDeducted },
          totalEarned: { increment: amountEarned },
        },
      });

      // Create earning record
      await tx.earning.create({
        data: {
          userId,
          type: "token_conversion",
          source: conversion.id,
          amount: amountEarned,
          currency: "USD",
          tokens: validatedData.tokens,
          status: "confirmed",
          description: `Converted ${validatedData.tokens} tokens to cash`,
          confirmedAt: new Date(),
        },
      });

      return conversion;
    });

    // Track conversion analytics
    await prisma.analyticsEvent.create({
      data: {
        userId,
        type: "token_conversion_completed",
        payload: {
          conversionId: result.conversionId,
          tokensConverted: validatedData.tokens,
          amountEarned,
          conversionRate: TOKEN_CONVERSION_RATE,
          timestamp: new Date().toISOString(),
        },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tokens converted successfully",
      data: {
        conversion: {
          id: result.id,
          conversionId: result.conversionId,
          tokensConverted: result.tokensConverted,
          conversionRate: Number(result.tokenRate),
          amountEarned: Number(result.amountEarned),
          currency: result.currency,
          processedAt: result.processedAt,
        },
        wallet: {
          newBalance: Number(wallet.balance) + amountEarned,
          newTokens: wallet.tokens + wallet.bonusTokens - validatedData.tokens,
        },
      },
    });
  } catch (error) {
    console.error("Token conversion error:", error);

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

// GET endpoint: Get conversion history and rates
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

    // Get user's wallet and conversion history
    const [wallet, conversions] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId },
      }),
      prisma.tokenConversion.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 }
      );
    }

    // Get conversion statistics
    const stats = await prisma.tokenConversion.aggregate({
      where: {
        userId,
        status: "completed",
      },
      _sum: {
        tokensConverted: true,
        amountEarned: true,
      },
      _count: { id: true },
    });

    const totalTokensConverted = stats._sum.tokensConverted || 0;
    const totalAmountConverted = Number(stats._sum.amountEarned || 0);
    const totalConversions = stats._count.id || 0;

    return NextResponse.json({
      success: true,
      data: {
        wallet: {
          balance: Number(wallet.balance),
          tokens: wallet.tokens,
          bonusTokens: wallet.bonusTokens,
          totalTokens: wallet.tokens + wallet.bonusTokens,
        },
        conversion: {
          currentRate: TOKEN_CONVERSION_RATE,
          minTokens: MIN_CONVERSION_TOKENS,
          maxTokens: MAX_CONVERSION_TOKENS,
          estimatedValue:
            (wallet.tokens + wallet.bonusTokens) * TOKEN_CONVERSION_RATE,
        },
        statistics: {
          totalTokensConverted,
          totalAmountConverted,
          totalConversions,
        },
        history: conversions.map((conversion) => ({
          id: conversion.id,
          conversionId: conversion.conversionId,
          tokensConverted: conversion.tokensConverted,
          conversionRate: Number(conversion.tokenRate),
          amountEarned: Number(conversion.amountEarned),
          currency: conversion.currency,
          status: conversion.status,
          createdAt: conversion.createdAt,
          processedAt: conversion.processedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Token conversion GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
