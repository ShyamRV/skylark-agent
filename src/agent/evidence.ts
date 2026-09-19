import type { QueryPlan } from "./queryPlan";
import type { EvidenceSummary } from "./contracts/response";
import type { DataSnapshot, MetricResult } from "@/domain/types";
import { METRIC_CATALOG } from "@/domain/catalog";

export type EvidenceRecord = {
  id: string;
  name: string;
  board: "Deals" | "Work Orders";
  sector: string | null;
  owner: string | null;
  amount: number | null;
  status: string | null;
};

export type StoredEvidence = {
  tenantId: string;
  requestId: string;
  summary: EvidenceSummary;
  records: EvidenceRecord[];
};

const store = new Map<string, StoredEvidence>();

function key(tenantId: string, requestId: string) {
  return `${tenantId}:${requestId}`;
}

export function buildEvidence(
  tenantId: string,
  requestId: string,
  snapshot: DataSnapshot,
  results: MetricResult[],
  plans: QueryPlan[],
): StoredEvidence {
  const boards = new Set<string>();
  const records: EvidenceRecord[] = [];
  for (const plan of plans) {
    const definition = METRIC_CATALOG[plan.metric];
    if (definition.entity === "deals" || definition.entity === "work_orders") {
      boards.add("Deals");
      for (const deal of snapshot.deals.slice(0, 40)) {
        records.push({
          id: deal.id,
          name: deal.name,
          board: "Deals",
          sector: deal.sector,
          owner: deal.owner,
          amount: deal.amount,
          status: deal.stage,
        });
      }
    }
    if (
      definition.entity === "work_orders"
    ) {
      boards.add("Work Orders");
      for (const order of snapshot.workOrders.slice(0, 40)) {
        records.push({
          id: order.id,
          name: order.name,
          board: "Work Orders",
          sector: order.sector,
          owner: order.owner,
          amount: order.amount,
          status: order.status,
        });
      }
    }
  }
  const unique = [...new Map(records.map((record) => [record.id, record])).values()];
  const excluded = results.reduce((sum, result) => sum + result.excludedCount, 0);
  const summary: EvidenceSummary = {
    boards: [...boards],
    recordCount: unique.length,
    excludedCount: excluded,
    formula: results[0]?.definition ?? "Governed catalog calculation.",
    requestId,
    fetchedAt: snapshot.fetchedAt,
  };
  const stored = { tenantId, requestId, summary, records: unique };
  store.set(key(tenantId, requestId), stored);
  return stored;
}

export function getEvidencePage(
  tenantId: string,
  requestId: string,
  page = 1,
  pageSize = 10,
) {
  const stored = store.get(key(tenantId, requestId));
  if (!stored) return null;
  const start = Math.max(0, (page - 1) * pageSize);
  return {
    summary: stored.summary,
    page,
    pageSize,
    total: stored.records.length,
    records: stored.records.slice(start, start + pageSize),
  };
}


