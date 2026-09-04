import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

/**
 * Exact public paths — no authentication required.
 */
const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/contact",
  "/help",
  "/privacy",
  "/terms",
]);

/** Prefix-based public paths */
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

/** Public API prefixes */
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

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const { pathname } = req.nextUrl;

    // Public routes always pass through
    if (isPublic(pathname)) {
      return NextResponse.next();
    }

    const token = req.nextauth.token;

    // No token — redirect to login
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      const isAdmin = token.isAdmin === true || token.role === "ADMIN";
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // authorized is called before middleware() — returning true lets the
      // request through to our middleware function above.
      // Returning false would redirect to the signIn page directly.
      // We always return true here and handle auth logic ourselves above.
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js)).*)",
  ],
};
