import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { PasswordManager } from "@/lib/auth";
import { EmailService } from "@/lib/email";
import { getClientIp } from "@/lib/utils";

// currentPassword is optional — Google-only accounts have no passwordHash and
// therefore don't need to prove ownership via an existing password.
const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting — 5 attempts per hour per user
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit.check(
      `change-password:${userId}`,
      5,
      3600000
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Too many password change attempts. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);

    // Fetch user — need passwordHash to determine if they're a Google-only account
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.deletedAt) {
      return NextResponse.json(
        { success: false, error: { message: "User not found" } },
        { status: 404 }
      );
    }

    const isGoogleOnlyAccount = !user.passwordHash;

    if (isGoogleOnlyAccount) {
      // Google-only users are setting a password for the first time.
      // No currentPassword check needed — their session proves identity.
    } else {
      // Email/password users must verify their current password.
      if (!validatedData.currentPassword) {
        return NextResponse.json(
          {
            success: false,
            error: { message: "Current password is required" },
          },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await PasswordManager.verify(
        validatedData.currentPassword,
        user.passwordHash!
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          {
            success: false,
            error: { message: "Current password is incorrect" },
          },
          { status: 400 }
        );
      }

      // Prevent reusing the same password
      const isSamePassword = await PasswordManager.verify(
        validatedData.newPassword,
        user.passwordHash!
      );

      if (isSamePassword) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "New password must be different from your current password",
            },
          },
          { status: 400 }
        );
      }
    }

    // Validate password strength (belt-and-suspenders beyond Zod)
    const passwordValidation = PasswordManager.validateStrength(
      validatedData.newPassword
    );
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: { message: passwordValidation.errors.join(", ") },
        },
        { status: 400 }
      );
    }

    const newPasswordHash = await PasswordManager.hash(validatedData.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Confirmation email — fire and forget
    if (user.email) {
      EmailService.sendPasswordChangeConfirmation(
        user.email,
        user.displayName || "User"
      ).catch((err) =>
        console.error("Failed to send password change email:", err)
      );
    }

    // Analytics
    prisma.analyticsEvent
      .create({
        data: {
          userId: user.id,
          type: isGoogleOnlyAccount ? "password_set" : "password_changed",
          payload: {
            email: user.email,
            timestamp: new Date().toISOString(),
          },
          ipAddress: ip,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      })
      .catch((err) => console.error("Failed to track password analytics:", err));

    return NextResponse.json({
      success: true,
      data: {
        message: isGoogleOnlyAccount
          ? "Password set successfully. You can now sign in with your email and password."
          : "Password changed successfully.",
      },
    });
  } catch (error) {
    console.error("Change password error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: error.errors[0].message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
