import { describe, expect, it } from "vitest";
import { normalizeBoards, normalizeLabel, parseAmount, parseDateValue } from "@/domain/normalize";
import type { BoardConfig } from "@/config/boards";

const config = {
  dealsBoardId: "1",
  workOrdersBoardId: "2",
  timezone: "Asia/Kolkata",
  deals: {
    stage: "stage",
    amount: "amount",
    currency: "currency",
    sector: "sector",
    owner: "owner",
    createdAt: "created",
    closeDate: "close",
  },
  workOrders: {
    status: "status",
    amount: "amount",
    currency: "currency",
    sector: "sector",
    owner: "owner",
    dealId: "deal",
    dueDate: "due",
    startedAt: "start",
    completedAt: "completed",
  },
} satisfies BoardConfig;

const column = (id: string, text: string | null) => ({
  id,
  text,
  type: "text",
  value: text,
});

describe("normalization", () => {
  it("parses common messy money formats without hiding currency", () => {
    expect(parseAmount(" ₹ 1,25,000 ")).toEqual({ amount: 125000, currency: "INR" });
    expect(parseAmount("(USD 2,500)")).toEqual({ amount: -2500, currency: "USD" });
    expect(parseAmount("unknown")).toEqual({ amount: null, currency: null });
  });

  it("normalizes aliases and multiple date formats", () => {
    expect(normalizeLabel(" WIP ", { wip: "in progress" })).toBe("in progress");
    expect(parseDateValue("31/03/2026")?.getFullYear()).toBe(2026);
    expect(parseDateValue("not-a-date")).toBeNull();
  });

  it("preserves usable records and emits quality warnings", () => {
    const snapshot = normalizeBoards(
      [{
        id: "d1",
        name: "Solar deal",
        column_values: [
          column("stage", "Won"),
          column("amount", "INR 50,000"),
          column("sector", " Energy "),
          column("close", "bad date"),
        ],
      }],
      [{
        id: "w1",
        name: "Survey",
        column_values: [
          column("status", "WIP"),
          column("due", "2026-09-01"),
        ],
      }],
      config,
    );
    expect(snapshot.deals[0]).toMatchObject({
      stage: "closed won",
      amount: 50000,
      sector: "energy",
    });
    expect(snapshot.workOrders[0].status).toBe("in progress");
    expect(snapshot.warnings.map((warning) => warning.code)).toEqual([
      "invalid_date",
      "unlinked_record",
    ]);
  });
});
