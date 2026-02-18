// src/lib/validators.ts

import { z } from "zod";

// ============================================================
// CHAT REQUEST VALIDATION
// ============================================================
export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1, "Message content is required").max(100_000, "Message too long"),
      })
    )
    .min(1, "At least one message is required")
    .max(200, "Too many messages"),

  model: z.enum(["sonnet4", "opus4", "deepseek-r1"]).default("sonnet4"),

  conversationId: z.string().optional(),

  systemPrompt: z
    .string()
    .max(10_000, "System prompt too long")
    .optional(),

  temperature: z
    .number()
    .min(0)
    .max(1)
    .optional(),

  maxTokens: z
    .number()
    .min(1)
    .max(64_000)
    .optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

// ============================================================
// CONVERSATION REQUEST VALIDATION
// ============================================================
export const createConversationSchema = z.object({
  title: z.string().max(200).default("New Chat"),
  model: z.enum(["sonnet4", "opus4", "deepseek-r1"]).default("sonnet4"),
});

export const updateConversationSchema = z.object({
  title: z.string().max(200).optional(),
  isPinned: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// ============================================================
// HELPER: Extract auth token from request
// ============================================================
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
}