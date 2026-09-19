import { NextResponse } from "next/server";
import { getFounderDashboard } from "@/application/getFounderDashboard";
import { requireContext } from "@/platform/auth/context";
import { apiError } from "@/platform/http/errors";
import { checkRateLimit } from "@/platform/security/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  let requestId = request.headers.get("x-request-id") ?? undefined;
  try {
    const context = await requireContext({
      request,
      roles: ["founder", "analyst"],
    });
    requestId = context.requestId;
    const rate = await checkRateLimit(
      `${context.tenantId}:${context.actorId}:dashboard`,
    );
    if (!rate.success)
      return NextResponse.json(
        { connected: false, message: "Too many requests.", requestId },
        { status: 429 },
      );
    return NextResponse.json(await getFounderDashboard(context), {
      headers: {
        "x-request-id": context.requestId,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return apiError(error, requestId);
  }
}
