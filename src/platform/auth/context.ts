import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { getServerSession } from "next-auth";
import { getServerEnv } from "@/config/env";
import type { AgentRequestContext } from "@/agent/graph";
import { getAuthOptions } from "./options";

export class AuthorizationError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function requireContext(input: {
  request: Request;
  accessCode?: string;
  roles?: string[];
}): Promise<AgentRequestContext> {
  const env = getServerEnv();
  const requestId =
    input.request.headers.get("x-request-id") ?? randomUUID();
  const threadId =
    input.request.headers.get("x-thread-id") ?? randomUUID();

  if (env.APP_ENV === "demo") {
    if (
      env.DEMO_ACCESS_CODE &&
      !safeEqual(
        input.accessCode ??
          input.request.headers.get("x-demo-access-code") ??
          "",
        env.DEMO_ACCESS_CODE,
      )
    )
      throw new AuthorizationError("The demo access code is incorrect.");
    return {
      requestId,
      threadId,
      tenantId: "demo",
      actorId: "demo-evaluator",
      roles: ["founder", "analyst", "admin"],
    };
  }

  const session = await getServerSession(getAuthOptions());
  if (!session?.user) throw new AuthorizationError();
  const requiredRoles = input.roles ?? [];
  if (
    requiredRoles.length &&
    !requiredRoles.some((role) => session.user!.roles.includes(role))
  )
    throw new AuthorizationError("You do not have permission for this action.");
  return {
    requestId,
    threadId,
    tenantId: session.user.tenantId,
    actorId: session.user.id,
    roles: session.user.roles,
  };
}
