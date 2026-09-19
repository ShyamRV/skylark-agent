import "server-only";
import { logger } from "@/platform/observability/logger";

const MONDAY_ENDPOINT = "https://api.monday.com/v2";
const API_VERSION = "2026-07";

type GraphQLError = {
  message: string;
  extensions?: { code?: string; retry_in_seconds?: number };
};

export class MondayApiError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly errors: GraphQLError[] = [],
  ) {
    super(message);
    this.name = "MondayApiError";
  }
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function mondayQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  attempts = 3,
  tokenOverride?: string,
): Promise<{ data: T; errors: GraphQLError[] }> {
  const token = tokenOverride ?? process.env.MONDAY_API_TOKEN;
  if (!token) throw new MondayApiError("MONDAY_API_TOKEN is not configured.", false);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(MONDAY_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: token,
          "API-Version": API_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (error) {
      if (attempt < attempts - 1) {
        await wait(300 * 2 ** attempt + Math.random() * 150);
        continue;
      }
      throw new MondayApiError("Could not reach monday.com.", true, [
        { message: error instanceof Error ? error.message : "Network error" },
      ]);
    }

    const body = (await response.json().catch(() => ({}))) as {
      data?: T;
      errors?: GraphQLError[];
    };
    const errors = body.errors ?? [];
    logger.info(
      {
        provider: "monday",
        status: response.status,
        attempt: attempt + 1,
        durationMs: Date.now() - startedAt,
        complexity: response.headers.get("x-complexity"),
        rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
        graphQLErrorCodes: errors.map((error) => error.extensions?.code),
      },
      "monday GraphQL request",
    );
    const retryAfter =
      Number(response.headers.get("retry-after")) ||
      errors[0]?.extensions?.retry_in_seconds ||
      0;
    const retryable =
      response.status === 429 ||
      response.status >= 500 ||
      errors.some((error) =>
        ["ComplexityException", "DAILY_LIMIT_EXCEEDED"].includes(
          error.extensions?.code ?? "",
        ),
      );

    if ((!response.ok || !body.data) && retryable && attempt < attempts - 1) {
      await wait(Math.max(retryAfter * 1_000, 300 * 2 ** attempt));
      continue;
    }
    if (!response.ok || !body.data) {
      throw new MondayApiError(
        errors.map((error) => error.message).join("; ") ||
          `monday.com returned HTTP ${response.status}.`,
        retryable,
        errors,
      );
    }
    return { data: body.data, errors };
  }

  throw new MondayApiError("monday.com request exhausted retries.", true);
}
