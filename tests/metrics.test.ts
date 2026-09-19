import { describe, expect, it } from "vitest";
import { queryPlanSchema } from "@/agent/queryPlan";
import { runMetric } from "@/domain/metrics";
import type { DataSnapshot, Deal, WorkOrder } from "@/domain/types";

const deal = (partial: Partial<Deal> & Pick<Deal, "id">): Deal => ({
  id: partial.id,
  name: partial.name ?? partial.id,
  stage: partial.stage ?? "qualified",
  amount: partial.amount ?? 100,
  currency: partial.currency ?? "INR",
  sector: partial.sector ?? "energy",
  owner: partial.owner ?? "Asha",
  createdAt: partial.createdAt ?? new Date("2026-07-01"),
  closeDate: partial.closeDate ?? new Date("2026-09-20"),
});

const order = (partial: Partial<WorkOrder> & Pick<WorkOrder, "id">): WorkOrder => ({
  id: partial.id,
  name: partial.name ?? partial.id,
  status: partial.status ?? "in progress",
  amount: partial.amount ?? null,
  currency: partial.currency ?? null,
  sector: partial.sector ?? "energy",
  owner: partial.owner ?? "Ravi",
  dealId: partial.dealId === undefined ? null : partial.dealId,
  dueDate: partial.dueDate === undefined ? new Date("2026-09-01") : partial.dueDate,
  startedAt: partial.startedAt === undefined ? null : partial.startedAt,
  completedAt: partial.completedAt === undefined ? null : partial.completedAt,
});

const snapshot = (deals: Deal[], workOrders: WorkOrder[] = []): DataSnapshot => ({
  deals,
  workOrders,
  warnings: [],
  fetchedAt: "2026-09-19T00:00:00.000Z",
});

describe("metric engine", () => {
  it("filters sector and excludes closed deals from pipeline", () => {
    const result = runMetric(
      snapshot([
        deal({ id: "1", amount: 200 }),
        deal({ id: "2", stage: "closed won", amount: 500 }),
        deal({ id: "3", sector: "mining", amount: 900 }),
      ]),
      queryPlanSchema.parse({
        metric: "pipeline_value",
        filters: [{ field: "sector", operator: "equals", value: "energy" }],
        groupBy: "stage",
        timeRange: { preset: "this_quarter" },
      }),
      new Date("2026-09-19"),
    );
    expect(result.value).toBe(200);
    expect(result.sampleSize).toBe(2);
    expect(result.breakdown).toEqual([
      { label: "qualified", value: 200, unit: "currency", currency: "INR" },
    ]);
  });

  it("does not combine mixed currencies", () => {
    const result = runMetric(
      snapshot([
        deal({ id: "1", currency: "INR", amount: 100 }),
        deal({ id: "2", currency: "USD", amount: 50 }),
      ]),
      queryPlanSchema.parse({ metric: "pipeline_value" }),
    );
    expect(result.value).toBeNull();
    expect(result.breakdown.map((entry) => entry.currency)).toEqual(["INR", "USD"]);
    expect(result.warnings[0]).toContain("multiple currencies");
  });

  it("counts only overdue open work orders", () => {
    const result = runMetric(
      snapshot([], [
        order({ id: "1", dueDate: new Date("2026-09-01") }),
        order({ id: "2", status: "completed", dueDate: new Date("2026-09-01") }),
        order({ id: "3", dueDate: new Date("2026-10-01") }),
        order({ id: "4", dueDate: null }),
      ]),
      queryPlanSchema.parse({ metric: "overdue_work_orders" }),
      new Date("2026-09-19"),
    );
    expect(result.value).toBe(1);
  });

  it("uses only closed deals in the win-rate denominator", () => {
    const result = runMetric(
      snapshot([
        deal({ id: "1", stage: "closed won" }),
        deal({ id: "2", stage: "closed lost" }),
        deal({ id: "3", stage: "qualified" }),
      ]),
      queryPlanSchema.parse({ metric: "win_rate" }),
    );
    expect(result.value).toBe(50);
    expect(result.excludedCount).toBe(1);
  });

  it("calculates lost value and average open deal size", () => {
    const data = snapshot([
      deal({ id: "1", stage: "closed lost", amount: 300 }),
      deal({ id: "2", amount: 100 }),
      deal({ id: "3", amount: 200 }),
    ]);
    expect(
      runMetric(data, queryPlanSchema.parse({ metric: "lost_value" })).value,
    ).toBe(300);
    expect(
      runMetric(data, queryPlanSchema.parse({ metric: "average_deal_size" }))
        .value,
    ).toBe(150);
  });

  it("creates open-deal aging buckets and finds stuck pipeline", () => {
    const data = snapshot([
      deal({
        id: "1",
        createdAt: new Date("2026-09-01"),
        closeDate: new Date("2026-09-10"),
      }),
      deal({
        id: "2",
        createdAt: new Date("2026-07-01"),
        closeDate: new Date("2026-10-01"),
      }),
      deal({
        id: "3",
        stage: "closed won",
        createdAt: new Date("2026-01-01"),
      }),
    ]);
    const aging = runMetric(
      data,
      queryPlanSchema.parse({ metric: "deal_aging_buckets" }),
      new Date("2026-09-19T12:00:00Z"),
    );
    expect(aging.breakdown.map((entry) => entry.value)).toEqual([1, 0, 1, 0]);
    expect(
      runMetric(
        data,
        queryPlanSchema.parse({ metric: "stuck_pipeline" }),
        new Date("2026-09-19T12:00:00Z"),
      ).value,
    ).toBe(1);
  });

  it("calculates due-soon work, completion rate, and work-order value", () => {
    const data = snapshot([], [
      order({
        id: "1",
        status: "completed",
        amount: 200,
        currency: "INR",
        dueDate: new Date("2026-09-19"),
      }),
      order({
        id: "2",
        status: "in progress",
        amount: 300,
        currency: "INR",
        dueDate: new Date("2026-09-25"),
      }),
      order({
        id: "3",
        status: "cancelled",
        amount: 100,
        currency: "INR",
        dueDate: new Date("2026-09-22"),
      }),
    ]);
    const now = new Date("2026-09-19T06:00:00Z");
    expect(
      runMetric(data, queryPlanSchema.parse({ metric: "due_soon_work_orders" }), now)
        .value,
    ).toBe(1);
    expect(
      runMetric(data, queryPlanSchema.parse({ metric: "completion_rate" }), now)
        .value,
    ).toBe(50);
    expect(
      runMetric(data, queryPlanSchema.parse({ metric: "work_order_value" }), now)
        .value,
    ).toBe(600);
  });

  it("summarizes data-quality warnings by type", () => {
    const data = snapshot([]);
    data.warnings = [
      {
        code: "invalid_date",
        entity: "deal",
        message: "Bad date",
      },
      {
        code: "invalid_date",
        entity: "work_order",
        message: "Another bad date",
      },
      {
        code: "unlinked_record",
        entity: "work_order",
        message: "Missing link",
      },
    ];
    const result = runMetric(
      data,
      queryPlanSchema.parse({ metric: "data_quality_summary" }),
    );
    expect(result.value).toBe(3);
    expect(result.breakdown[0]).toMatchObject({
      label: "invalid date",
      value: 2,
    });
  });
});
