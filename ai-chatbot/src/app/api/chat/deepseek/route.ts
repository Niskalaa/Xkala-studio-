---

## STEP 15: Enhanced Chat Route with DeepSeek R1 Support

```typescript
// src/app/api/chat/deepseek/route.ts
// Alternative endpoint specifically optimized for DeepSeek R1 with thinking

import { NextRequest } from "next/server";
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { authenticateRequest } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limit";
import { chatRequestSchema } from "@/lib/validators";
import { checkUserQuota, updateServerUserUsage, serverAddMessage } from "@/lib/firebase-admin";
import { DeepSeekStreamParser } from "@/lib/deepseek-handler";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 120; // DeepSeek R1 thinking can take longer

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    // Auth
    const authResult = await authenticateRequest(request);
    if (!authResult.success) return authResult.response;
    const { user } = authResult;

    // Rate limit
    const rateResult = await checkRateLimit(user.uid);
    if (!rateResult.success) {
      return Response.json(
        { error: "Rate limit exceeded", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    // Parse body
    const body = await request.json();
    const parseResult = chatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, conversationId, systemPrompt } = parseResult.data;

    // Check quota
    const quota = await checkUserQuota(user.uid);
    if (!quota.allowed) {
      return Response.json(
        { error: "Quota exceeded", code: "QUOTA_EXCEEDED" },
        { status: 402 }
      );
    }

    // Build messages for DeepSeek R1
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // DeepSeek R1 Bedrock request body
    const requestBody = JSON.stringify({
      messages: [
        {
          role: "system",
          content: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        },
        ...formattedMessages,
      ],
      max_tokens: 8000,
      temperature: 0.6,
      top_p: 0.95,
      stream: true,
    });

    // Call Bedrock with streaming
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: "us.deepseek.r1-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: new TextEncoder().encode(requestBody),
    });

    const response = await bedrockClient.send(command);

    // Create readable stream with thinking/answer separation
    const parser = new DeepSeekStreamParser();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          if (response.body) {
            for await (const event of response.body) {
              if (event.chunk?.bytes) {
                const text = new TextDecoder().decode(event.chunk.bytes);

                try {
                  const parsed = JSON.parse(text);
                  const content = parsed.choices?.[0]?.delta?.content || "";

                  if (content) {
                    const result = parser.processChunk(content);

                    if (result) {
                      // Send SSE event with type information
                      const sseData = JSON.stringify({
                        type: result.type,
                        content: result.content,
                      });
                      controller.enqueue(
                        encoder.encode(`data: ${sseData}\n\n`)
                      );
                    }
                  }

                  // Check for completion
                  if (parsed.choices?.[0]?.finish_reason === "stop") {
                    const finalResult = parser.getResult();

                    // Send completion event
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: "done",
                          thinking: finalResult.thinking,
                          answer: finalResult.answer,
                        })}\n\n`
                      )
                    );

                    // Save to Firestore
                    if (conversationId) {
                      await serverAddMessage(user.uid, conversationId, {
                        role: "assistant",
                        content: finalResult.answer,
                        thinking: finalResult.thinking || undefined,
                        model: "deepseek-r1",
                      });
                    }

                    // Update usage
                    const inputTokens = parsed.usage?.prompt_tokens || 0;
                    const outputTokens = parsed.usage?.completion_tokens || 0;
                    await updateServerUserUsage(user.uid, inputTokens, outputTokens);
                  }
                } catch {
                  // Not JSON, might be raw text
                  const result = parser.processChunk(text);
                  if (result) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: result.type,
                          content: result.content,
                        })}\n\n`
                      )
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                content: "Stream error occurred",
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Model": "deepseek-r1",
      },
    });
  } catch (error) {
    console.error("[DeepSeek R1 Error]:", error);
    return Response.json(
      { error: "Failed to process request", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}