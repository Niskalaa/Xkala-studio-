// src/app/api/chat/route.ts

import { streamText, type CoreMessage } from "ai";
import { NextRequest } from "next/server";
import { getBedrockModel, getModelConfig, isValidModel } from "@/lib/bedrock";
import { authenticateRequest } from "@/lib/auth-middleware";
import { checkRateLimit, checkModelRateLimit } from "@/lib/rate-limit";
import { chatRequestSchema } from "@/lib/validators";
import {
  serverAddMessage,
  serverUpdateConversation,
  serverGetMessages,
  serverGenerateTitle,
  checkUserQuota,
  updateServerUserUsage,
} from "@/lib/firebase-admin";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/models";

// ============================================================
// CONFIGURATION
// ============================================================

// Use Node.js runtime for AWS SDK compatibility
// Edge runtime has limitations with some AWS SDK features
export const runtime = "nodejs";

// Maximum streaming duration (Vercel Pro: 60s, Enterprise: 300s)
export const maxDuration = 60;

// ============================================================
// POST /api/chat - Main chat endpoint with streaming
// ============================================================
export async function POST(request: NextRequest) {
  try {
    // ========================================================
    // 1. AUTHENTICATE USER
    // ========================================================
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    const { user } = authResult;

    // ========================================================
    // 2. RATE LIMITING
    // ========================================================
    const rateResult = await checkRateLimit(user.uid);
    if (!rateResult.success) {
      return Response.json(
        {
          error: "Too many requests. Please slow down.",
          code: "RATE_LIMIT_EXCEEDED",
          remaining: rateResult.remaining,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": String(rateResult.remaining),
          },
        }
      );
    }

    // ========================================================
    // 3. PARSE & VALIDATE REQUEST BODY
    // ========================================================
    const body = await request.json();
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        {
          error: "Invalid request",
          code: "VALIDATION_ERROR",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { messages, model, conversationId, systemPrompt, temperature, maxTokens } =
      parseResult.data;

    // ========================================================
    // 4. VALIDATE MODEL
    // ========================================================
    if (!isValidModel(model)) {
      return Response.json(
        { error: `Invalid model: ${model}`, code: "INVALID_MODEL" },
        { status: 400 }
      );
    }

    // Per-model rate limiting
    const modelRateResult = await checkModelRateLimit(user.uid, model);
    if (!modelRateResult.success) {
      return Response.json(
        {
          error: `Rate limit exceeded for ${model}. Try a different model or wait.`,
          code: "MODEL_RATE_LIMIT",
        },
        { status: 429 }
      );
    }

    // ========================================================
    // 5. CHECK USER QUOTA
    // ========================================================
    const quota = await checkUserQuota(user.uid);
    if (!quota.allowed) {
      return Response.json(
        {
          error: "Monthly token quota exceeded. Please upgrade your plan.",
          code: "QUOTA_EXCEEDED",
          remaining: quota.remaining,
          limit: quota.limit,
        },
        { status: 402 }
      );
    }

    // ========================================================
    // 6. BUILD MESSAGES CONTEXT
    // ========================================================
    const modelConfig = getModelConfig(model);

    // Get historical messages if conversationId exists
    let contextMessages: CoreMessage[] = [];

    if (conversationId) {
      try {
        const historicalMessages = await serverGetMessages(
          user.uid,
          conversationId,
          50 // Last 50 messages for context
        );

        contextMessages = historicalMessages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content as string,
        }));
      } catch (error) {
        console.warn("Failed to load conversation history:", error);
        // Continue without history
      }
    }

    // Combine: historical messages + new messages from request
    // The new messages from the client include the latest user message
    const allMessages: CoreMessage[] = [
      ...contextMessages,
      // Only add messages that aren't already in context
      ...messages.filter((msg) => {
        // Simple dedup: check if last contextMessage matches
        const lastContext = contextMessages[contextMessages.length - 1];
        if (!lastContext) return true;
        return !(lastContext.role === msg.role && lastContext.content === msg.content);
      }),
    ];

    // Build system prompt
    const finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // ========================================================
    // 7. SAVE USER MESSAGE TO FIRESTORE
    // ========================================================
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();

    if (conversationId && lastUserMessage) {
      try {
        await serverAddMessage(user.uid, conversationId, {
          role: "user",
          content: lastUserMessage.content,
        });
      } catch (error) {
        console.error("Failed to save user message:", error);
        // Don't block the response
      }
    }

    // ========================================================
    // 8. CALL AWS BEDROCK VIA VERCEL AI SDK
    // ========================================================
    const bedrockModel = getBedrockModel(model);

    const result = streamText({
      model: bedrockModel,
      system: finalSystemPrompt,
      messages: allMessages,
      maxTokens: maxTokens || modelConfig.maxTokens,
      temperature: temperature ?? modelConfig.temperature,
      topP: modelConfig.topP,

      // ======================================================
      // 9. ON FINISH - Save assistant response & update usage
      // ======================================================
      onFinish: async (completion) => {
        const { text, usage, reasoning } = completion;

        // Calculate tokens
        const inputTokens = usage?.promptTokens || 0;
        const outputTokens = usage?.completionTokens || 0;
        const totalTokens = inputTokens + outputTokens;

        // Save assistant message to Firestore
        if (conversationId) {
          try {
            await serverAddMessage(user.uid, conversationId, {
              role: "assistant",
              content: text,
              thinking: reasoning || undefined,
              model,
              tokens: {
                input: inputTokens,
                output: outputTokens,
                total: totalTokens,
              },
            });

            // Update conversation title if first message
            const conv = await serverGetMessages(user.uid, conversationId, 3);
            if (conv.length <= 2 && lastUserMessage) {
              await serverGenerateTitle(
                user.uid,
                conversationId,
                lastUserMessage.content
              );
            }
          } catch (error) {
            console.error("Failed to save assistant message:", error);
          }
        }

        // Update user token usage
        try {
          await updateServerUserUsage(user.uid, inputTokens, outputTokens);
        } catch (error) {
          console.error("Failed to update usage:", error);
        }

        console.log(
          `[Chat] User: ${user.uid} | Model: ${model} | ` +
            `Input: ${inputTokens} | Output: ${outputTokens} | ` +
            `Total: ${totalTokens}`
        );
      },
    });

    // ========================================================
    // 10. RETURN STREAMING RESPONSE
    // ========================================================
    return result.toDataStreamResponse({
      headers: {
        "X-Model": model,
        "X-Conversation-Id": conversationId || "",
        "X-RateLimit-Remaining": String(rateResult.remaining),
      },
    });
  } catch (error) {
    // ========================================================
    // ERROR HANDLING
    // ========================================================
    console.error("[Chat API Error]:", error);

    // AWS Bedrock specific errors
    if (error instanceof Error) {
      // Throttling
      if (
        error.name === "ThrottlingException" ||
        error.message.includes("ThrottlingException")
      ) {
        return Response.json(
          {
            error: "AI service is busy. Please try again in a few seconds.",
            code: "BEDROCK_THROTTLED",
          },
          { status: 503, headers: { "Retry-After": "5" } }
        );
      }

      // Model not available
      if (
        error.name === "ModelNotReadyException" ||
        error.message.includes("not available")
      ) {
        return Response.json(
          {
            error: "This AI model is temporarily unavailable. Please try another model.",
            code: "MODEL_UNAVAILABLE",
          },
          { status: 503 }
        );
      }

      // Access denied
      if (
        error.name === "AccessDeniedException" ||
        error.message.includes("Access denied")
      ) {
        return Response.json(
          {
            error: "AI model access not configured. Contact admin.",
            code: "BEDROCK_ACCESS_DENIED",
          },
          { status: 403 }
        );
      }

      // Validation error from Bedrock
      if (error.name === "ValidationException") {
        return Response.json(
          {
            error: "Invalid request to AI model. Please try different input.",
            code: "BEDROCK_VALIDATION",
          },
          { status: 400 }
        );
      }
    }

    // Generic error
    return Response.json(
      {
        error: "An unexpected error occurred. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}