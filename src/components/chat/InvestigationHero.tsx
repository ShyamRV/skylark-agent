"use client";

import { QuickActions, type QuickAction } from "@/components/cockpit/QuickActions";

const launchers: QuickAction[] = [
  { label: "Pipeline", description: "Open value and stages", tone: "lilac", question: "How is our pipeline looking this quarter?" },
  { label: "Revenue", description: "Won value and win rate", tone: "mint", question: "What is our win rate this quarter?" },
  { label: "Stuck deals", description: "Past expected close", tone: "coral", question: "Show stuck pipeline by owner" },
  { label: "Sectors", description: "Concentration and risk", tone: "yellow", question: "Show open pipeline by sector this quarter" },
  { label: "Operations", description: "Overdue delivery work", tone: "mint", question: "Show overdue work orders by owner" },
  { label: "Executive brief", description: "Founder-ready summary", tone: "lilac", question: "Prepare a leadership update", workflow: "leadership_update" },
];

export function InvestigationHero({
  onAction,
}: {
  onAction: (action: QuickAction) => void;
}) {
  return (
    <section className="investigation-hero">
      <span className="eyebrow">Skylark Intelligence</span>
      <h1>What would you like to investigate?</h1>
      <p>Ask a founder question, continue a thread, or start from a live monday.com action.</p>
      <div className="investigation-grid">
        {launchers.map((action) => (
          <button
            key={action.label}
            className={`action-card ${action.tone}`}
            onClick={() => onAction(action)}
          >
            <small>INVESTIGATE</small>
            <strong>{action.label}</strong>
            <span>{action.description}</span>
          </button>
        ))}
      </div>
      <QuickActions onAction={onAction} compact />
    </section>
  );
}
