import { isValid, parse } from "date-fns";
import type { BoardConfig } from "@/config/boards";
import type {
  MondayColumnValue,
  MondayItem,
} from "@/adapters/monday/types";
import type { DataSnapshot, DataWarning, Deal, WorkOrder } from "./types";

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "dd-MM-yyyy",
  "d MMM yyyy",
  "MMM d, yyyy",
  "yyyy/MM/dd",
];

const STAGE_ALIASES: Record<string, string> = {
  won: "closed won",
  "closed-won": "closed won",
  lost: "closed lost",
  "closed-lost": "closed lost",
  qualification: "qualified",
  proposal: "proposal sent",
};

const STATUS_ALIASES: Record<string, string> = {
  done: "completed",
  complete: "completed",
  "in-progress": "in progress",
  wip: "in progress",
  open: "not started",
};

function clean(value: string | null | undefined): string | null {
  const result = value?.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  return result ? result : null;
}

export function normalizeLabel(
  value: string | null | undefined,
  aliases: Record<string, string> = {},
): string | null {
  const normalized = clean(value)?.toLocaleLowerCase();
  return normalized ? (aliases[normalized] ?? normalized) : null;
}

export function parseDateValue(value: string | null | undefined): Date | null {
  const text = clean(value);
  if (!text) return null;

  const iso = new Date(text);
  if (/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text) && isValid(iso)) return iso;

  for (const format of DATE_FORMATS) {
    const candidate = parse(text, format, new Date(2000, 0, 1));
    if (isValid(candidate)) return candidate;
  }
  return null;
}

export function parseAmount(value: string | null | undefined): {
  amount: number | null;
  currency: string | null;
} {
  const text = clean(value);
  if (!text) return { amount: null, currency: null };

  const currency =
    text.match(/\b(?:INR|USD|EUR|GBP|AED)\b/i)?.[0].toUpperCase() ??
    (text.includes("₹") ? "INR" : text.includes("$") ? "USD" : null);
  const negative = /^\s*\(/.test(text) && /\)\s*$/.test(text);
  const numeric = text.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  if (!numeric || !/\d/.test(numeric)) return { amount: null, currency };
  const amount = Number(numeric);
  return {
    amount: Number.isFinite(amount) ? (negative ? -Math.abs(amount) : amount) : null,
    currency,
  };
}

function columns(item: MondayItem) {
  return new Map(item.column_values.map((column) => [column.id, column]));
}

function text(
  map: Map<string, MondayColumnValue>,
  id: string | undefined,
): string | null {
  if (!id) return null;
  return clean(map.get(id)?.text);
}

function warning(
  warnings: DataWarning[],
  entity: "deal" | "work_order",
  itemId: string,
  field: string,
  code: DataWarning["code"],
  message: string,
) {
  warnings.push({ entity, itemId, field, code, message });
}

export function normalizeBoards(
  dealItems: MondayItem[],
  workOrderItems: MondayItem[],
  config: BoardConfig,
  partialWarnings: DataWarning[] = [],
): DataSnapshot {
  const warnings = [...partialWarnings];

  const deals: Deal[] = dealItems.map((item) => {
    const map = columns(item);
    const rawStage = text(map, config.deals.stage);
    const rawAmount = text(map, config.deals.amount);
    const parsedAmount = parseAmount(rawAmount);
    const explicitCurrency = text(map, config.deals.currency)?.toUpperCase() ?? null;
    const rawCloseDate = text(map, config.deals.closeDate);
    const closeDate = parseDateValue(rawCloseDate);
    if (rawAmount && parsedAmount.amount === null)
      warning(warnings, "deal", item.id, "amount", "invalid_number", `Could not parse amount for “${item.name}”.`);
    if (!rawAmount)
      warning(warnings, "deal", item.id, "amount", "missing_value", `“${item.name}” has no deal amount.`);
    if (!rawStage)
      warning(warnings, "deal", item.id, "stage", "missing_value", `“${item.name}” has no pipeline stage.`);
    if (rawCloseDate && !closeDate)
      warning(warnings, "deal", item.id, "closeDate", "invalid_date", `Could not parse close date for “${item.name}”.`);
    if (!rawCloseDate)
      warning(warnings, "deal", item.id, "closeDate", "missing_value", `“${item.name}” has no expected close date.`);

    return {
      id: item.id,
      name: clean(item.name) ?? `Deal ${item.id}`,
      stage: normalizeLabel(rawStage, STAGE_ALIASES),
      amount: parsedAmount.amount,
      currency: explicitCurrency ?? parsedAmount.currency,
      sector: normalizeLabel(text(map, config.deals.sector)),
      owner: clean(text(map, config.deals.owner)),
      createdAt: parseDateValue(text(map, config.deals.createdAt) ?? item.created_at),
      closeDate,
    };
  });

  const workOrders: WorkOrder[] = workOrderItems.map((item) => {
    const map = columns(item);
    const rawStatus = text(map, config.workOrders.status);
    const rawAmount = text(map, config.workOrders.amount);
    const parsedAmount = parseAmount(rawAmount);
    const rawDueDate = text(map, config.workOrders.dueDate);
    const dueDate = parseDateValue(rawDueDate);
    const dealId = text(map, config.workOrders.dealId);
    if (rawAmount && parsedAmount.amount === null)
      warning(warnings, "work_order", item.id, "amount", "invalid_number", `Could not parse amount for “${item.name}”.`);
    if (rawDueDate && !dueDate)
      warning(warnings, "work_order", item.id, "dueDate", "invalid_date", `Could not parse due date for “${item.name}”.`);
    if (!rawStatus)
      warning(warnings, "work_order", item.id, "status", "missing_value", `“${item.name}” has no work-order status.`);
    if (!rawDueDate)
      warning(warnings, "work_order", item.id, "dueDate", "missing_value", `“${item.name}” has no due date.`);
    if (!dealId)
      warning(warnings, "work_order", item.id, "dealId", "unlinked_record", `“${item.name}” is not linked to a deal.`);

    return {
      id: item.id,
      name: clean(item.name) ?? `Work order ${item.id}`,
      status: normalizeLabel(rawStatus, STATUS_ALIASES),
      amount: parsedAmount.amount,
      currency:
        text(map, config.workOrders.currency)?.toUpperCase() ??
        parsedAmount.currency,
      sector: normalizeLabel(text(map, config.workOrders.sector)),
      owner: clean(text(map, config.workOrders.owner)),
      dealId,
      dueDate,
      startedAt: parseDateValue(text(map, config.workOrders.startedAt)),
      completedAt: parseDateValue(text(map, config.workOrders.completedAt)),
    };
  });

  return { deals, workOrders, warnings, fetchedAt: new Date().toISOString() };
}
