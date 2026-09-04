import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { nanoid } from "nanoid";

// Validation schemas
const applyReferralSchema = z.object({
  referralCode: z.string().min(5, "Invalid referral code"),
});

// GET endpoint: Get user's referral information
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

    // Get user's referral information
    const [user, referralStats, recentReferrals, earnings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          referralCode: true,
          referralLink: true,
        },
      }),
      prisma.referral.aggregate({
        where: { referrerId: userId },
        _count: { id: true },
        _sum: { rewardAmount: true },
      }),
      prisma.referral.findMany({
        where: { referrerId: userId },
        include: {
          referred: {
            select: {
              id: true,
              displayName: true,
              email: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.referralEarning.findMany({
        where: { userId },
        include: {
          referral: {
            include: {
              referred: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    // Generate referral code if user doesn't have one
    let referralCode = user?.referralCode;
    let referralLink = user?.referralLink;

    if (!referralCode) {
      referralCode = nanoid(8).toUpperCase();
      referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${referralCode}`;

      await prisma.user.update({
        where: { id: userId },
        data: {
          referralCode,
          referralLink,
        },
      });
    }

    const totalReferrals = referralStats._count.id || 0;
    const totalEarnings = Number(referralStats._sum.rewardAmount || 0);

    return NextResponse.json({
      success: true,
      data: {
        referralCode,
        referralLink,
        stats: {
          totalReferrals,
          totalEarnings,
          pendingReferrals: recentReferrals.filter(
            (r) => r.status === "pending"
          ).length,
          completedReferrals: recentReferrals.filter(
            (r) => r.status === "completed"
          ).length,
        },
        recentReferrals: recentReferrals.map((referral) => ({
          id: referral.id,
          status: referral.status,
          rewardAmount: Number(referral.rewardAmount || 0),
          createdAt: referral.createdAt,
          referredUser: {
            displayName: referral.referred.displayName,
            email: referral.referred.email,
            joinedAt: referral.referred.createdAt,
          },
        })),
        earnings: earnings.map((earning) => ({
          id: earning.id,
          type: earning.type,
          amount: Number(earning.amount),
          currency: earning.currency,
          tokens: earning.tokens,
          status: earning.status,
          description: earning.description,
          createdAt: earning.createdAt,
          confirmedAt: earning.confirmedAt,
          referral: {
            referredUser: earning.referral.referred.displayName,
          },
        })),
      },
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST endpoint: Apply referral code or create referral
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = (request.headers.get("x-forwarded-for") ?? "127.0.0.1").split(
      ","
    )[0];
    const rateLimitResult = await rateLimit.check(
      `referral:ip:${ip}`,
      5,
      300000
    ); // 5 per 5 min

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
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

    // Check if user already has a referrer
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true },
    });

    if (existingUser?.referredBy) {
      return NextResponse.json(
        { success: false, error: "You have already used a referral code" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = applyReferralSchema.parse(body);

    // Find referrer by referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: validatedData.referralCode },
      include: { wallet: true },
    });

    if (!referrer) {
      return NextResponse.json(
        { success: false, error: "Invalid referral code" },
        { status: 404 }
      );
    }

    if (referrer.id === userId) {
      return NextResponse.json(
        { success: false, error: "You cannot use your own referral code" },
        { status: 400 }
      );
    }

    // Create referral record
    const referral = await prisma.$transaction(async (tx) => {
      // Update referred user
      await tx.user.update({
        where: { id: userId },
        data: {
          referredBy: referrer.id,
        },
      });

      // Create referral record
      const newReferral = await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: userId,
          referralCode: validatedData.referralCode,
          status: "confirmed",
          completedAt: new Date(),
        },
      });

      // Create wallet for referred user if doesn't exist
      await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          balance: 0,
          tokens: 0,
          bonusTokens: 10, // Welcome bonus tokens
        },
      });

      // Award signup bonus to referrer
      const signupReward = 5.0; // $5 signup bonus
      const signupTokens = 50; // 50 tokens bonus

      await tx.wallet.upsert({
        where: { userId: referrer.id },
        update: {
          balance: { increment: signupReward },
          tokens: { increment: signupTokens },
          totalEarned: { increment: signupReward },
        },
        create: {
          userId: referrer.id,
          balance: signupReward,
          tokens: signupTokens,
          totalEarned: signupReward,
        },
      });

      // Create referral earning record
      await tx.referralEarning.create({
        data: {
          userId: referrer.id,
          referralId: newReferral.id,
          type: "signup",
          amount: signupReward,
          currency: "USD",
          tokens: signupTokens,
          status: "confirmed",
          description: `Referral signup bonus for ${
            auth.user.displayName || "new user"
          }`,
          confirmedAt: new Date(),
        },
      });

      // Create earning record for referrer
      await tx.earning.create({
        data: {
          userId: referrer.id,
          type: "referral_bonus",
          source: newReferral.id,
          amount: signupReward,
          currency: "USD",
          tokens: signupTokens,
          status: "confirmed",
          description: "Successful referral signup",
          confirmedAt: new Date(),
        },
      });

      return newReferral;
    });

    // Track referral analytics
    await prisma.analyticsEvent.create({
      data: {
        userId,
        type: "referral_applied",
        payload: {
          referralCode: validatedData.referralCode,
          referrerId: referrer.id,
          referralId: referral.id,
          timestamp: new Date().toISOString(),
        },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Referral code applied successfully",
      data: {
        referralId: referral.id,
        referrer: {
          displayName: referrer.displayName,
        },
        rewards: {
          welcomeTokens: 10,
          referrerBonus: "$5.00",
          referrerTokens: 50,
        },
      },
    });
  } catch (error) {
    console.error("Referral POST error:", error);

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
