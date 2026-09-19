# Decision Log

## Context and assumptions

The prototype has two separately imported monday.com boards: Deals (sales pipeline) and Work Orders (delivery execution). Board titles and column titles may change, so configuration uses immutable IDs. A stable external deal identifier may not exist on Work Orders; cross-board linkage is therefore reported as coverage rather than assumed.

“This quarter” means the current calendar quarter in `BUSINESS_TIMEZONE` (default `Asia/Kolkata`). Pipeline uses expected close date. Win rate uses only closed-won and closed-lost deals in its denominator. Overdue means due before today and not completed/cancelled. Mixed currencies are never added without an exchange-rate policy.

## Decisions and trade-offs

### Next.js on Vercel

One TypeScript application provides UI, server API, validation, and calculations, making a hosted evaluator link quick to produce. Vercel has simple secret management and good fit for a low-traffic prototype. The trade-off is serverless execution/cache locality; at scale I would ingest into a warehouse and use a shared cache.

### monday GraphQL API, not MCP

The direct API gives explicit pagination, error, version, and complexity control and is straightforward to host. Queries are static and boards are allowlisted. The prototype uses a dedicated user’s personal token because it fits six hours; that token itself is not read-only, so least-privilege board access and an application with no mutations are important. Production should use monday OAuth with `boards:read`, rotating tokens, and durable encrypted token storage.

### Deterministic semantic layer

The model converts natural language into a small validated query plan. TypeScript owns filtering, dates, joins, denominators, and arithmetic. A second model call may summarize only the calculated result. This supports fewer questions than model-generated code or arbitrary GraphQL, but is substantially more auditable and resistant to hallucination and prompt injection.

### Explicit normalization and caveats

Amounts, currencies, date formats, labels, whitespace, aliases, nulls, and unknown statuses are normalized before analysis. Source IDs are preserved. Invalid records stay in the snapshot but are excluded only from metrics requiring the invalid field, with exclusion counts and warnings shown to the user. This is more honest than silently coercing every value and more useful than failing the whole query.

### Short read-through cache

A 60-second in-process cache lowers monday complexity usage and latency. Every answer displays its retrieval time. This accepts brief staleness; leadership BI does not require transaction-level freshness for this assignment.

### Narrow interface

The product is a conversational “founder cockpit,” not a generic dashboard. Suggested questions demonstrate supported capabilities, while each answer exposes definition, filters, sample size, freshness, and quality issues. Conversation history remains in the browser and no user data is persisted.

## Leadership updates interpretation

“Help prepare data for leadership updates” is implemented as a reusable prompt/action that computes the same governed pipeline, win-rate, and overdue-work metrics and produces a copyable brief with four sections: highlights, pipeline, execution, and data caveats/follow-ups. It does not create a separate source of truth or invent period-over-period trends when no prior snapshot exists.

## Security and privacy

Secrets remain server-side and are never prefixed `NEXT_PUBLIC_`. Board text is treated as untrusted data and cannot alter prompts or queries. An optional lightweight demo access code limits casual access to real business data. It is not full authentication; a production system needs SSO, authorization, audit logs, encryption controls, and retention policy.

## Scope cuts

The MVP excludes monday writes, predictions, FX conversion, arbitrary joins, custom metric creation, persistent chats, exports, webhooks, and broad charting. If no stable Deal-to-Work-Order key exists, metrics remain board-specific instead of using fuzzy matching.

## With more time

1. Profile the real workbooks with an automated data-quality report and validate definitions with business owners.
2. Add OAuth, SSO/RBAC, per-user board authorization, audit logs, and shared secrets storage.
3. Add webhooks plus a warehouse/semantic layer for historical snapshots, trends, forecasts, and scalable querying.
4. Build golden-question evaluation covering planner accuracy, metric correctness, narrative faithfulness, latency, and data drift.
5. Add observability for monday complexity/rate headers, model usage, cache behavior, and answer lineage.
6. Add a schema-discovery/setup screen and alerts when configured column IDs/types drift.
