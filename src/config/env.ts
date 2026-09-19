import "server-only";
import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));

const serverEnvSchema = z.object({
  APP_ENV: z.enum(["demo", "staging", "production"]).default("demo"),
  BUSINESS_TIMEZONE: z.string().default("Asia/Kolkata"),
  ASI_ONE_API_KEY: z.string().optional(),
  ASI_ONE_MODEL: z.string().default("asi1-mini"),
  ASI_ONE_BASE_URL: z.string().url().default("https://api.asi1.ai/v1"),
  MONDAY_API_TOKEN: z.string().optional(),
  MONDAY_DEALS_BOARD_ID: z.string().optional(),
  MONDAY_WORK_ORDERS_BOARD_ID: z.string().optional(),
  DEMO_ACCESS_CODE: z.string().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_OIDC_ISSUER: optionalUrl,
  AUTH_OIDC_CLIENT_ID: z.string().optional(),
  AUTH_OIDC_CLIENT_SECRET: z.string().optional(),
  DATABASE_URL: optionalUrl,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  MONDAY_OAUTH_CLIENT_ID: z.string().optional(),
  MONDAY_OAUTH_CLIENT_SECRET: z.string().optional(),
  MONDAY_OAUTH_REDIRECT_URI: optionalUrl,
  CREDENTIAL_ENCRYPTION_KEY: z.string().optional(),
  LANGSMITH_TRACING: z.enum(["true", "false"]).default("false"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug"]).default("info"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const env = serverEnvSchema.parse(process.env);
  if (env.APP_ENV === "production") {
    const required = [
      "AUTH_SECRET",
      "DATABASE_URL",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "MONDAY_OAUTH_CLIENT_ID",
      "MONDAY_OAUTH_CLIENT_SECRET",
      "MONDAY_OAUTH_REDIRECT_URI",
      "CREDENTIAL_ENCRYPTION_KEY",
    ] as const;
    const missing = required.filter((key) => !env[key]);
    if (missing.length)
      throw new Error(
        `Production configuration is incomplete: ${missing.join(", ")}`,
      );
  }
  cached = env;
  return env;
}

export function resetServerEnvForTests() {
  cached = null;
}
