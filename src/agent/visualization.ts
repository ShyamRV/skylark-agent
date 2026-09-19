import type { BusinessIntent } from "./contracts/intents";
import type { VisualizationSpec } from "./contracts/response";
import type { MetricResult } from "@/domain/types";

export function selectVisualization(
  intent: BusinessIntent,
  results: MetricResult[],
): VisualizationSpec {
  const primary = results[0];
  if (!primary)
    return { type: "text", title: "Analysis", data: [] };
  if (intent === "EXECUTIVE_SUMMARY")
    return {
      type: "executive_summary",
      title: "Executive business brief",
      data: results.slice(0, 6).map((result) => ({
        label: result.title,
        value: result.value ?? 0,
        unit: result.unit,
        currency: result.currency,
      })),
    };
  if (intent === "CROSS_BOARD_ANALYSIS")
    return {
      type: "comparison",
      title: primary.title,
      data: primary.breakdown,
    };
  if (primary.breakdown.length > 1) {
    const type =
      intent === "WIN_RATE_ANALYSIS" || intent === "DATA_QUALITY"
        ? "donut"
        : "bar_chart";
    return { type, title: primary.title, data: primary.breakdown };
  }
  return {
    type: "metric",
    title: primary.title,
    data: [
      {
        label: primary.title,
        value: primary.value ?? 0,
        unit: primary.unit,
        currency: primary.currency,
      },
    ],
  };
}
