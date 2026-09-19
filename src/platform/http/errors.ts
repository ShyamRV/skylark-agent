import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError } from "@/platform/auth/context";
import { MondayApiError } from "@/lib/monday/client";
import { logger } from "@/platform/observability/logger";

export function apiError(error: unknown, requestId?: string) {
  logger.error({ err: error, requestId }, "API request failed");
  if (error instanceof AuthorizationError)
    return NextResponse.json(
      { type: "error", message: error.message, requestId },
      { status: 401 },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        type: "error",
        message: "The request did not match the required schema.",
        requestId,
      },
      { status: 400 },
    );
  if (error instanceof MondayApiError)
    return NextResponse.json(
      {
        type: "error",
        message: error.retryable
          ? "monday.com is temporarily unavailable. Please retry shortly."
          : "The configured monday.com source could not be read.",
        requestId,
      },
      { status: error.retryable ? 503 : 502 },
    );
  return NextResponse.json(
    {
      type: "error",
      message: "The request could not be completed.",
      requestId,
    },
    { status: 500 },
  );
}
