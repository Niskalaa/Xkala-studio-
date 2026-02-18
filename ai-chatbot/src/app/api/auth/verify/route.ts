// src/app/api/auth/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { getServerUserProfile, checkUserQuota } from "@/lib/firebase-admin";

// ============================================================
// POST /api/auth/verify - Verify token & return user profile
// ============================================================
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const profile = await getServerUserProfile(user.uid);
    const quota = await checkUserQuota(user.uid);

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        profile,
      },
      quota: {
        allowed: quota.allowed,
        remaining: quota.remaining,
        limit: quota.limit,
      },
    });
  } catch (error) {
    console.error("Failed to verify user:", error);
    return NextResponse.json(
      { error: "Failed to verify user" },
      { status: 500 }
    );
  }
}