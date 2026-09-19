import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getServerEnv } from "@/config/env";

const payloadSchema = z.object({
  tenantId: z.string().min(1),
  actorId: z.string().min(1),
  expiresAt: z.number().int(),
  nonce: z.string().uuid(),
});

type OAuthStatePayload = z.infer<typeof payloadSchema>;

function signature(payload: string) {
  const secret = getServerEnv().AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for OAuth state.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOAuthState(payload: OAuthStatePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyOAuthState(value: string) {
  const [encoded, suppliedSignature] = value.split(".");
  if (!encoded || !suppliedSignature) throw new Error("Invalid OAuth state.");
  const expected = signature(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const trusted = Buffer.from(expected);
  if (
    supplied.length !== trusted.length ||
    !timingSafeEqual(supplied, trusted)
  )
    throw new Error("Invalid OAuth state signature.");
  const payload = payloadSchema.parse(
    JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
  );
  if (payload.expiresAt < Date.now()) throw new Error("OAuth state has expired.");
  return payload;
}
