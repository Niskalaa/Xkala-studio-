// src/app/api/user/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { getServerUserProfile, adminDb } from "@/lib/firebase-admin";

// ============================================================
// GET /api/user - Get current user profile
// ============================================================
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const profile = await getServerUserProfile(user.uid);
    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error("Failed to get user:", error);
    return NextResponse.json(
      { error: "Failed to get user profile" },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH /api/user - Update user preferences
// ============================================================
export async function PATCH(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json(
        { error: "Invalid preferences" },
        { status: 400 }
      );
    }

    // Whitelist allowed preference fields
    const allowedFields = [
      "defaultModel",
      "theme",
      "systemPrompt",
      "sendWithEnter",
      "showTokenCount",
      "fontSize",
    ];

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(preferences)) {
      if (allowedFields.includes(key)) {
        updates[`preferences.${key}`] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await adminDb.collection("users").doc(user.uid).update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}