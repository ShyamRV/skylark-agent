import type { DataSnapshot } from "@/domain/types";

export function serializeSnapshot(snapshot: DataSnapshot) {
  return JSON.stringify(snapshot);
}

export function deserializeSnapshot(value: string): DataSnapshot {
  const snapshot = JSON.parse(value) as DataSnapshot & {
    deals: (DataSnapshot["deals"][number] & {
      createdAt: string | null;
      closeDate: string | null;
    })[];
    workOrders: (DataSnapshot["workOrders"][number] & {
      dueDate: string | null;
      startedAt: string | null;
      completedAt: string | null;
    })[];
  };
  return {
    ...snapshot,
    deals: snapshot.deals.map((deal) => ({
      ...deal,
      createdAt: deal.createdAt ? new Date(deal.createdAt) : null,
      closeDate: deal.closeDate ? new Date(deal.closeDate) : null,
    })),
    workOrders: snapshot.workOrders.map((workOrder) => ({
      ...workOrder,
      dueDate: workOrder.dueDate ? new Date(workOrder.dueDate) : null,
      startedAt: workOrder.startedAt ? new Date(workOrder.startedAt) : null,
      completedAt: workOrder.completedAt
        ? new Date(workOrder.completedAt)
        : null,
    })),
  };
}
