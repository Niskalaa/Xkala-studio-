// src/app/api/conversations/[id]/title/route.ts

import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-middleware";
import { getBedrockModel } from "@/lib/bedrock";
import {
  serverGetConversation,
  serverGetMessages,
  serverUpdateConversation,
} from "@/lib/firebase-admin";

// ============================================================
// POST /api/conversations/:id/title - AI-generate title
// ============================================================
export async function POST(
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

    // Get first few messages
    const messages = await serverGetMessages(user.uid, conversationId, 4);
    if (messages.length === 0) {
      return NextResponse.json(
        { error: "No messages to generate title from" },
        { status: 400 }
      );
    }

    // Build context for title generation
    const messageContext = messages
      .map((m) => `${m.role}: ${(m.content as string).substring(0, 200)}`)
      .join("\n");

    // Use Claude Sonnet 4 (cheapest of Claude models) for title generation
    const model = getBedrockModel("sonnet4");

    const { text: title } = await generateText({
      model,
      system: "You are a helpful assistant that generates short, descriptive titles for conversations. Respond with ONLY the title, no quotes, no extra text. Maximum 50 characters.",
      prompt: `Generate a short, descriptive title for this conversation:\n\n${messageContext}`,
      maxTokens: 30,
      temperature: 0.3,
    });

    // Clean up the title
    const cleanTitle = title
      .replace(/^["']|["']$/g, "") // Remove surrounding quotes
      .replace(/\n/g, " ")         // Remove newlines
      .trim()
      .substring(0, 60);           // Max 60 chars

    // Save to Firestore
    await serverUpdateConversation(user.uid, conversationId, {
      title: cleanTitle,
    });

    return NextResponse.json({ title: cleanTitle });
  } catch (error) {
    console.error("Failed to generate title:", error);
    return NextResponse.json(
      { error: "Failed to generate title" },
      { status: 500 }
    );
  }
}