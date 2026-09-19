# Skylark Monday.com BI Agent

A founder-facing conversational BI prototype that reads live Deals and Work Orders boards from monday.com, cleans inconsistent records, calculates business metrics deterministically, and uses an LLM to plan and explain queries.

## Why this architecture

The LLM never writes GraphQL, executes code, or calculates totals. It selects from a fixed metric catalog using a strict JSON schema. The application validates that plan, loads allowlisted monday boards, normalizes the records, computes the answer in tested TypeScript, then gives the model only those verified facts to summarize.

```text
Browser → /api/chat → LLM query planner → Zod validation
                                      ↓
monday GraphQL → normalization → deterministic metrics → answer writer
```

This separation makes wrong answers diagnosable and lets the UI expose the formula, sample size, freshness, exclusions, and source-data warnings.

## Supported questions

- Open pipeline value/count by stage, sector, owner, or currency
- Won/lost value, average deal size, closed-deal win rate
- Average open-deal age, aging buckets, and stuck pipeline
- Work-order count by status, sector, or owner
- Overdue/due-soon work orders, completion rate, delivery value, and cycle time
- Deal-linkage coverage
- Data-quality warning summaries
- Pipeline Review, Delivery Stand-up, Sector Deep-dive, Data Quality Review, and Leadership Update workflows

The founder cockpit includes live overview KPIs, period and grouping controls,
session-recent metrics, retry/new-chat controls, and copy or Markdown export for
leadership updates. All drill-down controls re-query the server-side metric
engine; the browser never recalculates business numbers.

Forecasting, currency conversion, arbitrary joins, and writes to monday.com are intentionally unsupported.

## Configure monday.com

1. Import `Deal funnel Data.xlsx` and `Work_Order_Tracker Data.xlsx` as separate boards.
2. Use monday Date columns for dates, Status for stage/status, Numbers for clean amounts, and Text/Dropdown for sector and external deal ID. Preserve messy source values as Text if monday conversion would discard them.
3. Create a dedicated monday user with access only to these boards. Generate its personal API token. A personal token inherits the user’s permissions; the app enforces read-only behavior by containing only static query operations.
4. Open each column menu and copy its immutable column ID. Board IDs appear in board URLs.
5. Copy `.env.example` to `.env.local`, add the token and board IDs, then replace each mapping value with the real column ID:

```env
MONDAY_DEALS_COLUMNS={"stage":"color_mks...","amount":"numbers_mks...","sector":"dropdown_mks...","closeDate":"date_mks..."}
```

Required deal mappings are `stage`, `amount`, `sector`, and `closeDate`. Required work-order mappings are `status` and `dueDate`; optional keys may be omitted. The defaults are illustrative, not monday display names.

The API client pins monday API `2026-07`, loads every page (250 items per request), retries transient failures, detects GraphQL partial errors, and caches normalized data in-process for 60 seconds.

## Local setup

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. `ASI_ONE_API_KEY` is recommended; the app calls ASI:One through its OpenAI-compatible chat-completions API using `asi1-mini`. Without a key, a limited deterministic intent parser and deterministic narration keep the demo operable. Set `DEMO_ACCESS_CODE` when the real board data should not be publicly exposed.

### Workspace controls

- The left navigation switches between the overview, analysis workspace, and leadership brief. On mobile, workspace settings expose theme, refresh, access-code, and new-conversation controls.
- Theme and assistant position are saved locally. Drag the assistant by the robot or panel header with mouse, pen, or touch; **Reset position** returns it to the lower-right corner.
- The assistant is keyboard accessible, closes with Escape, re-clamps after viewport changes, and pauses WebGL animation when hidden or inactive.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover currency/date/status cleanup, malformed records, time filtering, mixed currencies, overdue logic, metric denominators, assistant viewport clamping, and quick-action integrity. API-shaped test fixtures are synthetic; assignment data is never hardcoded.

## Deploy to Vercel

1. Push this repository to a private Git provider repository.
2. Import it in Vercel as a Next.js project.
3. Add all `.env.example` variables under Project Settings → Environment Variables. Mark tokens and access codes sensitive.
4. Deploy and smoke-test a query that requires more than one monday page if either board has over 250 items.
5. Give evaluators the deployment URL and, if configured, the demo access code separately.

Do not commit `.env.local`, spreadsheets, tokens, real monday payloads, or Vercel metadata. They are ignored by git.

## Metric definitions

- **Open pipeline:** sum of amounts for deals not normalized to `closed won` or `closed lost`.
- **Won value:** sum of `closed won` deal amounts.
- **Win rate:** closed-won deal count divided by closed-won plus closed-lost count.
- **Overdue:** a non-completed/non-cancelled work order whose due date is before today.
- **Cycle time:** calendar days from start date to completion date.
- **This quarter:** the current calendar quarter; deals use expected close date and work orders use due/completion date as applicable.

Missing values are excluded only where required and reported. Unknown labels remain visible as `Unknown`. Multiple currencies are split and never silently added.

## Failure handling and limitations

- monday 429/5xx/network failures get bounded retries and a recoverable UI message.
- HTTP 200 GraphQL errors are inspected; partial reads produce visible caveats.
- A missing/malformed mapping fails clearly rather than guessing by mutable column title.
- The 60-second cache is per server instance; production scale should use a shared cache or warehouse.
- In-memory chat has no persistence. The access-code gate is suitable only for a time-boxed evaluator demo.
- Production should replace a personal token with monday OAuth, add application identity/RBAC, webhooks or incremental ingestion, observability, and a governed semantic layer.

See [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md) for assumptions and trade-offs.
