import { NextResponse } from "next/server";
import { getEvidencePage } from "@/agent/evidence";
import { requireContext } from "@/platform/auth/context";
import { apiError } from "@/platform/http/errors";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function GET(request: Request, route: RouteContext) {
  try {
    const context = await requireContext({
      request,
      roles: ["founder", "analyst"],
    });
    const { requestId } = await route.params;
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const evidence = getEvidencePage(context.tenantId, requestId, page, 10);
    if (!evidence)
      return NextResponse.json(
        { type: "error", message: "Evidence is no longer available." },
        { status: 404 },
      );
    return NextResponse.json(evidence, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
