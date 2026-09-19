import { z } from "zod";
import { conversationContextSchema, queryAnalysisSchema } from "./intents";

export const activityStages = [
  "understanding",
  "intent_identified",
  "data_retrieved",
  "records_normalized",
  "metrics_calculated",
  "quality_checked",
  "insight_generated",
] as const;

export const agentActivityEventSchema = z.object({
  stage: z.enum(activityStages),
  label: z.string().min(1).max(120),
  status: z.enum(["running", "complete"]),
});

export type AgentActivityEvent = z.infer<typeof agentActivityEventSchema>;

export const interactiveActionSchema = z.object({
  label: z.string().min(1).max(80),
  query: z.string().min(2).max(500),
});

export type InteractiveAction = z.infer<typeof interactiveActionSchema>;

export const visualizationSpecSchema = z.object({
  type: z.enum([
    "metric",
    "table",
    "bar_chart",
    "line_chart",
    "donut",
    "record_list",
    "comparison",
    "executive_summary",
    "text",
  ]),
  title: z.string(),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      unit: z.enum(["currency", "count", "percent", "days"]),
      currency: z.string().optional(),
    }),
  ),
});

export type VisualizationSpec = z.infer<typeof visualizationSpecSchema>;

export const dataQualitySummarySchema = z.object({
  status: z.enum(["ok", "warning", "attention"]),
  analyzed: z.number().int().nonnegative(),
  excluded: z.number().int().nonnegative(),
  issues: z.array(z.string()).max(12),
});

export type DataQualitySummary = z.infer<typeof dataQualitySummarySchema>;

export const evidenceSummarySchema = z.object({
  boards: z.array(z.string()),
  recordCount: z.number().int().nonnegative(),
  excludedCount: z.number().int().nonnegative(),
  formula: z.string(),
  requestId: z.string(),
  fetchedAt: z.string(),
});

export type EvidenceSummary = z.infer<typeof evidenceSummarySchema>;

export const interactiveAgentResponseSchema = z.object({
  type: z.enum(["answer", "workflow", "clarification", "unsupported", "error"]),
  answer: z.string().optional(),
  message: z.string().optional(),
  requestId: z.string(),
  threadId: z.string(),
  analysis: queryAnalysisSchema.optional(),
  context: conversationContextSchema.optional(),
  metrics: z
    .array(
      z.object({
        label: z.string(),
        value: z.union([z.string(), z.number(), z.null()]),
        unit: z.string().optional(),
      }),
    )
    .optional(),
  visualization: visualizationSpecSchema.optional(),
  dataQuality: dataQualitySummarySchema.optional(),
  actions: z.array(interactiveActionSchema).optional(),
  sources: evidenceSummarySchema.optional(),
  activity: z.array(agentActivityEventSchema).optional(),
});

export type InteractiveAgentResponse = z.infer<
  typeof interactiveAgentResponseSchema
>;
