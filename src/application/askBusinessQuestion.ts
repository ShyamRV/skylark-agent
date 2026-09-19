import "server-only";
import {
  runBusinessIntelligenceGraph,
  type AgentRequestContext,
} from "@/agent/graph";
import type { QueryPlan } from "@/agent/queryPlan";
import type { WorkflowName } from "@/domain/workflows";
import { PersistentAuditSink } from "@/platform/observability/audit";
import { recordMetricLineage } from "@/platform/observability/lineage";
import { getSnapshotService } from "./snapshotService";

export async function askBusinessQuestion(input: {
  context: AgentRequestContext;
  question: string;
  action?: WorkflowName;
  sector?: string;
  plan?: QueryPlan;
}) {
  const snapshots = getSnapshotService();
  return runBusinessIntelligenceGraph(
    {
      loadSnapshot: (context) => snapshots.getForContext(context),
      audit: new PersistentAuditSink(),
      recordLineage: recordMetricLineage,
    },
    input,
  );
}
