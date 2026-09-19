import { NextResponse } from "next/server";
import { z } from "zod";
import { askBusinessQuestion } from "@/application/askBusinessQuestion";
import { queryPlanSchema } from "@/agent/queryPlan";
import { workflowNames } from "@/domain/workflows";
import { requireContext } from "@/platform/auth/context";
import { apiError } from "@/platform/http/errors";
import { assertSameOrigin } from "@/platform/security/origin";
import { checkRateLimit } from "@/platform/security/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export const chatRequestSchema = z.object({
  question: z.string().trim().min(2).max(500),
  accessCode: z.string().max(100).optional(),
  action: z.enum(workflowNames).optional(),
  sector: z.string().trim().min(1).max(100).optional(),
  plan: queryPlanSchema.optional(),
});

export async function POST(request: Request) {
  let requestId = request.headers.get("x-request-id") ?? undefined;
  try {
    assertSameOrigin(request);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 32_000)
      return NextResponse.json(
        { type: "error", message: "Request body is too large." },
        { status: 413 },
      );
    const input = chatRequestSchema.parse(await request.json());
    const context = await requireContext({
      request,
      accessCode: input.accessCode,
      roles: ["founder", "analyst"],
    });
    requestId = context.requestId;
    const rate = await checkRateLimit(
      `${context.tenantId}:${context.actorId}:chat`,
    );
    if (!rate.success)
      return NextResponse.json(
        {
          type: "error",
          message: "Too many requests. Please retry shortly.",
          requestId,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rate.reset - Date.now()) / 1000)) },
        },
      );
    const result = await askBusinessQuestion({
      context,
      question: input.question,
      action: input.action,
      sector: input.sector,
      plan: input.plan,
    });
    return NextResponse.json(result, {
      headers: {
        "x-request-id": context.requestId,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error, requestId);
  }
}
