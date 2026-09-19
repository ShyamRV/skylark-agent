import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/config/env";
import { requireContext } from "@/platform/auth/context";
import { createOAuthState } from "@/platform/security/oauthState";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await requireContext({ request, roles: ["admin"] });
  const env = getServerEnv();
  if (!env.MONDAY_OAUTH_CLIENT_ID || !env.MONDAY_OAUTH_REDIRECT_URI)
    return NextResponse.json(
      { error: "monday OAuth is not configured." },
      { status: 503 },
    );
  const state = createOAuthState({
    tenantId: context.tenantId,
    actorId: context.actorId,
    expiresAt: Date.now() + 10 * 60_000,
    nonce: randomUUID(),
  });
  const url = new URL("https://auth.monday.com/oauth2/authorize");
  url.searchParams.set("client_id", env.MONDAY_OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.MONDAY_OAUTH_REDIRECT_URI);
  url.searchParams.set("scope", "boards:read");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
