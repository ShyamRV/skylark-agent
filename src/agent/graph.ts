import "server-only";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { QueryPlan } from "./queryPlan";
import type { MetricResult, DataSnapshot } from "@/domain/types";
import type { WorkflowName } from "@/domain/workflows";
import {
  workflowFromQuestion,
  workflowPlans,
} from "@/domain/workflows";
import { runMetric } from "@/domain/metrics";
import { planQuestion } from "./planner";
import {
  deterministicLeadershipNarrative,
  deterministicNarrative,
  narrateLeadershipUpdate,
  narrateResult,
} from "./narrator";
import type { AuditSink } from "@/platform/contracts/audit";
import { getAgentCheckpointer } from "./checkpointer";

export type AgentRequestContext = {
  requestId: string;
  tenantId: string;
  actorId: string;
  threadId: string;
  roles: string[];
};

export type AgentResponse = {
  type: "answer" | "workflow" | "clarification" | "unsupported";
  answer?: string;
  message?: string;
  workflow?: WorkflowName;
  plan?: QueryPlan;
  plans?: QueryPlan[];
  result?: MetricResult;
  results?: MetricResult[];
  requestId: string;
};

export type AgentGraphDependencies = {
  loadSnapshot(context: AgentRequestContext): Promise<DataSnapshot>;
  audit: AuditSink;
  recordLineage?(
    context: AgentRequestContext,
    plans: QueryPlan[],
    results: MetricResult[],
  ): Promise<void>;
};

const GraphState = Annotation.Root({
  context: Annotation<AgentRequestContext>,
  question: Annotation<string>,
  requestedWorkflow: Annotation<WorkflowName | undefined>,
  sector: Annotation<string | undefined>,
  explicitPlan: Annotation<QueryPlan | undefined>,
  workflow: Annotation<WorkflowName | undefined>,
  plan: Annotation<QueryPlan | undefined>,
  plans: Annotation<QueryPlan[] | undefined>,
  result: Annotation<MetricResult | undefined>,
  results: Annotation<MetricResult[] | undefined>,
  responseType: Annotation<AgentResponse["type"] | undefined>,
  answer: Annotation<string | undefined>,
  message: Annotation<string | undefined>,
  startedAt: Annotation<number>,
});

type State = typeof GraphState.State;

function numericTokens(value: string) {
  return value.match(/\b\d[\d,.]*%?\b/g)?.map((token) =>
    token.replace(/[,|%]/g, ""),
  ) ?? [];
}

export function narrativeMatchesResults(
  answer: string,
  results: MetricResult[],
) {
  const allowed = new Set(numericTokens(JSON.stringify(results)));
  return numericTokens(answer).every((token) => allowed.has(token));
}

export function createBusinessIntelligenceGraph(
  dependencies: AgentGraphDependencies,
) {
  const graph = new StateGraph(GraphState)
    .addNode("authorize", async (state: State) => {
      if (!state.context.tenantId || !state.context.actorId)
        throw new Error("Authenticated tenant context is required.");
      return { startedAt: state.startedAt || Date.now() };
    })
    .addNode("classify", async (state: State) => ({
      workflow:
        state.requestedWorkflow ?? workflowFromQuestion(state.question) ?? undefined,
    }))
    .addNode("buildWorkflow", async (state: State) => ({
      plans: workflowPlans(state.workflow!, state.sector),
      responseType: "workflow" as const,
    }))
    .addNode("plan", async (state: State) => {
      if (state.explicitPlan)
        return { plan: state.explicitPlan, responseType: "answer" as const };
      const planning = await planQuestion(state.question);
      if (planning.kind === "clarification")
        return {
          responseType: "clarification" as const,
          message: planning.question,
        };
      if (planning.kind === "unsupported")
        return {
          responseType: "unsupported" as const,
          message: planning.reason,
        };
      return { plan: planning.plan, responseType: "answer" as const };
    })
    .addNode("compute", async (state: State) => {
      const snapshot = await dependencies.loadSnapshot(state.context);
      if (state.plans)
        return {
          results: state.plans.map((plan) => runMetric(snapshot, plan)),
        };
      if (!state.plan) throw new Error("A validated query plan is required.");
      return { result: runMetric(snapshot, state.plan) };
    })
    .addNode("narrate", async (state: State) => {
      if (state.results)
        return {
          answer: await narrateLeadershipUpdate(
            state.results,
            state.workflow ? workflowLabel(state.workflow) : "Leadership update",
          ),
        };
      if (!state.result) throw new Error("A verified metric result is required.");
      return { answer: await narrateResult(state.question, state.result) };
    })
    .addNode("verify", async (state: State) => {
      const results = state.results ?? (state.result ? [state.result] : []);
      if (!state.answer || narrativeMatchesResults(state.answer, results))
        return {};
      return {
        answer: state.results
          ? deterministicLeadershipNarrative(
              state.results,
              state.workflow ? workflowLabel(state.workflow) : "Leadership update",
            )
          : deterministicNarrative(state.result!),
      };
    })
    .addNode("audit", async (state: State) => {
      const results = state.results ?? (state.result ? [state.result] : []);
      const plans = state.plans ?? (state.plan ? [state.plan] : []);
      if (results.length && dependencies.recordLineage)
        await dependencies.recordLineage(state.context, plans, results);
      await dependencies.audit.write({
        requestId: state.context.requestId,
        tenantId: state.context.tenantId,
        actorId: state.context.actorId,
        action: state.workflow ?? state.plan?.metric ?? state.responseType ?? "chat",
        outcome: "success",
        durationMs: Date.now() - state.startedAt,
        metadata: {
          responseType: state.responseType ?? "answer",
          resultCount: state.results?.length ?? (state.result ? 1 : 0),
        },
        createdAt: new Date().toISOString(),
      });
      return {};
    })
    .addEdge(START, "authorize")
    .addEdge("authorize", "classify")
    .addConditionalEdges("classify", (state: State) =>
      state.workflow ? "buildWorkflow" : "plan",
    )
    .addEdge("buildWorkflow", "compute")
    .addConditionalEdges("plan", (state: State) =>
      state.plan ? "compute" : "audit",
    )
    .addEdge("compute", "narrate")
    .addEdge("narrate", "verify")
    .addEdge("verify", "audit")
    .addEdge("audit", END);

  return graph.compile({ checkpointer: getAgentCheckpointer() });
}

export async function runBusinessIntelligenceGraph(
  dependencies: AgentGraphDependencies,
  input: {
    context: AgentRequestContext;
    question: string;
    action?: WorkflowName;
    sector?: string;
    plan?: QueryPlan;
  },
): Promise<AgentResponse> {
  const graph = createBusinessIntelligenceGraph(dependencies);
  const state = await graph.invoke(
    {
      context: input.context,
      question: input.question,
      requestedWorkflow: input.action,
      sector: input.sector,
      explicitPlan: input.plan,
      startedAt: Date.now(),
    },
    {
      configurable: {
        thread_id: `${input.context.tenantId}:${input.context.threadId}`.slice(
          0,
          240,
        ),
      },
    },
  );
  return {
    type: state.responseType ?? "answer",
    answer: state.answer,
    message: state.message,
    workflow: state.workflow,
    plan: state.plan,
    plans: state.plans,
    result: state.result,
    results: state.results,
    requestId: state.context.requestId,
  };
}

function workflowLabel(workflow: WorkflowName) {
  return {
    leadership_update: "Leadership update",
    pipeline_review: "Pipeline review",
    delivery_standup: "Delivery stand-up",
    sector_deep_dive: "Sector deep-dive",
    data_quality_review: "Data quality review",
  }[workflow];
}
