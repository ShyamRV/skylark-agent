import { queryPlanSchema, type PlanningResult, type QueryPlan } from "./queryPlan";

export function fallbackPlan(question: string): PlanningResult {
  const text = question.toLocaleLowerCase();
  if (/\b(forecast|predict|probability|next year)\b/.test(text))
    return {
      kind: "unsupported",
      reason: "Forecasting is outside the verified metric catalog for this prototype.",
    };

  let metric: QueryPlan["metric"] = "pipeline_value";
  if (/win rate/.test(text)) metric = "win_rate";
  else if (/\bwon\b.*(value|revenue)|revenue.*\bwon\b/.test(text)) metric = "won_value";
  else if (/lost.*(value|revenue)|value.*lost/.test(text)) metric = "lost_value";
  else if (/average deal (size|value)/.test(text)) metric = "average_deal_size";
  else if (/aging bucket|pipeline aging/.test(text)) metric = "deal_aging_buckets";
  else if (/deal age|average.*age/.test(text)) metric = "average_deal_age";
  else if (/stuck|past.*close|missed.*close/.test(text)) metric = "stuck_pipeline";
  else if (/cycle|completion time/.test(text)) metric = "average_cycle_time";
  else if (/due soon|next 14 days/.test(text)) metric = "due_soon_work_orders";
  else if (/overdue/.test(text)) metric = "overdue_work_orders";
  else if (/work order.*value|delivery value/.test(text)) metric = "work_order_value";
  else if (/completion rate/.test(text)) metric = "completion_rate";
  else if (/data quality|quality issue/.test(text)) metric = "data_quality_summary";
  else if (/link(age|ed)/.test(text)) metric = "linked_coverage";
  else if (/work order/.test(text)) metric = "work_order_count";
  else if (/deal count|how many deals/.test(text)) metric = "deal_count";

  const filters: QueryPlan["filters"] = [];
  const sector = text.match(
    /\b(energy|solar|agriculture|infrastructure|mining|utilities|construction)\b/,
  )?.[1];
  if (sector) filters.push({ field: "sector", operator: "contains", value: sector });

  let groupBy: QueryPlan["groupBy"] = null;
  if (/by stage|pipeline looking/.test(text)) groupBy = "stage";
  else if (/by (sector|industry)/.test(text)) groupBy = "sector";
  else if (/by (owner|salesperson)/.test(text)) groupBy = "owner";
  else if (/by status/.test(text)) groupBy = "status";

  return {
    kind: "plan",
    plan: queryPlanSchema.parse({
      metric,
      filters,
      groupBy,
      timeRange: {
        preset: text.includes("this quarter")
          ? "this_quarter"
          : text.includes("last quarter")
            ? "last_quarter"
            : text.includes("this year")
              ? "this_year"
              : "all_time",
      },
      limit: 10,
    }),
  };
}
