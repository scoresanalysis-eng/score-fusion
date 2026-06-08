import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { PasswordManager } from "@/lib/auth";
import { getClientIp } from "@/lib/utils";

const deleteAccountSchema = z.object({
  currentPassword: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Unauthorized" },
        },
        { status: 401 },
      );
    }

    if (session.user.guest) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Guest accounts cannot be deleted" },
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = deleteAccountSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: { message: "Account not found" },
        },
        { status: 404 },
      );
    }

    if (user.passwordHash) {
      if (!validatedData.currentPassword) {
        return NextResponse.json(
          {
            success: false,
            error: { message: "Current password is required" },
          },
          { status: 400 },
        );
      }

      const isValidPassword = await PasswordManager.verify(
        validatedData.currentPassword,
        user.passwordHash,
      );

      if (!isValidPassword) {
        return NextResponse.json(
          {
            success: false,
            error: { message: "Current password is incorrect" },
          },
          { status: 400 },
        );
      }
    }

    const deletedAt = new Date();
    const ipAddress = getClientIp(request);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: "DELETED",
          deletedAt,
          email: null,
          name: null,
          image: null,
          emailVerified: null,
          passwordHash: null,
          displayName: null,
          deviceTokens: [],
          loginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
          referralCode: null,
          referralLink: null,
        },
      });

      await tx.analyticsEvent.create({
        data: {
          userId: user.id,
          type: "account_deleted",
          payload: {
            deletedAt: deletedAt.toISOString(),
            method: "self_service",
          },
          ipAddress,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Account deleted successfully",
      },
    });
  } catch (error) {
    console.error("Account deletion error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error.errors[0].message },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to delete account" },
      },
      { status: 500 },
    );
  }
}
