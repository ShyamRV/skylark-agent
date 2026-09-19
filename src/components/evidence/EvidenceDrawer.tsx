"use client";

import { useEffect, useState } from "react";
import type { EvidenceSummary } from "@/agent/contracts/response";

type Page = {
  summary: EvidenceSummary;
  page: number;
  total: number;
  records: {
    id: string;
    name: string;
    board: string;
    sector: string | null;
    owner: string | null;
    amount: number | null;
    status: string | null;
  }[];
};

export function EvidenceDrawer({
  requestId,
  accessCode,
  summary,
  onClose,
}: {
  requestId: string;
  accessCode: string;
  summary: EvidenceSummary;
  onClose: () => void;
}) {
  const [page, setPage] = useState<Page | null>(null);

  useEffect(() => {
    fetch(`/api/v2/evidence/${requestId}?page=1`, {
      headers: accessCode ? { "x-demo-access-code": accessCode } : {},
    })
      .then((response) => response.json())
      .then(setPage)
      .catch(() => setPage(null));
  }, [accessCode, requestId]);

  return (
    <aside className="evidence-drawer" role="dialog" aria-label="Calculation evidence">
      <header>
        <div>
          <span className="eyebrow">View calculation</span>
          <h3>{summary.formula}</h3>
        </div>
        <button onClick={onClose} aria-label="Close evidence">×</button>
      </header>
      <p>
        {summary.recordCount} records from {summary.boards.join(" + ")}.{" "}
        {summary.excludedCount} excluded. Fresh as of{" "}
        {new Date(summary.fetchedAt).toLocaleString()}.
      </p>
      <ul>
        {(page?.records ?? []).map((record) => (
          <li key={record.id}>
            <b>{record.name}</b>
            <span>
              {record.board} · {record.status ?? "—"} · {record.sector ?? "Unspecified"}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
