import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerEnv } from "@/config/env";
import { saveMondayConnection } from "@/platform/connections/repository";
import { verifyOAuthState } from "@/platform/security/oauthState";

export const runtime = "nodejs";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const stateValue = url.searchParams.get("state");
    if (!code || !stateValue)
      return NextResponse.json(
        { error: "OAuth callback is missing code or state." },
        { status: 400 },
      );
    const state = verifyOAuthState(stateValue);
    const env = getServerEnv();
    const response = await fetch("https://auth.monday.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.MONDAY_OAUTH_CLIENT_ID,
        client_secret: env.MONDAY_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: env.MONDAY_OAUTH_REDIRECT_URI,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`monday OAuth returned HTTP ${response.status}.`);
    const token = tokenResponseSchema.parse(await response.json());
    const connection = await saveMondayConnection({
      tenantId: state.tenantId,
      accessToken: token.access_token,
    });
    const redirect = new URL("/", request.url);
    redirect.searchParams.set("monday", "connected");
    redirect.searchParams.set("connectionId", connection.id);
    return NextResponse.redirect(redirect);
  } catch {
    return NextResponse.json(
      { error: "The monday.com connection could not be completed." },
      { status: 400 },
    );
  }
}
