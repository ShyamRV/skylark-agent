# Skylark BI Agent — Project Audit

## Existing architecture

Skylark is a Next.js 16 and TypeScript founder cockpit. The current request path is:

`Cockpit UI → versioned API → LangGraph → validated QueryPlan → monday adapter → normalized snapshot → deterministic metrics → constrained narration → numeric verification`

LangChain and LangGraph are already present. The LLM interprets and narrates; it does not calculate business values.

## Frontend

- `src/app/page.tsx` owns Overview, Ask, and Leadership views, session messages, dashboard loading, theme, mobile settings, and API calls.
- `src/components/cockpit/QuickActions.tsx` contains real workflow and metric prompts.
- `src/components/cockpit/MetricCard.tsx` renders metrics, breakdown bars, filters, freshness, methodology, warnings, and rerun controls.
- `src/components/cockpit/FloatingAgent.tsx` provides the draggable assistant launcher and accessible dialog.
- `src/components/cockpit/RobotScene.tsx` contains the established 3D rig and procedural actions.
- There is no full chart system, streamed activity timeline, evidence drawer, durable browser thread, or clarification-specific renderer yet.

## Agent flow

- `src/agent/graph.ts` implements `authorize → classify → plan/workflow → compute → narrate → verify → audit`.
- `src/agent/planner.ts` uses LangChain structured output with Zod and a deterministic fallback.
- `src/agent/queryPlan.ts` is the governed metric/filter/time contract.
- `src/domain/metrics.ts` is the only business-number calculation layer.
- `src/agent/narrator.ts` receives verified results only and falls back to deterministic narration.
- Postgres checkpointing exists, but the browser does not yet send a stable thread ID and planning does not yet resolve follow-up context.

## monday.com integration

- `src/adapters/monday/adapter.ts` provides discovery, pagination, health checks, mapping-drift detection, and normalization.
- `src/lib/monday/client.ts` pins the monday API version and handles timeout, retry, rate-limit, complexity, and partial GraphQL errors.
- Demo mode uses an environment token; production scaffolding uses read-only OAuth and encrypted credentials.
- Both Deals and Work Orders load into one canonical `DataSnapshot`.
- Existing cross-board support is linkage coverage only; true deterministic joined analysis still needs implementation.

## APIs and platform

- `/api/v1/chat` and `/api/v1/dashboard` are canonical; legacy routes remain compatibility shims.
- Health, readiness, authentication, monday OAuth, and mapping endpoints exist.
- Drizzle schemas cover tenants, users, connections, conversations, audits, snapshots, and lineage.
- Memory and Upstash Redis snapshot repositories exist.
- Production scaffolding is incomplete: migrations, tenant bootstrap, browser sign-in/session UX, mapping editor, evidence storage, and conversation repositories are not fully wired.

## What can be reused

- The deterministic metric engine and catalog.
- Zod query plans and fixed workflow bundles.
- monday pagination, retry, normalization, and warning handling.
- LangGraph dependency injection, audit, lineage, and narration verifier.
- Cockpit shell, visual tokens, MetricCard formatting, QuickActions, 3D rig, drag clamping, accessibility, and reduced-motion behavior.

## What needs modification

- Add explicit business intents and a versioned interactive response contract.
- Add compact conversation context and stable thread IDs.
- Stream safe graph-stage activity without chain-of-thought.
- Add current-month, evidence, exact cross-board metrics, quality summaries, and deterministic drill-down actions.
- Split the large page into focused chat, analytics, action, quality, evidence, and executive components.
- Replace default sleep with an activity-aware robot state machine.

## What must not be touched

- No monday write mutations or broader OAuth scope.
- No LLM arithmetic, arbitrary GraphQL, arbitrary SQL, or code execution.
- Do not replace the established RobotScene rig, assistant position contract, metric formulas, normalization behavior, pagination/retry logic, visual identity, or v1 compatibility routes.
- Do not hardcode assignment spreadsheet records.
