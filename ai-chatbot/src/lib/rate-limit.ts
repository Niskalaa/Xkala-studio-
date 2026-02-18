// src/lib/rate-limit.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================
// OPTION A: Using Upstash Redis (Recommended for production)
// ============================================================
let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 requests per minute
    analytics: true,
    prefix: "ai-chat-ratelimit",
  });
}

// ============================================================
// OPTION B: In-memory rate limiting (Fallback for dev)
// ============================================================
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(identifier: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const record = inMemoryStore.get(identifier);

  if (!record || now > record.resetAt) {
    inMemoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: maxRequests - record.count };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (now > value.resetAt) {
      inMemoryStore.delete(key);
    }
  }
}, 60_000); // Clean every minute

// ============================================================
// UNIFIED RATE LIMIT FUNCTION
// ============================================================
export async function checkRateLimit(identifier: string): Promise<{
  success: boolean;
  remaining: number;
}> {
  // Use Upstash if configured
  if (ratelimit) {
    const result = await ratelimit.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
    };
  }

  // Fallback to in-memory
  return inMemoryRateLimit(identifier, 20, 60_000); // 20 req/min
}

// Per-model rate limiting (heavier models get lower limits)
export async function checkModelRateLimit(
  identifier: string,
  model: string
): Promise<{ success: boolean; remaining: number }> {
  const limits: Record<string, number> = {
    "sonnet4": 20,       // 20 req/min
    "opus4": 10,         // 10 req/min (expensive)
    "deepseek-r1": 15,   // 15 req/min
  };

  const maxRequests = limits[model] || 20;

  if (ratelimit) {
    const modelRatelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(maxRequests, "1 m"),
      prefix: `ai-chat-${model}`,
    });

    const result = await modelRatelimit.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  }

  return inMemoryRateLimit(`${identifier}:${model}`, maxRequests, 60_000);
}