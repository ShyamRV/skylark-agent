// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MetricCard } from "@/components/cockpit/MetricCard";
import type { QueryPlan } from "@/agent/queryPlan";
import type { Result } from "@/components/cockpit/types";

const result: Result = {
  metric: "pipeline_value",
  title: "Open pipeline",
  value: 2_500_000,
  unit: "currency",
  currency: "INR",
  breakdown: [
    { label: "Energy", value: 1_500_000, unit: "currency", currency: "INR" },
    { label: "Mining", value: 1_000_000, unit: "currency", currency: "INR" },
  ],
  definition: "Open deals with a valid amount.",
  appliedFilters: [],
  sampleSize: 8,
  excludedCount: 0,
  fetchedAt: "2026-09-19T06:00:00.000Z",
  warnings: [],
};

const plan: QueryPlan = {
  metric: "pipeline_value",
  filters: [],
  groupBy: "sector",
  timeRange: { preset: "this_quarter" },
  limit: 10,
};

afterEach(cleanup);

describe("metric card controls", () => {
  it("reruns with selected period and grouping controls", async () => {
    const onRerun = vi.fn();
    render(<MetricCard result={result} plan={plan} onRerun={onRerun} />);

    await userEvent.click(screen.getByRole("button", { name: "Last quarter" }));
    expect(onRerun).toHaveBeenCalledWith({
      ...plan,
      timeRange: { preset: "last_quarter" },
    });

    await userEvent.click(screen.getByRole("button", { name: "owner" }));
    expect(onRerun).toHaveBeenLastCalledWith({ ...plan, groupBy: "owner" });
  });

  it("keeps compact cards to one useful breakdown and freshness", () => {
    const { container } = render(<MetricCard result={result} compact />);
    expect(container.querySelectorAll(".breakdown-row")).toHaveLength(1);
    expect(container.querySelector(".compact-freshness")?.textContent).toContain(
      "Updated",
    );
    expect(container.querySelector(".evidence")).toBeNull();
  });
});
