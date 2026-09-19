import type { QueryPlan } from "@/agent/queryPlan";
import type { WorkflowName } from "@/domain/workflows";

export type Breakdown = {
  label: string;
  value: number;
  unit: "currency" | "count" | "percent" | "days";
  currency?: string;
};

export type Result = {
  metric: string;
  title: string;
  value: number | null;
  unit: Breakdown["unit"];
  currency?: string;
  breakdown: Breakdown[];
  definition: string;
  appliedFilters: string[];
  sampleSize: number;
  excludedCount: number;
  fetchedAt: string;
  warnings: string[];
};

export type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  type?: string;
  workflow?: WorkflowName;
  result?: Result;
  results?: Result[];
  plan?: QueryPlan;
  plans?: QueryPlan[];
  question?: string;
  error?: boolean;
};

export type DashboardData = {
  connected: boolean;
  message?: string;
  fetchedAt?: string;
  recordCounts?: { deals: number; workOrders: number };
  warningCounts?: Record<string, number>;
  metrics?: Result[];
  source?: {
    adapter: string;
    connectionId: string;
    mappingVersion: number;
  };
};

export type ViewName = "overview" | "ask" | "leadership";
