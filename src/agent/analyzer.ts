import "server-only";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  queryAnalysisSchema,
  type ConversationContext,
  type QueryAnalysis,
} from "./contracts/intents";
import { createBusinessModel, hasConfiguredModel } from "./model";
import { queryPlanSchema, type PlanningResult, type QueryPlan } from "./queryPlan";
import { fallbackPlan } from "./fallbackPlanner";
import { workflowFromQuestion } from "@/domain/workflows";

const ANALYZER_PROMPT = `Classify a founder BI question into one governed intent.
Return only the requested JSON. Never calculate numbers.
Intents: PIPELINE_ANALYSIS, REVENUE_ANALYSIS, DEAL_ANALYSIS, WIN_RATE_ANALYSIS,
SECTOR_ANALYSIS, OWNER_ANALYSIS, CLOSING_SOON, STUCK_DEALS, WORK_ORDER_ANALYSIS,
OPERATIONAL_PERFORMANCE, CROSS_BOARD_ANALYSIS, DATA_QUALITY, EXECUTIVE_SUMMARY,
METRIC_EXPLANATION, RECORD_LOOKUP.
Set ambiguous true only when sales vs operations vs overall is unclear.
Follow-up questions such as "how much is closing" inherit prior sector/board.
Forecasts and arbitrary record dumps are unsupported via RECORD_LOOKUP only when
the user asks to inspect already-scoped evidence, not invent IDs.`;

