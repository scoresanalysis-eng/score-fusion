import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Guest login has been disabled. Please create an account or sign in.",
    },
    { status: 410 }
  );
}

