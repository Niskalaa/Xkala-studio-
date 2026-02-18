// src/lib/auth-middleware.ts

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "./firebase-admin";
import { extractBearerToken } from "./validators";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  name: string | null;
}

/**
 * Verify authentication for API routes
 * Returns user info or error response
 */
export async function authenticateRequest(
  request: NextRequest | Request
): Promise<
  | { success: true; user: AuthenticatedUser }
  | { success: false; response: NextResponse }
> {
  // Extract token
  const token = extractBearerToken(request);

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      ),
    };
  }

  // Verify token
  const decoded = await verifyIdToken(token);

  if (!decoded) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Invalid or expired token",
          code: "INVALID_TOKEN",
        },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    user: {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    },
  };
}