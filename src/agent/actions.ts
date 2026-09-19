import type { QueryPlan } from "./queryPlan";
import type { BusinessIntent } from "./contracts/intents";
import type { InteractiveAction } from "./contracts/response";
import type { MetricResult } from "@/domain/types";

export function buildInteractiveActions(
  intent: BusinessIntent,
  results: MetricResult[],
  plan?: QueryPlan,
): InteractiveAction[] {
  const sector =
    plan?.filters.find((filter) => filter.field === "sector")?.value ??
    results[0]?.appliedFilters
      .find((filter) => filter.startsWith("sector"))
      ?.split(" ")
      .at(-1);
  const sectorLabel = Array.isArray(sector) ? sector[0] : sector;
  const primary = results[0];

  const actions: InteractiveAction[] = [];
  if (intent === "PIPELINE_ANALYSIS" || intent === "DEAL_ANALYSIS") {
    actions.push(
      { label: "Why is it stuck?", query: "Show stuck pipeline by owner" },
      { label: "By sector", query: "Show open pipeline by sector this quarter" },
      { label: "By owner", query: "Show open pipeline by owner" },
      { label: "Closing this month", query: "What is closing this month?" },
    );
  }
  if (intent === "SECTOR_ANALYSIS" || primary?.breakdown.length) {
    for (const row of primary?.breakdown.slice(0, 3) ?? []) {
      if (!row.label.includes(" · "))
        actions.push({
          label: `Explore ${row.label}`,
          query: `Show ${row.label} pipeline this quarter`,
        });
    }
  }
  if (intent === "STUCK_DEALS") {
    actions.push(
      { label: "By sector", query: "Show stuck pipeline by sector" },
      { label: "By owner", query: "Show stuck pipeline by owner" },
      { label: "Highest value", query: "Show open pipeline by sector" },
    );
  }
  if (intent === "CLOSING_SOON") {
    actions.push(
      {
        label: "By sector",
        query: sectorLabel
          ? `Show ${sectorLabel} deals closing this month`
          : "Show deals closing this month by sector",
      },
      { label: "Stuck deals", query: "Show stuck pipeline by owner" },
    );
  }
  if (intent === "CROSS_BOARD_ANALYSIS") {
    actions.push(
      { label: "Show delayed work orders", query: "Show overdue work orders by owner" },
      { label: "Compare with Energy", query: "Show Energy pipeline and overdue work orders" },
      { label: "Show affected deals", query: "Show stuck pipeline by sector" },
    );
  }
  if (intent === "DATA_QUALITY" || intent === "METRIC_EXPLANATION") {
    actions.push(
      { label: "View details", query: "What data quality issues exist?" },
      { label: "Pipeline trust", query: "Can I trust this pipeline number?" },
    );
  }
  if (intent === "EXECUTIVE_SUMMARY") {
    actions.push(
      { label: "Investigate sales", query: "Run a pipeline review" },
      { label: "Investigate operations", query: "Prepare a delivery stand-up" },
      { label: "Show risks", query: "Which sectors have high pipeline and delayed work orders?" },
      { label: "Refresh", query: "Prepare a leadership update" },
    );
  }
  if (!actions.length) {
    actions.push(
      { label: "By sector", query: "Show open pipeline by sector this quarter" },
      { label: "Data quality", query: "What data quality issues exist?" },
    );
  }
  return uniqueActions(actions).slice(0, 6);
}

function uniqueActions(actions: InteractiveAction[]) {
  return [...new Map(actions.map((action) => [action.query, action])).values()];
}
