"use client";

import type { InteractiveAgentResponse } from "@/agent/contracts/response";
import type { Message } from "@/components/cockpit/types";
import { MetricCard } from "@/components/cockpit/MetricCard";
import { BreakdownChart } from "@/components/analytics/BreakdownChart";
import { DataQualityPanel } from "@/components/quality/DataQualityPanel";
import type { QueryPlan } from "@/agent/queryPlan";

export function InteractiveAnswer({
  message,
  interactive,
  onAsk,
  onRerun,
  onEvidence,
}: {
  message: Message;
  interactive?: InteractiveAgentResponse;
  onAsk: (query: string) => void;
  onRerun?: (plan: QueryPlan) => void;
  onEvidence?: (requestId: string) => void;
}) {
  const results = message.results ?? (message.result ? [message.result] : []);
  return (
    <article className="interactive-answer">
      {message.type === "clarification" && (
        <p className="clarification">{message.text}</p>
      )}
      <p className="answer">{message.text}</p>
      {results[0] && (
        <MetricCard
          result={results[0]}
          plan={message.plan}
          onRerun={onRerun}
        />
      )}
      {results.slice(1).map((result) => (
        <MetricCard result={result} compact key={result.metric} />
      ))}
      {interactive?.visualization &&
        interactive.visualization.data.length > 1 && (
          <BreakdownChart spec={interactive.visualization} />
        )}
      {interactive?.dataQuality && (
        <DataQualityPanel quality={interactive.dataQuality} />
      )}
      {interactive?.actions && (
        <div className="answer-actions">
          {interactive.actions.map((action) => (
            <button key={action.query} type="button" onClick={() => onAsk(action.query)}>
              {action.label}
            </button>
          ))}
        </div>
      )}
      {interactive?.sources && (
        <button
          className="source-link"
          type="button"
          onClick={() => onEvidence?.(interactive.sources!.requestId)}
        >
          View calculation · {interactive.sources.recordCount} records
        </button>
      )}
    </article>
  );
}
