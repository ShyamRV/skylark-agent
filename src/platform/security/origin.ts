import "server-only";
import { AuthorizationError } from "@/platform/auth/context";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const target = new URL(request.url).origin;
  if (origin !== target)
    throw new AuthorizationError("Cross-origin requests are not allowed.");
}
