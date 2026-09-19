import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { OAuthConfig } from "next-auth/providers/oauth";
import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/config/env";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function oidcProvider(): OAuthConfig<Record<string, unknown>> | null {
  const env = getServerEnv();
  if (
    !env.AUTH_OIDC_ISSUER ||
    !env.AUTH_OIDC_CLIENT_ID ||
    !env.AUTH_OIDC_CLIENT_SECRET
  )
    return null;
  return {
    id: "skylark-oidc",
    name: "Skylark SSO",
    type: "oauth",
    wellKnown: `${env.AUTH_OIDC_ISSUER.replace(/\/$/, "")}/.well-known/openid-configuration`,
    clientId: env.AUTH_OIDC_CLIENT_ID,
    clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
    idToken: true,
    checks: ["pkce", "state"],
    authorization: { params: { scope: "openid email profile" } },
    profile(profile) {
      const subject = String(profile.sub ?? profile.id ?? profile.email);
      return {
        id: subject,
        name: typeof profile.name === "string" ? profile.name : null,
        email: typeof profile.email === "string" ? profile.email : null,
      };
    },
  };
}

export function getAuthOptions(): NextAuthOptions {
  const env = getServerEnv();
  const oidc = oidcProvider();
  const providers: NextAuthOptions["providers"] = [];
  if (oidc) providers.push(oidc);
  if (env.APP_ENV === "demo" && env.DEMO_ACCESS_CODE) {
    providers.push(
      CredentialsProvider({
        name: "Evaluator access",
        credentials: {
          accessCode: { label: "Access code", type: "password" },
        },
        async authorize(credentials) {
          if (
            credentials?.accessCode &&
            safeEqual(credentials.accessCode, env.DEMO_ACCESS_CODE!)
          )
            return {
              id: "demo-evaluator",
              name: "Demo evaluator",
              email: "evaluator@demo.skylark",
            };
          return null;
        },
      }),
    );
  }
  return {
    secret: env.AUTH_SECRET,
    providers,
    session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
    pages: { signIn: "/" },
    callbacks: {
      async jwt({ token, profile }) {
        const claims = profile as
          | { tenant_id?: string; roles?: string[] }
          | undefined;
        token.tenantId = claims?.tenant_id ?? token.tenantId ?? "skylark";
        token.roles = claims?.roles ?? token.roles ?? ["analyst"];
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub ?? "unknown";
          session.user.tenantId = String(token.tenantId ?? "skylark");
          session.user.roles = Array.isArray(token.roles)
            ? token.roles.map(String)
            : ["analyst"];
        }
        return session;
      },
    },
  };
}
