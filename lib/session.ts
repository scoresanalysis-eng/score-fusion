/**
 * Unified Session Management Utility
 *
 * This module provides a consistent way to handle authentication and sessions
 * across the application using NextAuth.js
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  displayName?: string | null;
  isAdmin?: boolean;
  role?: string;
}

export interface AuthSession {
  user: SessionUser;
}

/**
 * Get the current authenticated session
 * Use this in API routes and server components to get the current user
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  return session as AuthSession;
}

/**
 * Require authentication for an API route
 * Returns the session or throws an appropriate error response
 */
export async function requireAuth() {
  const session = await getCurrentSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}

/**
 * Require admin authentication for an API route
 * Returns the session if user is admin or throws an appropriate error response
 */
export async function requireAdmin() {
  const session = await getCurrentSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      ),
      session: null,
    };
  }

  const isAdmin = session.user.isAdmin || session.user.role === "ADMIN";

  if (!isAdmin) {
    return {
      error: NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}

/**
 * Check if the current user is authenticated
 * Useful for conditional logic in server components
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session;
}

/**
 * Check if the current user is an admin
 * Useful for conditional logic in server components
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentSession();

  if (!session) {
    return false;
  }

  return session.user.isAdmin || session.user.role === "ADMIN";
}

/**
 * Get the current user ID
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.user.id || null;
}

/**
 * Middleware helper for API routes using Next.js route handlers
 * Wraps your route handler and ensures authentication
 *
 * @example
 * export const GET = withAuth(async (request, { session }) => {
 *   // Your route logic here
 *   return NextResponse.json({ userId: session.user.id });
 * });
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: { session: AuthSession }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const { error, session } = await requireAuth();

    if (error || !session) {
      return error;
    }

    return handler(request, { session });
  };
}

/**
 * Middleware helper for admin-only API routes
 * Wraps your route handler and ensures admin authentication
 *
 * @example
 * export const GET = withAdmin(async (request, { session }) => {
 *   // Your admin route logic here
 *   return NextResponse.json({ adminId: session.user.id });
 * });
 */
export function withAdmin(
  handler: (
    request: NextRequest,
    context: { session: AuthSession }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const { error, session } = await requireAdmin();

    if (error || !session) {
      return error;
    }

    return handler(request, { session });
  };
}

/**
 * Get user info for logging/debugging
 * Safely extracts user information without sensitive data
 */
export function getUserInfo(session: AuthSession | null) {
  if (!session) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    userId: session.user.id,
    isAdmin: session.user.isAdmin || session.user.role === "ADMIN",
    displayName: session.user.displayName || session.user.name,
  };
}

/**
 * Helper function to replace getAuthenticatedUser from old auth system
 * Returns session data in format similar to old auth system for easier migration
 *
 * @deprecated Use getCurrentSession() directly instead
 */
export async function getAuthenticatedUserFromSession() {
  const session = await getCurrentSession();

  if (!session || !session.user) {
    return { user: null, error: "Authentication required" };
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName || session.user.name,
      isAdmin: session.user.isAdmin || session.user.role === "ADMIN",
    },
    session,
    error: undefined,
  };
}
