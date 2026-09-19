import { z } from "zod";

export const metricNames = [
  "pipeline_value",
  "deal_count",
  "won_value",
  "lost_value",
  "average_deal_size",
  "win_rate",
  "average_deal_age",
  "deal_aging_buckets",
  "stuck_pipeline",
  "work_order_count",
  "overdue_work_orders",
  "due_soon_work_orders",
  "work_order_value",
  "completion_rate",
  "average_cycle_time",
  "linked_coverage",
  "data_quality_summary",
] as const;

export const queryPlanSchema = z.object({
  metric: z.enum(metricNames),
  filters: z
    .array(
      z.object({
        field: z.enum(["sector", "stage", "status", "owner"]),
        operator: z.enum(["equals", "contains", "in"]),
        value: z.union([z.string(), z.array(z.string()).max(20)]),
      }),
    )
    .max(8)
    .default([]),
  groupBy: z
    .enum(["sector", "stage", "status", "owner", "currency"])
    .nullable()
    .default(null),
  timeRange: z
    .object({
      preset: z.enum(["all_time", "this_quarter", "last_quarter", "this_year"]),
    })
    .default({ preset: "all_time" }),
  limit: z.number().int().min(1).max(20).default(10),
});

export type QueryPlan = z.infer<typeof queryPlanSchema>;

export type PlanningResult =
  | { kind: "plan"; plan: QueryPlan }
  | { kind: "clarification"; question: string }
  | { kind: "unsupported"; reason: string };
