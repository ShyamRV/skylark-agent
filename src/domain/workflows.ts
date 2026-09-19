import { queryPlanSchema, type QueryPlan } from "@/agent/queryPlan";

export const workflowNames = [
  "leadership_update",
  "pipeline_review",
  "delivery_standup",
  "sector_deep_dive",
  "data_quality_review",
] as const;

export type WorkflowName = (typeof workflowNames)[number];

const plan = (input: Partial<QueryPlan> & Pick<QueryPlan, "metric">) =>
  queryPlanSchema.parse(input);

export function workflowPlans(
  workflow: WorkflowName,
  sector?: string,
): QueryPlan[] {
  const sectorFilters = sector
    ? [{ field: "sector" as const, operator: "contains" as const, value: sector }]
    : [];

  if (workflow === "pipeline_review")
    return [
      plan({ metric: "pipeline_value", groupBy: "stage", timeRange: { preset: "this_quarter" } }),
      plan({ metric: "deal_aging_buckets" }),
      plan({ metric: "stuck_pipeline", groupBy: "owner" }),
      plan({ metric: "win_rate", timeRange: { preset: "this_quarter" } }),
    ];
  if (workflow === "delivery_standup")
    return [
      plan({ metric: "overdue_work_orders", groupBy: "owner" }),
      plan({ metric: "due_soon_work_orders", groupBy: "owner" }),
      plan({ metric: "completion_rate", timeRange: { preset: "this_quarter" } }),
      plan({ metric: "average_cycle_time", timeRange: { preset: "this_quarter" } }),
    ];
  if (workflow === "sector_deep_dive")
    return [
      plan({ metric: "pipeline_value", filters: sectorFilters, groupBy: "stage" }),
      plan({ metric: "win_rate", filters: sectorFilters }),
      plan({ metric: "work_order_count", filters: sectorFilters, groupBy: "status" }),
      plan({ metric: "overdue_work_orders", filters: sectorFilters }),
    ];
  if (workflow === "data_quality_review")
    return [
      plan({ metric: "data_quality_summary" }),
      plan({ metric: "linked_coverage" }),
    ];
  return [
    plan({ metric: "pipeline_value", groupBy: "stage", timeRange: { preset: "this_quarter" } }),
    plan({ metric: "win_rate", timeRange: { preset: "this_quarter" } }),
    plan({ metric: "stuck_pipeline", groupBy: "owner" }),
    plan({ metric: "overdue_work_orders", groupBy: "owner" }),
    plan({ metric: "completion_rate", timeRange: { preset: "this_quarter" } }),
  ];
}

export function workflowFromQuestion(question: string): WorkflowName | null {
  if (/pipeline review/i.test(question)) return "pipeline_review";
  if (/delivery stand-?up|operations stand-?up/i.test(question))
    return "delivery_standup";
  if (/sector deep-?dive/i.test(question)) return "sector_deep_dive";
  if (/data quality (review|report)/i.test(question))
    return "data_quality_review";
  if (/leadership update|weekly update|exec(utive)? update/i.test(question))
    return "leadership_update";
  return null;
}
