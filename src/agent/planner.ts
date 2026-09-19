import "server-only";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { createBusinessModel, hasConfiguredModel } from "./model";
import {
  metricNames,
  queryPlanSchema,
  type PlanningResult,
} from "./queryPlan";
import { fallbackPlan } from "./fallbackPlanner";

const SYSTEM_PROMPT = `You plan founder-facing BI questions against a fixed governed metric catalog.
Never perform arithmetic and never request raw records.
Metrics: ${metricNames.join(", ")}.
Filter fields: sector, stage, status, owner. Group fields additionally include currency.
Use this_quarter when the user says this quarter. Use all_time if no period is given.
Pipeline means open pipeline_value. For "how is pipeline looking", group by stage.
Data quality questions map to data_quality_summary. Aging questions map to
deal_aging_buckets. Stuck or past-close deals map to stuck_pipeline. Due soon maps
to due_soon_work_orders. Forecasting, predictions, unrelated knowledge, and
arbitrary record extraction are unsupported. Ask one concise clarification only
when metric, period, or entity ambiguity materially changes the answer.`;

const planningOutputSchema = z.object({
  kind: z.enum(["plan", "clarification", "unsupported"]),
  plan: queryPlanSchema.nullable(),
  question: z.string().nullable(),
  reason: z.string().nullable(),
});

const governedFallbackPattern =
  /data quality|quality issues?|aging buckets?|pipeline aging|stuck (pipeline|deals?)|past[- ]close|due soon|next 14 days|completion rate|average deal (size|value)|lost (deal )?(value|revenue)|work order value|delivery value/i;

export async function planQuestion(question: string): Promise<PlanningResult> {
  if (!hasConfiguredModel() || governedFallbackPattern.test(question))
    return fallbackPlan(question);

  try {
    const structured = createBusinessModel(0).withStructuredOutput(
      planningOutputSchema,
      {
        name: "bi_query_plan",
        method: "jsonSchema",
      },
    );
    const parsed = await structured.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(question),
    ]);
    if (parsed.kind === "clarification")
      return {
        kind: "clarification",
        question: parsed.question ?? "Which metric and period should I use?",
      };
    if (parsed.kind === "unsupported")
      return {
        kind: "unsupported",
        reason:
          parsed.reason ??
          "That question is outside the supported metric catalog.",
      };
    if (!parsed.plan)
      return {
        kind: "clarification",
        question: "Which business metric should I calculate?",
      };
    return { kind: "plan", plan: queryPlanSchema.parse(parsed.plan) };
  } catch {
    return fallbackPlan(question);
  }
}
