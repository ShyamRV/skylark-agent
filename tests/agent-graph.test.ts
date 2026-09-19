import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  narrativeMatchesResults,
  runBusinessIntelligenceGraph,
} from "@/agent/graph";
import { queryPlanSchema } from "@/agent/queryPlan";
import { resetServerEnvForTests } from "@/config/env";
import type { DataSnapshot, MetricResult } from "@/domain/types";

const snapshot: DataSnapshot = {
  deals: [
    {
      id: "d1",
      name: "Energy deal",
      stage: "qualified",
      amount: 1_000_000,
      currency: "INR",
      sector: "energy",
      owner: "A",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      closeDate: new Date("2026-12-01T00:00:00Z"),
    },
  ],
  workOrders: [],
  warnings: [],
  fetchedAt: "2026-09-19T00:00:00Z",
};

beforeEach(() => {
  delete process.env.ASI_ONE_API_KEY;
  process.env.APP_ENV = "demo";
  resetServerEnvForTests();
});

describe("LangGraph business intelligence orchestration", () => {
  it("executes only validated plans through deterministic metrics", async () => {
    const audit = { write: vi.fn(async () => undefined) };
    const response = await runBusinessIntelligenceGraph(
      { loadSnapshot: vi.fn(async () => snapshot), audit },
      {
        context: {
          requestId: "r1",
          tenantId: "demo",
          actorId: "founder",
          threadId: "thread-1",
          roles: ["founder"],
        },
        question: "What is open pipeline?",
        plan: queryPlanSchema.parse({
          metric: "pipeline_value",
          timeRange: { preset: "all_time" },
        }),
      },
    );
    expect(response.type).toBe("answer");
    expect(response.result?.value).toBe(1_000_000);
    expect(response.answer).toContain("Open pipeline value");
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "r1",
        action: "pipeline_value",
        outcome: "success",
      }),
    );
  });

  it("rejects numbers not present in verified metric evidence", () => {
    const result = {
      metric: "deal_count",
      title: "Deals",
      value: 12,
      unit: "count",
      breakdown: [],
      definition: "Count of deals.",
      appliedFilters: [],
      sampleSize: 12,
      excludedCount: 0,
      fetchedAt: "2026-09-19T00:00:00Z",
      warnings: [],
    } satisfies MetricResult;
    expect(narrativeMatchesResults("There are 12 deals.", [result])).toBe(true);
    expect(narrativeMatchesResults("There are 999 deals.", [result])).toBe(
      false,
    );
  });
});
