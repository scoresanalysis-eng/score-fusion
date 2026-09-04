import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Exact public paths — no auth required.
 */
const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/contact",
  "/help",
  "/privacy",
  "/terms",
]);

/** Prefix-based public paths (page routes) */
const PUBLIC_PREFIXES = [
  "/blog",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/_next",
  "/favicon",
  "/images",
  "/icons",
  "/fonts",
  "/robots",
  "/sitemap",
];

/** Public API prefixes — never require auth */
const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/blog",
  "/api/carousels",
  "/api/health",
  "/api/predictions",
  "/api/livescores",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname.startsWith("/api/")) {
    return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
  }
  return false;
}

/**
 * NextAuth uses different cookie names depending on whether the site is served
 * over HTTPS. We try both so the middleware works in dev (http) and prod (https)
 * without having to change environment variables.
 */
async function getSessionToken(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;

  // Try the secure (production HTTPS) cookie name first
  let token = await getToken({
    req,
    secret,
    cookieName: "__Secure-next-auth.session-token",
  });

  // Fall back to the insecure (dev HTTP) cookie name
  if (!token) {
    token = await getToken({
      req,
      secret,
      cookieName: "next-auth.session-token",
    });
  }

  return token;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always let public routes through immediately
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = await getSessionToken(req);
  const isApiRoute = pathname.startsWith("/api/");

  if (!token) {
    if (isApiRoute) {
      // Never redirect API calls — return 401 JSON so the client can handle it
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }
    // Page routes: redirect to login, preserving the intended destination
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const isAdmin = token.isAdmin === true || token.role === "ADMIN";
    if (!isAdmin) {
      if (isApiRoute) {
        return NextResponse.json(
          { success: false, error: "Admin access required" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js)).*)",
  ],
};
