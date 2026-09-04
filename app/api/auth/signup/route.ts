import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { EmailService } from "@/lib/email";
import { getClientIp } from "@/lib/utils";
import {
  botGuardFailureMessage,
  validateSignupBotGuard,
} from "@/lib/signup-bot-guard";

const signupSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase()),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters long"),
  displayName: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters long"),
  country: z.string().trim().optional(),
  dob: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date of birth");
      }
      return date;
    }),
  referralCode: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : undefined)),
  botGuard: z
    .object({
      website: z.string().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      formStartedAt: z.number().optional(),
    })
    .optional(),
  consents: z
    .object({
      analytics: z.boolean().default(true),
      marketing: z.boolean().default(false),
      essential: z.boolean().default(true),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit.check(
      `signup:ip:${ip}`,
      20,
      900000,
    ); // 20 per 15 min

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many signup attempts. Please try again later.",
        },
        { status: 429 },
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = signupSchema.parse(body);

    if (validatedData.botGuard) {
      const botGuard = validateSignupBotGuard(validatedData.botGuard);
      if (!botGuard.ok) {
        console.warn("Signup bot guard rejected request:", botGuard.reason, ip);
        return NextResponse.json(
          { success: false, error: botGuardFailureMessage() },
          { status: 400 },
        );
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      const isGoogleUser = !existingUser.passwordHash;
      const errorMessage = isGoogleUser
        ? "An account with this email was created with Google. Please sign in with Google."
        : "An account with this email already exists. Please log in instead.";

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          code: "EMAIL_EXISTS",
          isGoogleAccount: isGoogleUser,
          fieldErrors: {
            email: errorMessage,
          },
        },
        { status: 409 },
      );
    }

    // Age verification (if DOB provided)
    if (validatedData.dob) {
      const ageMs = Date.now() - validatedData.dob.getTime();
      const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 18) {
        return NextResponse.json(
          {
            success: false,
            error: "You must be at least 18 years old to register",
          },
          { status: 400 },
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        passwordHash,
        displayName: validatedData.displayName,
        name: validatedData.displayName,
        profile: {
          create: {
            country: validatedData.country,
            dob: validatedData.dob,
            consents: validatedData.consents,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    let referralApplied = null;

    // Handle referral code if provided
    if (validatedData.referralCode && user?.id) {
      try {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: validatedData.referralCode },
        });

        if (referrer && referrer.id !== user.id) {
          // Create referral record and award bonus
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await prisma.$transaction(async (tx: any) => {
            // Update user with referrer
            await tx.user.update({
              where: { id: user.id },
              data: { referredBy: referrer.id },
            });

            // Create referral record
            const referral = await tx.referral.create({
              data: {
                referrerId: referrer.id,
                referredId: user.id,
                referralCode: validatedData.referralCode!,
                status: "confirmed",
                completedAt: new Date(),
                rewardAmount: 5.0,
              },
            });

            // Create wallet for new user with welcome bonus
            await tx.wallet.create({
              data: {
                userId: user.id,
                balance: 0,
                tokens: 10, // Welcome bonus tokens
                bonusTokens: 5, // Extra bonus for using referral
              },
            });

            // Award signup bonus to referrer
            await tx.wallet.upsert({
              where: { userId: referrer.id },
              update: {
                balance: { increment: 5.0 },
                tokens: { increment: 50 },
                totalEarned: { increment: 5.0 },
              },
              create: {
                userId: referrer.id,
                balance: 5.0,
                tokens: 50,
                totalEarned: 5.0,
              },
            });

            // Create referral earning record for referrer
            await tx.referralEarning.create({
              data: {
                userId: referrer.id,
                referralId: referral.id,
                type: "signup",
                amount: 5.0,
                currency: "USD",
                tokens: 50,
                status: "confirmed",
                description: `Referral signup bonus for ${user.displayName}`,
                confirmedAt: new Date(),
              },
            });

            referralApplied = {
              referrerName: referrer.displayName,
              welcomeBonus: 15, // Total tokens (10 + 5)
              referrerBonus: "$5.00",
            };
          });
        }
      } catch (error) {
        console.error("Referral processing error:", error);
        // Don't fail signup if referral processing fails
      }
    } else if (user?.id) {
      // Create wallet for user without referral
      try {
        await prisma.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            tokens: 5, // Basic welcome bonus
          },
        });
      } catch (error) {
        console.error("Wallet creation error:", error);
        // Don't fail signup if wallet creation fails
      }
    }

    // Track signup analytics
    try {
      await prisma.analyticsEvent.create({
        data: {
          userId: user.id,
          type: "signup",
          payload: {
            email: validatedData.email,
            country: validatedData.country,
            consents: validatedData.consents,
            referralCode: validatedData.referralCode,
            referralApplied: !!referralApplied,
            timestamp: new Date().toISOString(),
          },
          ipAddress: ip,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      });
    } catch (error) {
      console.error("Failed to track signup analytics:", error);
    }

    // Send welcome email
    if (user.email && user.displayName) {
      try {
        await EmailService.sendWelcomeEmail(user.email, user.displayName);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail signup if email fails
      }
    }

    // Return success - NextAuth will handle session management
    // Client should call signIn from next-auth/react with these credentials
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.role === "ADMIN",
        profile: user.profile,
      },
      referralApplied,
      message: "Signup successful. Please sign in with NextAuth.",
    });
  } catch (error: any) {
    console.error("Signup error:", error);

    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const fieldName = issue.path[0]?.toString() || "general";
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message || "Validation failed",
          fieldErrors,
        },
        { status: 400 },
      );
    }

    // Handle Prisma unique constraint violations (P2002)
    if (error?.code === "P2002") {
      const target = Array.isArray(error?.meta?.target)
        ? error.meta.target.join(", ")
        : String(error?.meta?.target || "email");

      if (target.includes("email")) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email already exists. Please log in instead.",
            code: "EMAIL_EXISTS",
            fieldErrors: {
              email: "An account with this email already exists",
            },
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `A user with this ${target} already exists.`,
          code: "UNIQUE_CONSTRAINT",
          fieldErrors: {
            [target]: `This ${target} is already in use.`,
          },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : "An unexpected error occurred during signup. Please try again.",
      },
      { status: 500 },
    );
  }
}
