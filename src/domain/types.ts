export type DataWarning = {
  code:
    | "missing_value"
    | "invalid_number"
    | "invalid_date"
    | "unknown_status"
    | "mixed_currency"
    | "unlinked_record"
    | "partial_read";
  entity: "deal" | "work_order" | "snapshot";
  itemId?: string;
  field?: string;
  message: string;
};

export type Deal = {
  id: string;
  name: string;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  sector: string | null;
  owner: string | null;
  createdAt: Date | null;
  closeDate: Date | null;
};

export type WorkOrder = {
  id: string;
  name: string;
  status: string | null;
  amount: number | null;
  currency: string | null;
  sector: string | null;
  owner: string | null;
  dealId: string | null;
  dueDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type DataSnapshot = {
  deals: Deal[];
  workOrders: WorkOrder[];
  warnings: DataWarning[];
  fetchedAt: string;
  source?: {
    adapter: string;
    connectionId: string;
    mappingVersion: number;
  };
};

export type MetricBreakdown = {
  label: string;
  value: number;
  unit: "currency" | "count" | "percent" | "days";
  currency?: string;
};

export type MetricResult = {
  metric: string;
  title: string;
  value: number | null;
  unit: MetricBreakdown["unit"];
  currency?: string;
  breakdown: MetricBreakdown[];
  definition: string;
  appliedFilters: string[];
  sampleSize: number;
  excludedCount: number;
  fetchedAt: string;
  warnings: string[];
};
