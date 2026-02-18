// src/app/api/conversations/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { updateConversationSchema } from "@/lib/validators";
import {
  serverGetConversation,
  serverUpdateConversation,
  adminDb,
} from "@/lib/firebase-admin";

// ============================================================
// GET /api/conversations/:id - Get single conversation with messages
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;
  const { id: conversationId } = await params;

  try {
    // Get conversation
    const conversation = await serverGetConversation(user.uid, conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get messages
    const messagesSnapshot = await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("conversations")
      .doc(conversationId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString() || null,
    }));

    return NextResponse.json({
      conversation,
      messages,
    });
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH /api/conversations/:id - Update conversation
// ============================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;
  const { id: conversationId } = await params;

  try {
    const body = await request.json();
    const parseResult = updateConversationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Verify ownership
    const conversation = await serverGetConversation(user.uid, conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await serverUpdateConversation(user.uid, conversationId, parseResult.data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/conversations/:id - Delete conversation
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return authResult.response;
  const { user } = authResult;
  const { id: conversationId } = await params;

  try {
    // Verify ownership
    const conversation = await serverGetConversation(user.uid, conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Delete all messages first (batch delete)
    const messagesRef = adminDb
      .collection("users")
      .doc(user.uid)
      .collection("conversations")
      .doc(conversationId)
      .collection("messages");

    const messagesSnap = await messagesRef.get();

    // Firestore batch delete (max 500 per batch)
    const batchSize = 500;
    const batches = [];
    let batch = adminDb.batch();
    let count = 0;

    for (const doc of messagesSnap.docs) {
      batch.delete(doc.ref);
      count++;
      if (count >= batchSize) {
        batches.push(batch.commit());
        batch = adminDb.batch();
        count = 0;
      }
    }
    if (count > 0) {
      batches.push(batch.commit());
    }
    await Promise.all(batches);

    // Delete conversation document
    await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("conversations")
      .doc(conversationId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}