import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  MondayNormalizer,
  MondaySourceAdapter,
} from "@/adapters/monday/adapter";
import type { SourceConnection } from "@/platform/contracts/source";

const server = setupServer(
  http.post("https://api.monday.com/v2", async ({ request }) => {
    const body = (await request.json()) as {
      query: string;
      variables: Record<string, unknown>;
    };
    if (body.query.includes("BoardSchema"))
      return HttpResponse.json({
        data: {
          boards: [
            {
              id: "1",
              name: "Deals",
              columns: [{ id: "stage", title: "Stage", type: "status" }],
            },
            {
              id: "2",
              name: "Work Orders",
              columns: [{ id: "status", title: "Status", type: "status" }],
            },
          ],
        },
      });
    const isDeals = body.variables.boardId === "1";
    return HttpResponse.json({
      data: {
        boards: [
          {
            items_page: {
              cursor: null,
              items: isDeals
                ? [
                    {
                      id: "d1",
                      name: "Energy",
                      created_at: "2026-01-01",
                      column_values: [
                        { id: "stage", type: "status", text: "Qualified", value: null },
                        { id: "amount", type: "numbers", text: "1000", value: null },
                        { id: "sector", type: "text", text: "Energy", value: null },
                        { id: "close", type: "date", text: "2026-03-01", value: null },
                      ],
                    },
                  ]
                : [
                    {
                      id: "w1",
                      name: "Survey",
                      column_values: [
                        { id: "status", type: "status", text: "In progress", value: null },
                        { id: "due", type: "date", text: "2026-04-01", value: null },
                      ],
                    },
                  ],
            },
          },
        ],
      },
    });
  }),
);

const connection: SourceConnection = {
  id: "c1",
  tenantId: "t1",
  kind: "monday",
  credentialRef: "test",
  mappingVersion: 3,
  config: {
    dealsBoardId: "1",
    workOrdersBoardId: "2",
    timezone: "Asia/Kolkata",
    deals: {
      stage: "stage",
      amount: "amount",
      sector: "sector",
      closeDate: "close",
    },
    workOrders: { status: "status", dueDate: "due" },
  },
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("monday source adapter contract", () => {
  it("discovers schema, loads live pages, and normalizes to the domain", async () => {
    const adapter = new MondaySourceAdapter(async () => "test-token");
    const entities = await adapter.discover(connection);
    expect(entities.map((entity) => entity.title)).toEqual([
      "Deals",
      "Work Orders",
    ]);

    const raw = await adapter.load(connection);
    const snapshot = new MondayNormalizer().normalize(raw, connection);
    expect(snapshot.deals[0]).toMatchObject({
      id: "d1",
      amount: 1000,
      sector: "energy",
    });
    expect(snapshot.workOrders[0].status).toBe("in progress");
    expect(snapshot.source).toEqual({
      adapter: "monday",
      connectionId: "c1",
      mappingVersion: 3,
    });
  });
});
