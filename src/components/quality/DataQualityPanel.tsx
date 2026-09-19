"use client";

import type { DataQualitySummary } from "@/agent/contracts/response";

export function DataQualityPanel({
  quality,
}: {
  quality: DataQualitySummary;
}) {
  return (
    <aside className={`quality-panel ${quality.status}`}>
      <span className="eyebrow">Data quality</span>
      <p>
        {quality.analyzed} records analyzed
        {quality.excluded ? ` · ${quality.excluded} excluded` : ""}
      </p>
      {quality.issues.length ? (
        <ul>
          {quality.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p>No material caveats on this calculation.</p>
      )}
    </aside>
  );
}
