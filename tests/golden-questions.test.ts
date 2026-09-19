import { describe, expect, it } from "vitest";
import { fallbackPlan } from "@/agent/fallbackPlanner";
import { workflowFromQuestion } from "@/domain/workflows";

const goldenQuestions = [
  {
    question: "How is our pipeline looking for energy sector this quarter?",
    metric: "pipeline_value",
    groupBy: "stage",
    preset: "this_quarter",
    filter: "energy",
  },
  {
    question: "What is our win rate this quarter?",
    metric: "win_rate",
    preset: "this_quarter",
  },
  {
    question: "Show overdue work orders by owner",
    metric: "overdue_work_orders",
    groupBy: "owner",
  },
  {
    question: "How much delivery value is in work orders?",
    metric: "work_order_value",
  },
] as const;

describe("founder-question acceptance contract", () => {
  it.each(goldenQuestions)("plans $question", (expected) => {
    const result = fallbackPlan(expected.question);
    expect(result.kind).toBe("plan");
    if (result.kind !== "plan") return;
    expect(result.plan.metric).toBe(expected.metric);
    if ("groupBy" in expected) expect(result.plan.groupBy).toBe(expected.groupBy);
    if ("preset" in expected)
      expect(result.plan.timeRange.preset).toBe(expected.preset);
    if ("filter" in expected)
      expect(result.plan.filters).toContainEqual(
        expect.objectContaining({ field: "sector", value: expected.filter }),
      );
  });

  it("routes leadership preparation to the governed workflow", () => {
    expect(
      workflowFromQuestion("Prepare the founder leadership update"),
    ).toBe("leadership_update");
  });

  it("rejects forecasting rather than inventing an answer", () => {
    expect(fallbackPlan("Forecast next year's revenue").kind).toBe("unsupported");
  });
});
