// src/app/api/conversations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { createConversationSchema } from "@/lib/validators";
import {
  serverCreateConversation,
} from "@/lib/firebase-admin";
import { adminDb } from "@/lib/firebase-admin";

// ============================================================
// GET /api/conversations - List all conversations
// ============================================================
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const snapshot = await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("conversations")
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();

    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || null,
      createdAt: doc.data().createdAt?.toDate()?.toISOString() || null,
    }));

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/conversations - Create new conversation
// ============================================================
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;

  try {
    const body = await request.json();
    const parseResult = createConversationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, model } = parseResult.data;

    const conversationId = await serverCreateConversation(user.uid, {
      title,
      model,
    });

    return NextResponse.json(
      {
        id: conversationId,
        title,
        model,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}