export function analyzeQuestionFallback(
  question: string,
  prior: ConversationContext = conversationDefaults(),
): QueryAnalysis {
  const text = question.toLocaleLowerCase();
  const sector =
    text.match(
      /\b(energy|solar|agriculture|infrastructure|mining|utilities|construction)\b/,
    )?.[1] ?? null;
  const followUp = /^(how much|which ones|and closing|by (sector|owner)|why)\b/i.test(
    question.trim(),
  );
  if (/how are we doing|how's business|overall performance/.test(text))
    return {
      intent: "PIPELINE_ANALYSIS",
      board: "both",
      sector,
      owner: null,
      period: "this_quarter",
      ambiguous: true,
      clarification:
        "Do you mean sales pipeline, delivery operations, or overall business performance?",
      followUp,
    };

  let intent: QueryAnalysis["intent"] = "PIPELINE_ANALYSIS";
  let board: QueryAnalysis["board"] = "deals";
  if (/executive|leadership|founder brief/.test(text))
    intent = "EXECUTIVE_SUMMARY";
  else if (/cross.?board|pipeline.*delay|high pipeline.*poor|delayed work/.test(text))
    intent = "CROSS_BOARD_ANALYSIS";
  else if (/data quality|missing data|trust this/.test(text))
    intent = "DATA_QUALITY";
  else if (/how (is|was) .* calculated|explain .*metric|ⓘ/.test(text))
    intent = "METRIC_EXPLANATION";
  else if (/which (deals|records)|show (all|underlying)|view records/.test(text))
    intent = "RECORD_LOOKUP";
  else if (/closing this month|close this month/.test(text))
    intent = "CLOSING_SOON";
  else if (/stuck|past.?close/.test(text)) intent = "STUCK_DEALS";
  else if (/win rate/.test(text)) intent = "WIN_RATE_ANALYSIS";
  else if (/\bwon\b|revenue/.test(text)) intent = "REVENUE_ANALYSIS";
  else if (/overdue|due soon|work order|operations|delivery/.test(text)) {
    intent = /overdue|completion|cycle/.test(text)
      ? "OPERATIONAL_PERFORMANCE"
      : "WORK_ORDER_ANALYSIS";
    board = "work_orders";
  } else if (/by sector|sectors?/.test(text)) intent = "SECTOR_ANALYSIS";
  else if (/by owner/.test(text)) intent = "OWNER_ANALYSIS";

  if (followUp && prior.lastIntent && !sector)
    intent = prior.lastIntent === "CROSS_BOARD_ANALYSIS"
      ? "CLOSING_SOON"
      : prior.lastIntent;

  return {
    intent,
    board: followUp && prior.activeBoard ? prior.activeBoard : board,
    sector: sector ?? (followUp ? prior.activeSector : null),
    owner: followUp ? prior.activeOwner : null,
    period: /this month|current month/.test(text)
      ? "current_month"
      : /this quarter/.test(text)
        ? "this_quarter"
        : /next 30/.test(text)
          ? "next_30_days"
          : followUp && prior.activePeriod
            ? prior.activePeriod
            : /this year/.test(text)
              ? "this_year"
              : "all_time",
    ambiguous: false,
    clarification: null,
    followUp,
  };
}

export async function analyzeQuestion(
  question: string,
  prior: ConversationContext = conversationDefaults(),
): Promise<QueryAnalysis> {
  if (!hasConfiguredModel()) return analyzeQuestionFallback(question, prior);
  try {
    const structured = createBusinessModel(0).withStructuredOutput(
      queryAnalysisSchema,
      { name: "query_analysis", method: "jsonSchema" },
    );
    const parsed = queryAnalysisSchema.parse(
      await structured.invoke([
        new SystemMessage(ANALYZER_PROMPT),
        new HumanMessage(
          JSON.stringify({
            question,
            priorContext: prior,
          }),
        ),
      ]),
    );
    return mergeFollowUp(parsed, prior);
  } catch {
    return analyzeQuestionFallback(question, prior);
  }
}

export function mergeFollowUp(
  analysis: QueryAnalysis,
  prior: ConversationContext,
): QueryAnalysis {
  if (!analysis.followUp) return analysis;
  return {
    ...analysis,
    board: analysis.board === "deals" && prior.activeBoard ? prior.activeBoard : analysis.board,
    sector: analysis.sector ?? prior.activeSector,
    owner: analysis.owner ?? prior.activeOwner,
    period:
      analysis.period === "all_time" && prior.activePeriod
        ? prior.activePeriod
        : analysis.period,
    intent: analysis.intent === "PIPELINE_ANALYSIS" && prior.lastIntent
      ? prior.lastIntent
      : analysis.intent,
  };
}

export function contextFromAnalysis(
  analysis: QueryAnalysis,
  requestId: string,
  metric?: string,
): ConversationContext {
  return {
    activeBoard: analysis.board,
    activeSector: analysis.sector,
    activeOwner: analysis.owner,
    activePeriod: analysis.period,
    lastIntent: analysis.intent,
    lastMetric: metric ?? null,
    lastRequestId: requestId,
  };
}

export function conversationDefaults(): ConversationContext {
  return {
    activeBoard: null,
    activeSector: null,
    activeOwner: null,
    activePeriod: null,
    lastIntent: null,
    lastMetric: null,
    lastRequestId: null,
  };
}

export function planFromAnalysis(analysis: QueryAnalysis): PlanningResult {
  if (analysis.ambiguous && analysis.clarification)
    return { kind: "clarification", question: analysis.clarification };
  if (analysis.intent === "RECORD_LOOKUP" && !analysis.followUp)
    return {
      kind: "unsupported",
      reason:
        "I can open evidence for a calculated answer, but I will not dump arbitrary monday records.",
    };

  const filters: QueryPlan["filters"] = [];
  if (analysis.sector)
    filters.push({
      field: "sector",
      operator: "contains",
      value: analysis.sector,
    });
  if (analysis.owner)
    filters.push({
      field: "owner",
      operator: "contains",
      value: analysis.owner,
    });

  const metric = metricForIntent(analysis);
  const groupBy =
    analysis.intent === "SECTOR_ANALYSIS"
      ? "sector"
      : analysis.intent === "OWNER_ANALYSIS"
        ? "owner"
        : analysis.intent === "PIPELINE_ANALYSIS"
          ? "stage"
          : analysis.intent === "WORK_ORDER_ANALYSIS"
            ? "status"
            : null;

  return {
    kind: "plan",
    plan: queryPlanSchema.parse({
      metric,
      filters,
      groupBy,
      timeRange: { preset: analysis.period },
      limit: 10,
    }),
  };
}

export function metricForIntent(analysis: QueryAnalysis): QueryPlan["metric"] {
  switch (analysis.intent) {
    case "REVENUE_ANALYSIS":
      return "won_value";
    case "WIN_RATE_ANALYSIS":
      return "win_rate";
    case "CLOSING_SOON":
      return "closing_this_month_value";
    case "STUCK_DEALS":
      return "stuck_pipeline";
    case "WORK_ORDER_ANALYSIS":
      return "work_order_count";
    case "OPERATIONAL_PERFORMANCE":
      return "overdue_work_orders";
    case "CROSS_BOARD_ANALYSIS":
      return "sector_execution_risk";
    case "DATA_QUALITY":
    case "METRIC_EXPLANATION":
      return "data_quality_summary";
    case "EXECUTIVE_SUMMARY":
      return "pipeline_value";
    default:
      return "pipeline_value";
  }
}

export function shouldUseWorkflow(question: string) {
  return workflowFromQuestion(question);
}

export function fallbackOrAnalysisPlan(
  question: string,
  analysis: QueryAnalysis,
): PlanningResult {
  if (analysis.ambiguous) return planFromAnalysis(analysis);
  if (
    analysis.intent === "CLOSING_SOON" ||
    analysis.intent === "CROSS_BOARD_ANALYSIS"
  )
    return planFromAnalysis(analysis);
  return fallbackPlan(question);
}