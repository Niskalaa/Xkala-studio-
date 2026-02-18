// src/app/api/user/usage/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { checkUserQuota, getServerUserProfile } from "@/lib/firebase-admin";

// ============================================================
// GET /api/user/usage - Get usage statistics
// ============================================================
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const profile = await getServerUserProfile(user.uid);
    const quota = await checkUserQuota(user.uid);

    const usage = (profile as Record<string, unknown>)?.usage as Record<string, unknown> || {};

    return NextResponse.json({
      usage: {
        totalTokens: usage.totalTokens || 0,
        monthlyTokens: usage.monthlyTokens || 0,
        monthlyLimit: quota.limit,
        remaining: quota.remaining,
        percentUsed: quota.limit > 0
          ? Math.round(((quota.limit - quota.remaining) / quota.limit) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error("Failed to get usage:", error);
    return NextResponse.json(
      { error: "Failed to get usage data" },
      { status: 500 }
    );
  }
}