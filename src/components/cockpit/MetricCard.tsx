"use client";

import { useState } from "react";
import type { QueryPlan } from "@/agent/queryPlan";
import type { Result } from "./types";

export function displayValue(
  value: number | null,
  unit: Result["unit"],
  currency?: string,
) {
  if (value === null) return "Split by currency";
  if (unit === "currency")
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency ?? "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "days") return `${value.toFixed(1)} days`;
  return new Intl.NumberFormat("en-IN").format(value);
}

const dealMetrics = new Set([
  "pipeline_value",
  "deal_count",
  "won_value",
  "lost_value",
  "average_deal_size",
  "win_rate",
  "average_deal_age",
  "deal_aging_buckets",
  "stuck_pipeline",
]);

export function MetricCard({
  result,
  plan,
  compact = false,
  onRerun,
}: {
  result: Result;
  plan?: QueryPlan;
  compact?: boolean;
  onRerun?: (plan: QueryPlan) => void;
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const maximum = Math.max(...result.breakdown.map((item) => item.value), 1);
  const groupOptions = dealMetrics.has(result.metric)
    ? ["stage", "sector", "owner", "currency"]
    : ["status", "sector", "owner", "currency"];
  const periods = [
    ["this_quarter", "This quarter"],
    ["last_quarter", "Last quarter"],
    ["this_year", "This year"],
    ["all_time", "All time"],
  ] as const;

  async function copy(withMethodology: boolean) {
    const breakdown = result.breakdown
      .map(
        (item) =>
          `- ${item.label}: ${displayValue(item.value, item.unit, item.currency)}`,
      )
      .join("\n");
    const text = [
      `${result.title}: ${displayValue(result.value, result.unit, result.currency)}`,
      breakdown,
      withMethodology ? `Methodology: ${result.definition}` : "",
      withMethodology ? `Data as of: ${result.fetchedAt}` : "",
      withMethodology && result.warnings.length
        ? `Caveats: ${result.warnings.join(" ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
    setTimeout(() => setCopyStatus(null), 1800);
  }

  return (
    <section className={`metric-detail ${compact ? "compact" : ""}`}>
      <div className="metric-headline">
        <div>
          <span className="eyebrow">Verified metric</span>
          <h3>{result.title}</h3>
        </div>
        <strong>{displayValue(result.value, result.unit, result.currency)}</strong>
      </div>
      {result.breakdown.length > 0 && (
        <div className="breakdown">
          {(compact ? result.breakdown.slice(0, 1) : result.breakdown).map((item) => (
            <div className="breakdown-row" key={`${item.label}-${item.currency ?? ""}`}>
              <div className="breakdown-label">
                <span>{item.label}</span>
                <b>{displayValue(item.value, item.unit, item.currency)}</b>
              </div>
              <div className="bar">
                <span
                  style={{
                    width: `${Math.max(3, (item.value / maximum) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {!compact && plan && onRerun && result.metric !== "data_quality_summary" && (
        <div className="result-controls">
          <span>Period</span>
          {periods.map(([value, label]) => (
            <button
              className={plan.timeRange.preset === value ? "selected" : ""}
              key={value}
              onClick={() =>
                onRerun({
                  ...plan,
                  timeRange: { preset: value },
                })
              }
            >
              {label}
            </button>
          ))}
          <span>Group</span>
          <button
            className={plan.groupBy === null ? "selected" : ""}
            onClick={() => onRerun({ ...plan, groupBy: null })}
          >
            Total
          </button>
          {groupOptions.map((group) => (
            <button
              className={plan.groupBy === group ? "selected" : ""}
              key={group}
              onClick={() =>
                onRerun({
                  ...plan,
                  groupBy: group as QueryPlan["groupBy"],
                })
              }
            >
              {group}
            </button>
          ))}
        </div>
      )}
      {compact ? (
        <p className="compact-freshness">
          Updated {new Date(result.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      ) : (
        <div className="evidence">
          <span>{result.sampleSize} records</span>
          <span>Updated {new Date(result.fetchedAt).toLocaleString()}</span>
          {result.appliedFilters.map((filter) => <span key={filter}>{filter}</span>)}
        </div>
      )}
      {!compact && (
        <div className="card-actions">
          <button onClick={() => void copy(false)}>Copy metric</button>
          <button onClick={() => void copy(true)}>Copy with methodology</button>
          {copyStatus && <span role="status">{copyStatus}</span>}
        </div>
      )}
      {!compact && (
        <details>
          <summary>Definition & data quality</summary>
          <p>{result.definition}</p>
          {result.warnings.map((warning) => (
            <p className="warning" key={warning}>{warning}</p>
          ))}
        </details>
      )}
    </section>
  );
}
