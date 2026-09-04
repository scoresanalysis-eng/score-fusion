import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Fetch hasPassword flag so the client can show the right password form
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName || session.user.name,
        isAdmin: session.user.isAdmin,
        role: session.user.role,
        // true = email/password account (or Google account that has also set a password)
        // false = Google-only, no password set yet
        hasPassword: !!dbUser?.passwordHash,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
