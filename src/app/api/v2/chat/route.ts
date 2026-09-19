import { NextResponse } from "next/server";
import { askBusinessQuestion } from "@/application/askBusinessQuestion";
import { chatRequestSchema } from "@/app/api/v1/chat/route";
import { requireContext } from "@/platform/auth/context";
import { apiError } from "@/platform/http/errors";
import { assertSameOrigin } from "@/platform/security/origin";
import { checkRateLimit } from "@/platform/security/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let requestId = request.headers.get("x-request-id") ?? undefined;
  try {
    assertSameOrigin(request);
    const input = chatRequestSchema.parse(await request.json());
    const context = await requireContext({
      request,
      accessCode: input.accessCode,
      roles: ["founder", "analyst"],
    });
    requestId = context.requestId;
    const rate = await checkRateLimit(`${context.tenantId}:${context.actorId}:v2`);
    if (!rate.success)
      return NextResponse.json(
        { type: "error", message: "Too many requests.", requestId },
        { status: 429 },
      );
    const result = await askBusinessQuestion({
      context,
      question: input.question,
      action: input.action,
      sector: input.sector,
      plan: input.plan,
    });
    return NextResponse.json(
      {
        ...result,
        ...(result.interactive ?? {}),
        requestId: result.requestId,
        threadId: result.threadId ?? context.threadId,
      },
      {
        headers: {
          "x-request-id": context.requestId,
          "x-thread-id": context.threadId,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return apiError(error, requestId);
  }
}
