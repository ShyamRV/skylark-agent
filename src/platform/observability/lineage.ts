import "server-only";
import type { QueryPlan } from "@/agent/queryPlan";
import type { AgentRequestContext } from "@/agent/graph";
import type { MetricResult } from "@/domain/types";
import { getDatabase, hasDatabase } from "@/platform/db/client";
import { metricLineage } from "@/platform/db/schema";

export async function recordMetricLineage(
  context: AgentRequestContext,
  plans: QueryPlan[],
  results: MetricResult[],
) {
  if (!hasDatabase()) return;
  await getDatabase().insert(metricLineage).values(
    results.map((result, index) => ({
      requestId: context.requestId,
      tenantId: context.tenantId,
      metric: result.metric,
      plan: plans[index] ?? {},
      sampleSize: result.sampleSize,
      excludedCount: result.excludedCount,
      source: {
        fetchedAt: result.fetchedAt,
        warningCount: result.warnings.length,
      },
    })),
  );
}
