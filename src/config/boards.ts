import "server-only";
import { z } from "zod";

export const dealColumnsSchema = z.object({
  stage: z.string(),
  amount: z.string(),
  currency: z.string().optional(),
  sector: z.string(),
  owner: z.string().optional(),
  createdAt: z.string().optional(),
  closeDate: z.string(),
});

export const workOrderColumnsSchema = z.object({
  status: z.string(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  sector: z.string().optional(),
  owner: z.string().optional(),
  dealId: z.string().optional(),
  dueDate: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const boardConfigSchema = z.object({
  dealsBoardId: z.string().min(1),
  workOrdersBoardId: z.string().min(1),
  timezone: z.string().min(1).default("Asia/Kolkata"),
  deals: dealColumnsSchema,
  workOrders: workOrderColumnsSchema,
});

function parseMapping<T>(name: string, schema: z.ZodType<T>, fallback: T): T {
  const raw = process.env[name];
  if (!raw) return fallback;
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    throw new Error(`${name} is not valid column mapping JSON`, { cause: error });
  }
}

export function getBoardConfig() {
  const dealsBoardId = process.env.MONDAY_DEALS_BOARD_ID;
  const workOrdersBoardId = process.env.MONDAY_WORK_ORDERS_BOARD_ID;
  if (!dealsBoardId || !workOrdersBoardId) {
    throw new Error(
      "Missing MONDAY_DEALS_BOARD_ID or MONDAY_WORK_ORDERS_BOARD_ID.",
    );
  }

  return boardConfigSchema.parse({
    dealsBoardId,
    workOrdersBoardId,
    timezone: process.env.BUSINESS_TIMEZONE ?? "Asia/Kolkata",
    deals: parseMapping("MONDAY_DEALS_COLUMNS", dealColumnsSchema, {
      stage: "stage",
      amount: "deal_value",
      currency: "currency",
      sector: "sector",
      owner: "owner",
      createdAt: "created_date",
      closeDate: "expected_close_date",
    }),
    workOrders: parseMapping(
      "MONDAY_WORK_ORDERS_COLUMNS",
      workOrderColumnsSchema,
      {
        status: "status",
        amount: "order_value",
        currency: "currency",
        sector: "sector",
        owner: "owner",
        dealId: "deal_id",
        dueDate: "due_date",
        startedAt: "start_date",
        completedAt: "completed_date",
      },
    ),
  });
}

export type BoardConfig = ReturnType<typeof getBoardConfig>;
