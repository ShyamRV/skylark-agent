import type { QueryPlan } from "./queryPlan";
import type { QueryAnalysis, ConversationContext } from "./contracts/intents";
import type {
  AgentActivityEvent,
  DataQualitySummary,
  InteractiveAgentResponse,
} from "./contracts/response";
import { buildInteractiveActions } from "./actions";
import { selectVisualization } from "./visualization";
import { buildEvidence } from "./evidence";
import type { DataSnapshot, MetricResult } from "@/domain/types";

function formatMetric(
  value: number | null,
  unit: MetricResult["unit"],
  currency?: string,
) {
  if (value === null) return "Split by currency";
  if (unit === "currency")
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency ?? "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "days") return `${value.toFixed(1)} days`;
  return new Intl.NumberFormat("en-IN").format(value);
}

export const ACTIVITY_SCRIPT: AgentActivityEvent[] = [
  { stage: "understanding", label: "Understanding your question", status: "complete" },
  { stage: "intent_identified", label: "Identified the analysis", status: "complete" },
  { stage: "data_retrieved", label: "Retrieved monday.com data", status: "complete" },
  { stage: "records_normalized", label: "Normalized live records", status: "complete" },
  { stage: "metrics_calculated", label: "Calculated verified metrics", status: "complete" },
  { stage: "quality_checked", label: "Checked data quality", status: "complete" },
  { stage: "insight_generated", label: "Generated insights", status: "complete" },
];

export function qualityFromResults(results: MetricResult[]): DataQualitySummary {
  const issues = results.flatMap((result) => result.warnings).slice(0, 8);
  const excluded = results.reduce((sum, result) => sum + result.excludedCount, 0);
  return {
    status: issues.length ? (excluded > 0 ? "warning" : "attention") : "ok",
    analyzed: results.reduce((sum, result) => sum + result.sampleSize, 0),
    excluded,
    issues,
  };
}

export function composeInteractiveResponse(input: {
  type: InteractiveAgentResponse["type"];
  answer?: string;
  message?: string;
  requestId: string;
  threadId: string;
  analysis?: QueryAnalysis;
  context?: ConversationContext;
  results?: MetricResult[];
  plans?: QueryPlan[];
  snapshot?: DataSnapshot;
  tenantId?: string;
}): InteractiveAgentResponse {
  const results = input.results ?? [];
  const evidence =
    input.snapshot && input.tenantId
      ? buildEvidence(
          input.tenantId,
          input.requestId,
          input.snapshot,
          results,
          input.plans ?? [],
        )
      : null;
  return {
    type: input.type,
    answer: input.answer,
    message: input.message,
    requestId: input.requestId,
    threadId: input.threadId,
    analysis: input.analysis,
    context: input.context,
    metrics: results.map((result) => ({
      label: result.title,
      value: formatMetric(result.value, result.unit, result.currency),
      unit: result.unit,
    })),
    visualization: input.analysis
      ? selectVisualization(input.analysis.intent, results)
      : undefined,
    dataQuality: results.length ? qualityFromResults(results) : undefined,
    actions: input.analysis
      ? buildInteractiveActions(
          input.analysis.intent,
          results,
          input.plans?.[0],
        )
      : undefined,
    sources: evidence?.summary,
    activity: ACTIVITY_SCRIPT,
  };
}
