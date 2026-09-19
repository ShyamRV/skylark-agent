"use client";

import type { AgentActivityEvent } from "@/agent/contracts/response";

export function AgentActivity({
  events,
}: {
  events: AgentActivityEvent[];
}) {
  if (!events.length) return null;
  return (
    <ol className="agent-activity" aria-label="Agent activity">
      {events.map((event) => (
        <li key={event.stage} className={event.status}>
          <i />
          <span>{event.label}</span>
        </li>
      ))}
    </ol>
  );
}
