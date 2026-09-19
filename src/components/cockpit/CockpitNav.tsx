"use client";

import { displayValue } from "./MetricCard";
import type { Result, ViewName } from "./types";

const views: { id: ViewName; label: string; hint: string }[] = [
  { id: "overview", label: "Overview", hint: "Live health" },
  { id: "ask", label: "Ask Skylark", hint: "Explore" },
  { id: "leadership", label: "Leadership", hint: "Prepare update" },
];

export function CockpitNav({
  view,
  onView,
  recent,
  accessCode,
  onAccessCode,
  onNewChat,
  collapsed,
  theme,
  onTheme,
}: {
  view: ViewName;
  onView: (view: ViewName) => void;
  recent: Result[];
  accessCode: string;
  onAccessCode: (value: string) => void;
  onNewChat: () => void;
  collapsed: boolean;
  theme: "light" | "dark";
  onTheme: (theme: "light" | "dark") => void;
}) {
  return (
    <aside id="workspace-sidebar" className={collapsed ? "collapsed" : ""}>
      <div>
        <span className="eyebrow">Workspace</span>
        <h2>Founder cockpit</h2>
        <p>Verified answers across live Deals and Work Orders.</p>
      </div>
      <nav className="view-nav">
        <span className="nav-title">Navigate</span>
        {views.map((item) => (
          <button
            className={view === item.id ? "active" : ""}
            key={item.id}
            onClick={() => onView(item.id)}
            aria-current={view === item.id ? "page" : undefined}
            aria-label={`${item.label}: ${item.hint}`}
          >
            <em>{item.label.slice(0, 1)}</em>
            <span><b>{item.label}</b><small>{item.hint}</small></span>
          </button>
        ))}
      </nav>
      {recent.length > 0 && (
        <section className="recent-kpis">
          <span className="nav-title">Recent KPIs · this session</span>
          {recent.slice(0, 3).map((result) => (
            <div key={result.metric}>
              <span>{result.title}</span>
              <b>{displayValue(result.value, result.unit, result.currency)}</b>
            </div>
          ))}
        </section>
      )}
      <div className="nav-footer">
        <button className="new-chat" onClick={onNewChat} aria-label="Start new conversation">＋ New conversation</button>
        <div className="theme-toggle" role="group" aria-label="Color theme">
          <button
            className={theme === "light" ? "active" : ""}
            onClick={() => onTheme("light")}
            aria-label="Use light mode"
            aria-pressed={theme === "light"}
          >
            <i>☀</i><span>Light</span>
          </button>
          <button
            className={theme === "dark" ? "active" : ""}
            onClick={() => onTheme("dark")}
            aria-label="Use dark mode"
            aria-pressed={theme === "dark"}
          >
            <i>◐</i><span>Dark</span>
          </button>
        </div>
        <label className="access">
          Demo access code <span>optional</span>
          <input
            type="password"
            value={accessCode}
            onChange={(event) => onAccessCode(event.target.value)}
            placeholder="Only if provided"
          />
        </label>
      </div>
    </aside>
  );
}
