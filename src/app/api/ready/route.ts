import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { Redis } from "@upstash/redis";
import { getServerEnv } from "@/config/env";
import { getDatabase } from "@/platform/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const env = getServerEnv();
    if (env.APP_ENV !== "demo") {
      await getDatabase().execute(sql`select 1`);
      const redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await redis.ping();
    }
    return NextResponse.json({
      status: "ready",
      environment: env.APP_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "not_ready", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
