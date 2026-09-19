import { askBusinessQuestion } from "@/application/askBusinessQuestion";
import { chatRequestSchema } from "@/app/api/v1/chat/route";
import { ACTIVITY_SCRIPT } from "@/agent/compose";
import { requireContext } from "@/platform/auth/context";
import { assertSameOrigin } from "@/platform/security/origin";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  assertSameOrigin(request);
  const input = chatRequestSchema.parse(await request.json());
  const context = await requireContext({
    request,
    accessCode: input.accessCode,
    roles: ["founder", "analyst"],
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      try {
        for (const [index, activity] of ACTIVITY_SCRIPT.entries()) {
          send("activity", {
            ...activity,
            status: index === ACTIVITY_SCRIPT.length - 1 ? "running" : "complete",
          });
        }
        const result = await askBusinessQuestion({
          context,
          question: input.question,
          action: input.action,
          sector: input.sector,
          plan: input.plan,
        });
        send("activity", {
          stage: "insight_generated",
          label: "Generated insights",
          status: "complete",
        });
        send("complete", {
          ...result,
          ...(result.interactive ?? {}),
          requestId: result.requestId,
          threadId: result.threadId ?? context.threadId,
        });
      } catch (error) {
        send("error", {
          type: "error",
          message:
            error instanceof Error
              ? "The investigation could not be completed."
              : "The investigation could not be completed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "x-request-id": context.requestId,
      "x-thread-id": context.threadId,
    },
  });
}
