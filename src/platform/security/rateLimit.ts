import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getServerEnv } from "@/config/env";

const local = new Map<string, { count: number; resetAt: number }>();
let distributed: Ratelimit | null = null;

function distributedLimiter() {
  if (distributed) return distributed;
  const env = getServerEnv();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  distributed = new Ratelimit({
    redis: new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "skylark:ratelimit",
    analytics: true,
  });
  return distributed;
}

export async function checkRateLimit(identifier: string) {
  const limiter = distributedLimiter();
  if (limiter) return limiter.limit(identifier);
  const now = Date.now();
  const current = local.get(identifier);
  if (!current || current.resetAt <= now) {
    local.set(identifier, { count: 1, resetAt: now + 60_000 });
    return { success: true, limit: 30, remaining: 29, reset: now + 60_000 };
  }
  current.count += 1;
  return {
    success: current.count <= 30,
    limit: 30,
    remaining: Math.max(0, 30 - current.count),
    reset: current.resetAt,
  };
}
