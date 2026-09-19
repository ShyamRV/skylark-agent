import { describe, expect, it } from "vitest";
import { fallbackPlan } from "@/agent/fallbackPlanner";
import { queryPlanSchema } from "@/agent/queryPlan";
import { workflowFromQuestion, workflowPlans } from "@/domain/workflows";

describe("query planning", () => {
  it("maps founder questions to new governed metrics", () => {
    const aging = fallbackPlan("Show pipeline aging buckets");
    const dueSoon = fallbackPlan("What work orders are due soon by owner?");
    const quality = fallbackPlan("Give me a data quality report");
    expect(aging.kind === "plan" && aging.plan.metric).toBe("deal_aging_buckets");
    expect(dueSoon.kind === "plan" && dueSoon.plan).toMatchObject({
      metric: "due_soon_work_orders",
      groupBy: "owner",
    });
    expect(quality.kind === "plan" && quality.plan.metric).toBe(
      "data_quality_summary",
    );
  });

  it("rejects unsupported forecasts and invalid plan values", () => {
    expect(fallbackPlan("Predict revenue next year").kind).toBe("unsupported");
    expect(() =>
      queryPlanSchema.parse({ metric: "invented_metric" }),
    ).toThrow();
  });

  it("builds fixed validated workflow bundles", () => {
    expect(workflowFromQuestion("Run a pipeline review")).toBe("pipeline_review");
    expect(workflowPlans("delivery_standup").map((plan) => plan.metric)).toEqual([
      "overdue_work_orders",
      "due_soon_work_orders",
      "completion_rate",
      "average_cycle_time",
    ]);
    expect(
      workflowPlans("sector_deep_dive", "energy")[0].filters[0],
    ).toMatchObject({ field: "sector", value: "energy" });
  });
});
