import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { PasswordManager } from "@/lib/auth";
import { EmailService } from "@/lib/email";
import { getClientIp } from "@/lib/utils";

// Validation schema
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Unauthorized" },
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit.check(
      `change-password:${userId}`,
      5,
      3600000
    ); // 5 attempts per hour

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              "Too many password change attempts. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = changePasswordSchema.parse(body);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash || user.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "User not found" },
        },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordManager.verify(
      validatedData.currentPassword,
      user.passwordHash
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

    // Check if new password is same as current password
    const isSamePassword = await PasswordManager.verify(
      validatedData.newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "New password must be different from current password",
          },
        },
        { status: 400 }
      );
    }

    // Validate new password strength
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

    // Hash new password
    const newPasswordHash = await PasswordManager.hash(
      validatedData.newPassword
    );

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Send confirmation email
    try {
      await EmailService.sendPasswordChangeConfirmation(
        user.email!,
        user.displayName || "User"
      );
    } catch (emailError) {
      console.error(
        "Failed to send password change confirmation email:",
        emailError
      );
      // Don't fail the request if email fails
    }

    // Track password change
    try {
      await prisma.analyticsEvent.create({
        data: {
          userId: user.id,
          type: "password_changed",
          payload: {
            email: user.email,
            timestamp: new Date().toISOString(),
          },
          ipAddress: ip,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      });
    } catch (error) {
      console.error("Failed to track password change analytics:", error);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Password changed successfully",
      },
    });
  } catch (error) {
    console.error("Change password error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.errors[0].message },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
