import { z } from "zod";

export const businessIntents = [
  "PIPELINE_ANALYSIS",
  "REVENUE_ANALYSIS",
  "DEAL_ANALYSIS",
  "WIN_RATE_ANALYSIS",
  "SECTOR_ANALYSIS",
  "OWNER_ANALYSIS",
  "CLOSING_SOON",
  "STUCK_DEALS",
  "WORK_ORDER_ANALYSIS",
  "OPERATIONAL_PERFORMANCE",
  "CROSS_BOARD_ANALYSIS",
  "DATA_QUALITY",
  "EXECUTIVE_SUMMARY",
  "METRIC_EXPLANATION",
  "RECORD_LOOKUP",
] as const;

export const businessIntentSchema = z.enum(businessIntents);
export type BusinessIntent = z.infer<typeof businessIntentSchema>;

export const boardScopeSchema = z.enum(["deals", "work_orders", "both"]);
export type BoardScope = z.infer<typeof boardScopeSchema>;

export const queryAnalysisSchema = z.object({
  intent: businessIntentSchema,
  board: boardScopeSchema.default("deals"),
  sector: z.string().min(1).max(80).nullable().default(null),
  owner: z.string().min(1).max(80).nullable().default(null),
  period: z
    .enum([
      "all_time",
      "this_quarter",
      "last_quarter",
      "this_year",
      "current_month",
      "next_30_days",
    ])
    .default("all_time"),
  ambiguous: z.boolean().default(false),
  clarification: z.string().nullable().default(null),
  followUp: z.boolean().default(false),
});

export type QueryAnalysis = z.infer<typeof queryAnalysisSchema>;

export const conversationContextSchema = z.object({
  activeBoard: boardScopeSchema.nullable().default(null),
  activeSector: z.string().nullable().default(null),
  activeOwner: z.string().nullable().default(null),
  activePeriod: queryAnalysisSchema.shape.period.nullable().default(null),
  lastIntent: businessIntentSchema.nullable().default(null),
  lastMetric: z.string().nullable().default(null),
  lastRequestId: z.string().nullable().default(null),
});

export type ConversationContext = z.infer<typeof conversationContextSchema>;
