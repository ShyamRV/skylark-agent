"use client";

import type { VisualizationSpec } from "@/agent/contracts/response";

export function BreakdownChart({ spec }: { spec: VisualizationSpec }) {
  const maximum = Math.max(...spec.data.map((item) => item.value), 1);
  if (spec.type === "donut") {
    return (
      <div className="donut-chart" role="img" aria-label={spec.title}>
        {spec.data.slice(0, 5).map((item) => (
          <div key={item.label}>
            <b>{item.label}</b>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="bar-chart" role="img" aria-label={spec.title}>
      <strong>{spec.title}</strong>
      {spec.data.map((item) => (
        <div className="breakdown-row" key={item.label}>
          <div className="breakdown-label">
            <span>{item.label}</span>
            <b>{item.value}</b>
          </div>
          <div className="bar">
            <span style={{ width: `${Math.max(4, (item.value / maximum) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
