// src/middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================
// MIDDLEWARE - Route protection & redirects
// ============================================================

// Routes that require authentication
const protectedRoutes = ["/c", "/api/chat", "/api/conversations", "/api/user"];

// Routes that should redirect to chat if already authenticated
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Firebase auth token in cookie
  // Firebase Auth stores the token client-side,
  // so we use a custom cookie set after login
  const sessionCookie = request.cookies.get("__session")?.value;

  // ========================================================
  // API routes - handled by route-level auth
  // Just add CORS headers
  // ========================================================
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();

    // CORS headers
    response.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_APP_URL || "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age", "86400");

    return response;
  }

  // ========================================================
  // Handle OPTIONS (preflight) requests
  // ========================================================
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL || "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  return NextResponse.next();
}

// ============================================================
// MATCHER - Only run middleware on specific routes
// ============================================================
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|.*\\.png$|.*\\.svg$).*)",
  ],
};