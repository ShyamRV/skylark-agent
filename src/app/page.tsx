"use client";

import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { QueryPlan } from "@/agent/queryPlan";
import { CockpitNav } from "@/components/cockpit/CockpitNav";
import { FloatingAgent } from "@/components/cockpit/FloatingAgent";
import { IntegrationSettings } from "@/components/cockpit/IntegrationSettings";
import { MetricCard } from "@/components/cockpit/MetricCard";
import {
  QuickActions,
  type QuickAction,
} from "@/components/cockpit/QuickActions";
import type {
  DashboardData,
  Message,
  ViewName,
} from "@/components/cockpit/types";
import type { WorkflowName } from "@/domain/workflows";

function downloadMarkdown(message: Message) {
  try {
    const results = message.results ?? (message.result ? [message.result] : []);
    const markdown = [
      `# ${message.type === "workflow" ? "Founder brief" : "Skylark analysis"}`,
      "",
      message.text,
      "",
      ...results.flatMap((result) => [
        `## ${result.title}`,
        `${result.value ?? "Split by currency"} ${result.unit}`,
        "",
        result.definition,
        "",
        `Data as of: ${result.fetchedAt}`,
        result.warnings.length ? `Caveats: ${result.warnings.join(" ")}` : "",
        "",
      ]),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    link.download = `skylark-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
    return true;
  } catch {
    return false;
  }
}

export default function Home() {
  const [view, setView] = useState<ViewName>("overview");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const prepared = document.documentElement.dataset.theme;
    if (prepared === "light" || prepared === "dark") return prepared;
    const saved = localStorage.getItem("skylark-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [committedAccessCode, setCommittedAccessCode] = useState("");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const mobileSettingsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("skylark-theme", theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setCommittedAccessCode(accessCode), 500);
    return () => clearTimeout(timer);
  }, [accessCode]);

  useEffect(() => {
    if (!mobileSettingsOpen) return;
    const frame = requestAnimationFrame(() =>
      mobileSettingsRef.current?.querySelector<HTMLElement>("button")?.focus(),
    );
    const close = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMobileSettingsOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", close);
    };
  }, [mobileSettingsOpen]);

  function trapMobileSettingsFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab" || !mobileSettingsRef.current) return;
    const controls = Array.from(
      mobileSettingsRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      ),
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const recent = useMemo(() => {
    const results = messages
      .flatMap((message) => message.results ?? (message.result ? [message.result] : []))
      .reverse();
    return [...new Map(results.map((result) => [result.metric, result])).values()];
  }, [messages]);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const response = await fetch("/api/v1/dashboard", {
        headers: committedAccessCode
          ? { "x-demo-access-code": committedAccessCode }
          : {},
        cache: "no-store",
      });
      setDashboard(await response.json());
    } catch {
      setDashboard({ connected: false, message: "The dashboard service could not be reached." });
    } finally {
      setDashboardLoading(false);
    }
  }, [committedAccessCode]);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/dashboard", {
      headers: committedAccessCode
        ? { "x-demo-access-code": committedAccessCode }
        : {},
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((body) => {
        if (active) setDashboard(body);
      })
      .catch(() => {
        if (active)
          setDashboard({
            connected: false,
            message: "The dashboard service could not be reached.",
          });
      })
      .finally(() => {
        if (active) setDashboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [committedAccessCode]);

  async function ask(
    value: string,
    options: { workflow?: WorkflowName; plan?: QueryPlan; sector?: string } = {},
  ) {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    const userId = Date.now();
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: trimmed, question: trimmed },
    ]);
    setQuestion("");
    setLoading(true);
    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          accessCode: committedAccessCode || undefined,
          action: options.workflow,
          sector: options.sector,
          plan: options.plan,
        }),
      });
      const body = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: userId + 1,
          role: "assistant",
          type: body.type,
          workflow: body.workflow,
          text: body.answer ?? body.message ?? "I could not answer that question.",
          result: body.result,
          results: body.results,
          plan: body.plan,
          plans: body.plans,
          question: trimmed,
          error: !response.ok || body.type === "error",
        },
      ]);
      if (response.ok) void loadDashboard();
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: userId + 1,
          role: "assistant",
          type: "error",
          text: "The service could not be reached. Please try again.",
          question: trimmed,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function runAction(action: QuickAction) {
    if (action.workflow === "leadership_update") setView("leadership");
    else setView("ask");
    void ask(action.question, { workflow: action.workflow });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  async function copyAnswer(message: Message) {
    try {
      await navigator.clipboard.writeText(message.text);
      setToast("Answer copied");
    } catch {
      setToast("Clipboard access was blocked");
    }
    setTimeout(() => setToast(null), 2200);
  }

  function downloadAnswer(message: Message) {
    setToast(downloadMarkdown(message) ? "Download started" : "Download failed");
    setTimeout(() => setToast(null), 2200);
  }

  const leadershipMessages = messages.filter(
    (message) =>
      message.type === "workflow" && message.workflow === "leadership_update",
  );

  return (
    <div
      data-theme={theme}
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      suppressHydrationWarning
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            aria-controls="workspace-sidebar"
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
          <div className="brand">
            <span className="brand-mark">SK</span>
            <div><b>Skylark</b><small>Business intelligence</small></div>
          </div>
        </div>
        <div className="header-actions">
          <button className="refresh" onClick={() => void loadDashboard()} disabled={dashboardLoading}>
            {dashboardLoading ? "Checking…" : "Refresh"}
          </button>
          <button className="refresh" onClick={() => setIntegrationOpen(true)}>
            Integrations
          </button>
          <div className={`live ${dashboard?.connected ? "connected" : "disconnected"}`}>
            <span /> {dashboard?.connected ? "monday.com connected" : "Source needs attention"}
          </div>
          <button className="profile" onClick={() => setView("leadership")} aria-label="Open leadership workspace">Brief</button>
          <button
            className="mobile-settings-trigger"
            onClick={() => setMobileSettingsOpen((current) => !current)}
            aria-label="Open mobile settings"
            aria-expanded={mobileSettingsOpen}
          >
            •••
          </button>
        </div>
      </header>

      {mobileSettingsOpen && (
        <>
        <button
          className="mobile-settings-backdrop"
          onClick={() => setMobileSettingsOpen(false)}
          aria-label="Close workspace settings"
          tabIndex={-1}
        />
        <section
          ref={mobileSettingsRef}
          className="mobile-settings"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-settings-title"
          onKeyDown={trapMobileSettingsFocus}
        >
          <div>
            <b id="mobile-settings-title">Workspace settings</b>
            <button onClick={() => setMobileSettingsOpen(false)} aria-label="Close settings">×</button>
          </div>
          <div className="mobile-theme">
            <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}>Light</button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}>Dark</button>
          </div>
          <label>
            Demo access code
            <input
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              placeholder="Only if provided"
            />
          </label>
          <div className="mobile-settings-actions">
            <button onClick={() => void loadDashboard()}>Refresh data</button>
            <button onClick={() => { setIntegrationOpen(true); setMobileSettingsOpen(false); }}>Integrations</button>
            <button onClick={() => { setMessages([]); setView("ask"); setMobileSettingsOpen(false); }}>New conversation</button>
          </div>
        </section>
        </>
      )}

      <div className="shell" id="workspace-shell">
        <CockpitNav
          view={view}
          onView={setView}
          recent={recent}
          accessCode={accessCode}
          onAccessCode={setAccessCode}
          onNewChat={() => { setMessages([]); setView("ask"); }}
          collapsed={sidebarCollapsed}
          theme={theme}
          onTheme={setTheme}
        />

        <main id="main-content" className="conversation" tabIndex={-1}>
          {view === "overview" && (
            <div className="overview-page">
              <div className="page-heading">
                <div><span className="eyebrow">Live overview</span><h1>Good decisions start here.</h1></div>
                <p>One trusted view of sales pipeline, delivery execution, and source-data quality.</p>
              </div>
              {!dashboard?.connected && !dashboardLoading && (
                <div className="source-alert">
                  <div><b>Connect your monday boards</b><span>{dashboard?.message}</span></div>
                  <button onClick={() => void loadDashboard()}>Try again</button>
                </div>
              )}
              <div
                className="kpi-grid"
                aria-busy={dashboardLoading}
                aria-label={dashboardLoading ? "Loading business metrics" : "Business metrics"}
              >
                {dashboardLoading
                  ? Array.from({ length: 6 }).map((_, index) => <div className="kpi-skeleton" key={index} />)
                  : dashboard?.metrics?.map((result) => (
                      <MetricCard result={result} compact key={result.metric} />
                    ))}
              </div>
              {dashboard?.recordCounts && (
                <div className="data-strip">
                  <div><small>DEALS READ</small><b>{dashboard.recordCounts.deals}</b></div>
                  <div><small>WORK ORDERS READ</small><b>{dashboard.recordCounts.workOrders}</b></div>
                  <div><small>FRESHNESS</small><b>{dashboard.fetchedAt ? new Date(dashboard.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</b></div>
                  <div><small>SOURCE</small><b>{dashboard.source?.adapter ?? "monday"} · read-only</b></div>
                </div>
              )}
              <QuickActions onAction={runAction} />
            </div>
          )}

          {view === "ask" && (
            <>
              {messages.length === 0 ? (
                <div className="ask-empty">
                  <div className="hero-copy">
                    <span className="eyebrow">Ask Skylark</span>
                    <h1>Your business,<br />in one question.</h1>
                    <p>Ask about pipeline, sectors, revenue, work orders, owners, dates, or data quality.</p>
                  </div>
                  <QuickActions onAction={runAction} compact />
                </div>
              ) : (
                <div className="messages" aria-live="polite" aria-busy={loading}>
                  {messages.map((message) => (
                    <article className={`message ${message.role} ${message.error ? "error" : ""}`} key={message.id}>
                      <span className="avatar">{message.role === "user" ? "You" : "S"}</span>
                      <div className="message-content">
                        <p className="message-label">{message.role === "user" ? "You" : "Skylark intelligence"}</p>
                        <p className="answer">{message.text}</p>
                        {message.result && (
                          <MetricCard
                            result={message.result}
                            plan={message.plan}
                            onRerun={(plan) => void ask(`Refresh ${message.result!.title}`, { plan })}
                          />
                        )}
                        {message.results?.map((result, index) => (
                          <MetricCard
                            key={`${message.id}-${result.metric}`}
                            result={result}
                            plan={message.plans?.[index]}
                            onRerun={(plan) => void ask(`Refresh ${result.title}`, { plan })}
                          />
                        ))}
                        {message.role === "assistant" && (
                          <div className="message-actions">
                            <button onClick={() => void copyAnswer(message)}>Copy answer</button>
                            {(message.result || message.results) && <button onClick={() => downloadAnswer(message)}>Download .md</button>}
                            {message.error && message.question && <button onClick={() => void ask(message.question!)}>Retry</button>}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                  {loading && (
                    <article className="message assistant">
                      <span className="avatar">S</span>
                      <div className="thinking"><i /><i /><i /><span>Reading both boards and checking the numbers</span></div>
                    </article>
                  )}
                </div>
              )}
              <form className="composer" onSubmit={submit}>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void ask(question);
                    }
                  }}
                  placeholder="Ask about pipeline, sectors, work orders or revenue…"
                  aria-label="Ask Skylark a business question"
                  aria-describedby="composer-help"
                  rows={2}
                />
                <button type="submit" disabled={!question.trim() || loading} aria-label="Send question">↑</button>
                <small id="composer-help">Answers include definitions, freshness and data-quality caveats.</small>
              </form>
            </>
          )}

          {view === "leadership" && (
            <div className="leadership-page">
              <div className="leadership-hero">
                <div><span className="eyebrow">Leadership workspace</span><h1>Turn live data into the next update.</h1><p>Generate a concise, copy-ready brief using verified pipeline, win-rate, delivery and quality metrics.</p></div>
                <button disabled={loading} onClick={() => void ask("Prepare a leadership update", { workflow: "leadership_update" })}>
                  {loading ? "Preparing…" : "Prepare update"} <span>↗</span>
                </button>
              </div>
              {leadershipMessages.length ? (
                leadershipMessages.slice().reverse().map((message) => (
                  <article className="leadership-brief" key={message.id}>
                    <div className="brief-header"><span>Generated brief</span><div><button onClick={() => void copyAnswer(message)}>Copy</button><button onClick={() => downloadAnswer(message)}>Download .md</button></div></div>
                    <p>{message.text}</p>
                    <div className="brief-metrics">
                      {message.results?.map((result) => <MetricCard result={result} compact key={result.metric} />)}
                    </div>
                  </article>
                ))
              ) : (
                <div className="leadership-empty"><b>No brief generated in this session</b><span>Use the button above to prepare one from current monday.com data.</span></div>
              )}
            </div>
          )}
        </main>
      </div>

      <FloatingAgent
        connected={Boolean(dashboard?.connected)}
        loading={loading}
        onAsk={(prompt) => {
          setView("ask");
          void ask(prompt);
        }}
      />

      {integrationOpen && (
        <IntegrationSettings
          dashboard={dashboard}
          onClose={() => setIntegrationOpen(false)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      <nav className="mobile-nav">
        {(["overview", "ask", "leadership"] as ViewName[]).map((item) => (
          <button
            className={view === item ? "active" : ""}
            key={item}
            onClick={() => setView(item)}
            aria-current={view === item ? "page" : undefined}
          >
            {item === "ask" ? "Ask" : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
    </div>
  );
}
