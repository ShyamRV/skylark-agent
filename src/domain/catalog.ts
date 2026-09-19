export const METRIC_CATALOG = {
  pipeline_value: {
    title: "Open pipeline value",
    entity: "deals",
    definition:
      "Sum of deal amounts not marked closed won or closed lost, after applied filters.",
    unit: "currency",
  },
  deal_count: {
    title: "Deal count",
    entity: "deals",
    definition: "Count of deals after applied filters.",
    unit: "count",
  },
  won_value: {
    title: "Won deal value",
    entity: "deals",
    definition: "Sum of amounts for deals whose normalized stage is closed won.",
    unit: "currency",
  },
  lost_value: {
    title: "Lost deal value",
    entity: "deals",
    definition: "Sum of amounts for deals whose normalized stage is closed lost.",
    unit: "currency",
  },
  average_deal_size: {
    title: "Average open deal size",
    entity: "deals",
    definition:
      "Average amount of open deals with a valid amount and a single currency.",
    unit: "currency",
  },
  win_rate: {
    title: "Closed-deal win rate",
    entity: "deals",
    definition: "Closed won deals divided by all closed won and closed lost deals.",
    unit: "percent",
  },
  average_deal_age: {
    title: "Average open-deal age",
    entity: "deals",
    definition: "Average days since creation for deals that are still open.",
    unit: "days",
  },
  deal_aging_buckets: {
    title: "Open pipeline aging",
    entity: "deals",
    definition:
      "Open deals grouped by days since creation: 0–30, 31–60, 61–90, and 90+ days.",
    unit: "count",
  },
  stuck_pipeline: {
    title: "Stuck pipeline",
    entity: "deals",
    definition:
      "Open deals whose expected close date is earlier than today in the configured business timezone.",
    unit: "count",
  },
  work_order_count: {
    title: "Work order count",
    entity: "work_orders",
    definition: "Count of work orders after applied filters.",
    unit: "count",
  },
  overdue_work_orders: {
    title: "Overdue work orders",
    entity: "work_orders",
    definition:
      "Open work orders with a due date earlier than today in the configured business timezone.",
    unit: "count",
  },
  due_soon_work_orders: {
    title: "Work orders due soon",
    entity: "work_orders",
    definition:
      "Open work orders due from today through the next 14 calendar days.",
    unit: "count",
  },
  work_order_value: {
    title: "Work order value",
    entity: "work_orders",
    definition: "Sum of work-order amounts after applied filters.",
    unit: "currency",
  },
  completion_rate: {
    title: "Work order completion rate",
    entity: "work_orders",
    definition:
      "Completed work orders divided by all non-cancelled work orders after applied filters.",
    unit: "percent",
  },
  average_cycle_time: {
    title: "Average completion cycle time",
    entity: "work_orders",
    definition:
      "Average calendar days from start to completion for completed work orders with both dates.",
    unit: "days",
  },
  linked_coverage: {
    title: "Deal linkage coverage",
    entity: "work_orders",
    definition: "Share of work orders containing a deal identifier.",
    unit: "percent",
  },
  data_quality_summary: {
    title: "Data quality issues",
    entity: "snapshot",
    definition:
      "Count of normalization and source-read warnings in the current snapshot, grouped by warning type.",
    unit: "count",
  },
} as const;

export type MetricName = keyof typeof METRIC_CATALOG;
