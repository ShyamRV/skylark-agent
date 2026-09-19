"use client";

import { useEffect, useRef } from "react";
import type { DashboardData } from "./types";

export function IntegrationSettings({
  dashboard,
  onClose,
}: {
  dashboard: DashboardData | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      dialog.current?.querySelector<HTMLElement>("button, a")?.focus(),
    );
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  return (
    <>
      <button
        className="integration-backdrop"
        onClick={onClose}
        aria-label="Close integrations"
        tabIndex={-1}
      />
      <div
        ref={dialog}
        className="integration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="integration-title"
      >
        <header>
          <div>
            <span className="eyebrow">Admin settings</span>
            <h2 id="integration-title">Data integrations</h2>
          </div>
          <button onClick={onClose} aria-label="Close integrations">×</button>
        </header>
        <section className="integration-card">
          <div>
            <span className={`source-dot ${dashboard?.connected ? "online" : ""}`} />
            <div>
              <b>monday.com</b>
              <small>Deals and Work Orders · boards:read only</small>
            </div>
          </div>
          <dl>
            <div><dt>Status</dt><dd>{dashboard?.connected ? "Connected" : "Needs attention"}</dd></div>
            <div><dt>Mapping</dt><dd>Version {dashboard?.source?.mappingVersion ?? "—"}</dd></div>
            <div><dt>Freshness</dt><dd>{dashboard?.fetchedAt ? new Date(dashboard.fetchedAt).toLocaleString() : "Not loaded"}</dd></div>
          </dl>
          <a className="integration-connect" href="/api/v1/connections/monday/authorize">
            {dashboard?.connected ? "Reconnect monday.com" : "Connect monday.com"}
          </a>
        </section>
        <p className="integration-note">
          OAuth credentials are encrypted at rest. Skylark requests no board-write permission.
        </p>
      </div>
    </>
  );
}
