import "server-only";
import type { AgentRequestContext } from "@/agent/graph";
import { queryPlanSchema } from "@/agent/queryPlan";
import { runMetric } from "@/domain/metrics";
import { getSnapshotService } from "./snapshotService";

export async function getFounderDashboard(context: AgentRequestContext) {
  const snapshot = await getSnapshotService().getForContext(context);
  const plans = [
    queryPlanSchema.parse({
      metric: "pipeline_value",
      groupBy: "stage",
      timeRange: { preset: "this_quarter" },
    }),
    queryPlanSchema.parse({
      metric: "win_rate",
      timeRange: { preset: "this_quarter" },
    }),
    queryPlanSchema.parse({ metric: "stuck_pipeline", groupBy: "owner" }),
    queryPlanSchema.parse({ metric: "overdue_work_orders", groupBy: "owner" }),
    queryPlanSchema.parse({
      metric: "completion_rate",
      timeRange: { preset: "this_quarter" },
    }),
    queryPlanSchema.parse({ metric: "data_quality_summary" }),
  ];
  const warningCounts = Object.fromEntries(
    snapshot.warnings.reduce((counts, warning) => {
      counts.set(warning.code, (counts.get(warning.code) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()),
  );
  return {
    connected: true,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
    recordCounts: {
      deals: snapshot.deals.length,
      workOrders: snapshot.workOrders.length,
    },
    warningCounts,
    metrics: plans.map((plan) => runMetric(snapshot, plan)),
  };
}
