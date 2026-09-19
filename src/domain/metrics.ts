import {
  addDays,
  differenceInCalendarDays,
  endOfQuarter,
  endOfYear,
  startOfDay,
  startOfQuarter,
  startOfYear,
  subQuarters,
} from "date-fns";
import type { QueryPlan } from "@/agent/queryPlan";
import { METRIC_CATALOG } from "./catalog";
import type {
  DataSnapshot,
  Deal,
  MetricBreakdown,
  MetricResult,
  WorkOrder,
} from "./types";

type RecordWithDimensions = Deal | WorkOrder;

function inBusinessTimezone(now: Date, timezone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return new Date(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
}

function period(
  preset: QueryPlan["timeRange"]["preset"],
  now: Date,
): { start: Date; end: Date } | null {
  if (preset === "all_time") return null;
  if (preset === "this_quarter")
    return { start: startOfQuarter(now), end: endOfQuarter(now) };
  if (preset === "last_quarter") {
    const previous = subQuarters(now, 1);
    return { start: startOfQuarter(previous), end: endOfQuarter(previous) };
  }
  return { start: startOfYear(now), end: endOfYear(now) };
}

function recordDate(record: RecordWithDimensions, metric: QueryPlan["metric"]) {
  if ("stage" in record) {
    return metric === "average_deal_age" || metric === "deal_aging_buckets"
      ? record.createdAt
      : record.closeDate;
  }
  return metric === "average_cycle_time"
    ? record.completedAt
    : record.dueDate ?? record.completedAt;
}

function matches(value: string | null, filter: QueryPlan["filters"][number]) {
  if (!value) return false;
  const actual = value.toLocaleLowerCase();
  const expected = (Array.isArray(filter.value) ? filter.value : [filter.value]).map(
    (entry) => entry.toLocaleLowerCase(),
  );
  if (filter.operator === "contains")
    return expected.some((entry) => actual.includes(entry));
  return expected.includes(actual);
}

function filterRecords<T extends RecordWithDimensions>(
  records: T[],
  plan: QueryPlan,
  now: Date,
): T[] {
  const range = period(plan.timeRange.preset, now);
  return records.filter((record) => {
    if (
      plan.filters.some((filter) => {
        const value =
          filter.field in record
            ? (record[filter.field as keyof T] as string | null)
            : null;
        return !matches(value, filter);
      })
    )
      return false;
    if (!range) return true;
    const date = recordDate(record, plan.metric);
    return Boolean(date && date >= range.start && date <= range.end);
  });
}

function isOpenStage(stage: string | null) {
  return stage !== "closed won" && stage !== "closed lost";
}

function isCompleted(status: string | null) {
  return status === "completed" || status === "cancelled";
}

function calculate(
  metric: QueryPlan["metric"],
  records: RecordWithDimensions[],
  now: Date,
): { value: number | null; excluded: number; currency?: string } {
  if (metric === "deal_count" || metric === "work_order_count")
    return { value: records.length, excluded: 0 };

  if (
    metric === "pipeline_value" ||
    metric === "won_value" ||
    metric === "lost_value"
  ) {
    const deals = (records as Deal[]).filter((deal) =>
      metric === "pipeline_value"
        ? isOpenStage(deal.stage)
        : deal.stage === (metric === "won_value" ? "closed won" : "closed lost"),
    );
    const valid = deals.filter(
      (deal): deal is Deal & { amount: number; currency: string } =>
        deal.amount !== null && deal.currency !== null,
    );
    const currencies = [...new Set(valid.map((deal) => deal.currency))];
    if (currencies.length !== 1)
      return { value: null, excluded: deals.length - valid.length };
    return {
      value: valid.reduce((sum, deal) => sum + deal.amount, 0),
      currency: currencies[0],
      excluded: deals.length - valid.length,
    };
  }

  if (metric === "average_deal_size") {
    const deals = (records as Deal[]).filter((deal) => isOpenStage(deal.stage));
    const valid = deals.filter(
      (deal): deal is Deal & { amount: number; currency: string } =>
        deal.amount !== null && deal.currency !== null,
    );
    const currencies = [...new Set(valid.map((deal) => deal.currency))];
    if (currencies.length !== 1)
      return { value: null, excluded: deals.length - valid.length };
    return {
      value: valid.length
        ? valid.reduce((sum, deal) => sum + deal.amount, 0) / valid.length
        : null,
      currency: currencies[0],
      excluded: deals.length - valid.length,
    };
  }

  if (metric === "win_rate") {
    const deals = records as Deal[];
    const closed = deals.filter((deal) =>
      ["closed won", "closed lost"].includes(deal.stage ?? ""),
    );
    const won = closed.filter((deal) => deal.stage === "closed won");
    return {
      value: closed.length ? (won.length / closed.length) * 100 : null,
      excluded: deals.length - closed.length,
    };
  }

  if (metric === "average_deal_age") {
    const deals = (records as Deal[]).filter((deal) => isOpenStage(deal.stage));
    const ages = deals
      .filter((deal): deal is Deal & { createdAt: Date } => Boolean(deal.createdAt))
      .map((deal) => Math.max(0, differenceInCalendarDays(now, deal.createdAt)));
    return {
      value: ages.length ? ages.reduce((sum, age) => sum + age, 0) / ages.length : null,
      excluded: deals.length - ages.length,
    };
  }

  if (metric === "deal_aging_buckets") {
    const deals = (records as Deal[]).filter((deal) => isOpenStage(deal.stage));
    return {
      value: deals.filter((deal) => deal.createdAt).length,
      excluded: deals.filter((deal) => !deal.createdAt).length,
    };
  }

  if (metric === "stuck_pipeline") {
    const deals = (records as Deal[]).filter((deal) => isOpenStage(deal.stage));
    const today = startOfDay(now);
    return {
      value: deals.filter((deal) => deal.closeDate && deal.closeDate < today).length,
      excluded: deals.filter((deal) => !deal.closeDate).length,
    };
  }

  const workOrders = records as WorkOrder[];
  if (metric === "overdue_work_orders") {
    const dated = workOrders.filter((order) => order.dueDate);
    const today = startOfDay(now);
    return {
      value: dated.filter(
        (order) => !isCompleted(order.status) && order.dueDate! < today,
      ).length,
      excluded: workOrders.length - dated.length,
    };
  }
  if (metric === "due_soon_work_orders") {
    const dated = workOrders.filter((order) => order.dueDate);
    const today = startOfDay(now);
    const horizon = addDays(today, 14);
    return {
      value: dated.filter(
        (order) =>
          !isCompleted(order.status) &&
          order.dueDate! >= today &&
          order.dueDate! <= horizon,
      ).length,
      excluded: workOrders.length - dated.length,
    };
  }
  if (metric === "work_order_value") {
    const valid = workOrders.filter(
      (order): order is WorkOrder & { amount: number; currency: string } =>
        order.amount !== null && order.currency !== null,
    );
    const currencies = [...new Set(valid.map((order) => order.currency))];
    if (currencies.length !== 1)
      return { value: null, excluded: workOrders.length - valid.length };
    return {
      value: valid.reduce((sum, order) => sum + order.amount, 0),
      currency: currencies[0],
      excluded: workOrders.length - valid.length,
    };
  }
  if (metric === "completion_rate") {
    const eligible = workOrders.filter((order) => order.status !== "cancelled");
    const completed = eligible.filter((order) => order.status === "completed");
    return {
      value: eligible.length ? (completed.length / eligible.length) * 100 : null,
      excluded: workOrders.length - eligible.length,
    };
  }
  if (metric === "average_cycle_time") {
    const cycles = workOrders
      .filter(
        (order): order is WorkOrder & { startedAt: Date; completedAt: Date } =>
          Boolean(order.startedAt && order.completedAt),
      )
      .map((order) =>
        Math.max(0, differenceInCalendarDays(order.completedAt, order.startedAt)),
      );
    return {
      value: cycles.length
        ? cycles.reduce((sum, days) => sum + days, 0) / cycles.length
        : null,
      excluded: workOrders.length - cycles.length,
    };
  }
  const linked = workOrders.filter((order) => order.dealId);
  return {
    value: workOrders.length ? (linked.length / workOrders.length) * 100 : null,
    excluded: workOrders.length - linked.length,
  };
}

function dimension(record: RecordWithDimensions, groupBy: NonNullable<QueryPlan["groupBy"]>) {
  const value =
    groupBy in record
      ? (record[groupBy as keyof RecordWithDimensions] as string | null)
      : null;
  return value ?? "Unknown";
}

export function runMetric(
  snapshot: DataSnapshot,
  plan: QueryPlan,
  now = new Date(),
): MetricResult {
  now = inBusinessTimezone(
    now,
    process.env.BUSINESS_TIMEZONE ?? "Asia/Kolkata",
  );
  const definition = METRIC_CATALOG[plan.metric];
  if (plan.metric === "data_quality_summary") {
    const counts = new Map<string, number>();
    for (const warning of snapshot.warnings) {
      const label = warning.code.replaceAll("_", " ");
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return {
      metric: plan.metric,
      title: definition.title,
      value: snapshot.warnings.length,
      unit: "count",
      breakdown: [...counts.entries()]
        .map(([label, value]) => ({ label, value, unit: "count" as const }))
        .sort((a, b) => b.value - a.value)
        .slice(0, plan.limit),
      definition: definition.definition,
      appliedFilters: [],
      sampleSize: snapshot.deals.length + snapshot.workOrders.length,
      excludedCount: 0,
      fetchedAt: snapshot.fetchedAt,
      warnings: snapshot.warnings.map((warning) => warning.message).slice(0, 8),
    };
  }
  const source =
    definition.entity === "deals" ? snapshot.deals : snapshot.workOrders;
  const records = filterRecords(source as RecordWithDimensions[], plan, now);
  const result = calculate(plan.metric, records, now);
  const breakdown: MetricBreakdown[] = [];

  if (plan.metric === "deal_aging_buckets") {
    const buckets = new Map([
      ["0–30 days", 0],
      ["31–60 days", 0],
      ["61–90 days", 0],
      ["90+ days", 0],
    ]);
    for (const deal of (records as Deal[]).filter(
      (candidate) => isOpenStage(candidate.stage) && candidate.createdAt,
    )) {
      const age = Math.max(0, differenceInCalendarDays(now, deal.createdAt!));
      const label =
        age <= 30
          ? "0–30 days"
          : age <= 60
            ? "31–60 days"
            : age <= 90
              ? "61–90 days"
              : "90+ days";
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    }
    breakdown.push(
      ...[...buckets.entries()].map(([label, value]) => ({
        label,
        value,
        unit: "count" as const,
      })),
    );
  } else if (plan.groupBy) {
    const groups = new Map<string, RecordWithDimensions[]>();
    for (const record of records) {
      const key = dimension(record, plan.groupBy);
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    for (const [label, group] of groups) {
      const grouped = calculate(plan.metric, group, now);
      if (grouped.value !== null)
        breakdown.push({
          label,
          value: grouped.value,
          unit: definition.unit,
          currency: grouped.currency,
        });
    }
    breakdown.sort((a, b) => b.value - a.value);
  } else if (
    [
      "pipeline_value",
      "won_value",
      "lost_value",
      "average_deal_size",
      "work_order_value",
    ].includes(plan.metric) &&
    result.value === null
  ) {
    const currencies = new Map<string, RecordWithDimensions[]>();
    for (const record of records) {
      if (!record.currency) continue;
      currencies.set(record.currency, [
        ...(currencies.get(record.currency) ?? []),
        record,
      ]);
    }
    for (const [currency, currencyRecords] of currencies) {
      const grouped = calculate(plan.metric, currencyRecords, now);
      if (grouped.value !== null)
        breakdown.push({
          label: currency,
          value: grouped.value,
          unit: "currency",
          currency,
        });
    }
  }

  const filterLabels = plan.filters.map(
    (filter) =>
      `${filter.field} ${filter.operator} ${
        Array.isArray(filter.value) ? filter.value.join(", ") : filter.value
      }`,
  );
  if (plan.timeRange.preset !== "all_time")
    filterLabels.push(plan.timeRange.preset.replaceAll("_", " "));

  const warningEntity =
    definition.entity === "deals" ? "deal" : "work_order";
  const warnings = snapshot.warnings
    .filter(
      (warning) =>
        warning.entity === warningEntity || warning.entity === "snapshot",
    )
    .map((warning) => warning.message);
  if (result.value === null && breakdown.length > 1)
    warnings.unshift("Values use multiple currencies and were not combined.");
  if (result.excluded)
    warnings.unshift(
      `${result.excluded} record${result.excluded === 1 ? " was" : "s were"} excluded from this calculation.`,
    );

  return {
    metric: plan.metric,
    title: definition.title,
    value: result.value,
    unit: definition.unit,
    currency: result.currency,
    breakdown: breakdown.slice(0, plan.limit),
    definition: definition.definition,
    appliedFilters: filterLabels,
    sampleSize: records.length,
    excludedCount: result.excluded,
    fetchedAt: snapshot.fetchedAt,
    warnings: [...new Set(warnings)].slice(0, 8),
  };
}
