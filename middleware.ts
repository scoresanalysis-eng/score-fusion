import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Routes that are fully public — no authentication required.
 * Everything else requires a valid session.
 */
const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/contact",
  "/help",
  "/privacy",
  "/terms",
]);

/** Prefix-based public paths (any path starting with these is public) */
const PUBLIC_PREFIXES = [
  "/blog",          // /blog and /blog/[slug]
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  // Next.js internals & static files
  "/_next",
  "/favicon",
  "/images",
  "/icons",
  "/fonts",
  "/robots",
  "/sitemap",
];

/** Public API routes (prefix match) */
const PUBLIC_API_PREFIXES = [
  "/api/auth",          // NextAuth endpoints (signin, signout, session, csrf, etc.)
  "/api/blog",          // Public blog posts
  "/api/carousels",     // Landing page carousels
  "/api/health",        // Health check
  "/api/predictions",   // Public (free) predictions shown on landing
  "/api/livescores",    // Livescores visible on landing
];

function isPublic(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.has(pathname)) return true;

  // Prefix match for pages
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;

  // API routes
  if (pathname.startsWith("/api/")) {
    return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Check for a valid NextAuth JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // Redirect unauthenticated users to login, preserving the intended destination
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes — 403 redirect for non-admins
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const isAdmin =
      token.isAdmin === true || token.role === "ADMIN";
    if (!isAdmin) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all paths except Next.js internals and static file extensions.
   * This keeps the matcher lean — the isPublic() check above handles
   * the fine-grained allow-list at runtime.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js)).*)",
  ],
};
