import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);

    // Track logout analytics if user was authenticated
    if (session?.user) {
      try {
        const ip = getClientIp(request);
        await prisma.analyticsEvent.create({
          data: {
            userId: session.user.id,
            type: "logout",
            payload: {
              timestamp: new Date().toISOString(),
            },
            ipAddress: ip,
            userAgent: request.headers.get("user-agent") || undefined,
          },
        });
      } catch (error) {
        console.error("Failed to track logout analytics:", error);
      }
    }

    // Return success response
    // NextAuth session will be cleared client-side using signOut()
    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    // Still return success even if there's an error
    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  }
}
