"use client";

import type { WorkflowName } from "@/domain/workflows";

export type QuickAction = {
  label: string;
  description: string;
  tone: string;
  question: string;
  workflow?: WorkflowName;
};

export const quickActions: QuickAction[] = [
  { label: "Pipeline review", description: "Value, aging, stuck deals and win rate", tone: "lilac", question: "Run a pipeline review", workflow: "pipeline_review" },
  { label: "Delivery stand-up", description: "Overdue, due soon and execution speed", tone: "mint", question: "Prepare a delivery stand-up", workflow: "delivery_standup" },
  { label: "Leadership update", description: "Copy-ready founder summary", tone: "yellow", question: "Prepare a leadership update", workflow: "leadership_update" },
  { label: "Data quality", description: "Missing, invalid and unlinked records", tone: "coral", question: "Run a data quality review", workflow: "data_quality_review" },
  { label: "Pipeline by sector", description: "Find concentration across industries", tone: "mint", question: "Show open pipeline by sector this quarter" },
  { label: "Win rate", description: "Closed-won share this quarter", tone: "lilac", question: "What is our win rate this quarter?" },
  { label: "Aging pipeline", description: "Open deals grouped by age", tone: "yellow", question: "Show pipeline aging buckets" },
  { label: "Stuck deals", description: "Open deals past expected close", tone: "coral", question: "Show stuck pipeline by owner" },
  { label: "Overdue by owner", description: "Accountability for late delivery", tone: "lilac", question: "Show overdue work orders by owner" },
  { label: "Due soon", description: "Upcoming work in the next 14 days", tone: "mint", question: "Show work orders due soon by owner" },
];

export function QuickActions({
  onAction,
  compact = false,
}: {
  onAction: (action: QuickAction) => void;
  compact?: boolean;
}) {
  return (
    <section className={`quick-actions ${compact ? "compact" : ""}`}>
      <div className="section-heading">
        <div><span className="eyebrow">One-click analysis</span><h2>Founder actions</h2></div>
        <span>Live monday.com data</span>
      </div>
      <div className="action-grid">
        {(compact ? quickActions.slice(0, 4) : quickActions).map((action) => (
          <button
            className={`action-card ${action.tone}`}
            key={action.label}
            onClick={() => onAction(action)}
          >
            <small>ANALYZE</small>
            <strong>{action.label}</strong>
            <span>{action.description}</span>
            <i>↗</i>
          </button>
        ))}
      </div>
    </section>
  );
}
