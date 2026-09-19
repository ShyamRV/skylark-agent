import "server-only";
import type { BoardConfig } from "@/config/boards";
import { normalizeBoards } from "@/domain/normalize";
import type { DataSnapshot, DataWarning } from "@/domain/types";
import { mondayQuery } from "@/lib/monday/client";
import type {
  Normalizer,
  SourceAdapter,
  SourceConnection,
  SourceEntitySchema,
  SourceLoadResult,
} from "@/platform/contracts/source";
import type { MondayItem, MondayRawSnapshot } from "./types";

const FIRST_PAGE = `
  query BoardItems($boardId: ID!, $limit: Int!) {
    boards(ids: [$boardId]) {
      items_page(limit: $limit) {
        cursor
        items {
          id
          name
          created_at
          column_values { id type text value }
        }
      }
    }
  }
`;

const NEXT_PAGE = `
  query MoreBoardItems($cursor: String!, $limit: Int!) {
    next_items_page(cursor: $cursor, limit: $limit) {
      cursor
      items {
        id
        name
        created_at
        column_values { id type text value }
      }
    }
  }
`;

const DISCOVER = `
  query BoardSchema($boardIds: [ID!]!) {
    boards(ids: $boardIds) {
      id
      name
      columns { id title type }
    }
  }
`;

type Page = { cursor: string | null; items: MondayItem[] };

export type MondayTokenResolver = (
  connection: SourceConnection,
) => Promise<string>;

export function validateMondayMapping(
  connection: SourceConnection,
  schemas: SourceEntitySchema[],
) {
  const config = connection.config as BoardConfig;
  const boardFields = new Map(
    schemas.map((schema) => [
      schema.id,
      new Set(schema.fields.map((field) => field.id)),
    ]),
  );
  const missing = [
    ...Object.values(config.deals).filter(
      (column): column is string =>
        Boolean(column) &&
        !boardFields.get(config.dealsBoardId)?.has(column as string),
    ),
    ...Object.values(config.workOrders).filter(
      (column): column is string =>
        Boolean(column) &&
        !boardFields.get(config.workOrdersBoardId)?.has(column as string),
    ),
  ];
  if (missing.length)
    throw new Error(
      `monday.com column mapping drift detected: ${[...new Set(missing)].join(", ")}`,
    );
}

export class MondaySourceAdapter implements SourceAdapter<MondayRawSnapshot> {
  readonly kind = "monday" as const;

  constructor(private readonly resolveToken: MondayTokenResolver) {}

  async discover(connection: SourceConnection): Promise<SourceEntitySchema[]> {
    const token = await this.resolveToken(connection);
    const config = connection.config as BoardConfig;
    const response = await mondayQuery<{
      boards: {
        id: string;
        name: string;
        columns: { id: string; title: string; type: string }[];
      }[];
    }>(
      DISCOVER,
      { boardIds: [config.dealsBoardId, config.workOrdersBoardId] },
      3,
      token,
    );
    return response.data.boards.map((board) => ({
      id: board.id,
      title: board.name,
      fields: board.columns,
    }));
  }

  async load(
    connection: SourceConnection,
  ): Promise<SourceLoadResult<MondayRawSnapshot>> {
    const token = await this.resolveToken(connection);
    const config = connection.config as BoardConfig;
    const [deals, workOrders] = await Promise.all([
      this.loadBoard(config.dealsBoardId, token),
      this.loadBoard(config.workOrdersBoardId, token),
    ]);
    return {
      raw: { deals: deals.items, workOrders: workOrders.items },
      warnings: [...deals.warnings, ...workOrders.warnings],
      fetchedAt: new Date().toISOString(),
    };
  }

  async health(connection: SourceConnection) {
    const started = Date.now();
    try {
      await this.discover(connection);
      return { ok: true, latencyMs: Date.now() - started };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : "monday.com health failed",
      };
    }
  }

  private async loadBoard(boardId: string, token: string) {
    const items: MondayItem[] = [];
    const warnings: DataWarning[] = [];
    const first = await mondayQuery<{ boards: { items_page: Page }[] }>(
      FIRST_PAGE,
      { boardId, limit: 250 },
      3,
      token,
    );
    const page = first.data.boards[0]?.items_page;
    if (!page)
      throw new Error(`Board ${boardId} was not found or is not accessible.`);
    items.push(...page.items);
    this.addPartialWarnings(warnings, first.errors);

    let cursor = page.cursor;
    while (cursor) {
      const next = await mondayQuery<{ next_items_page: Page }>(
        NEXT_PAGE,
        { cursor, limit: 250 },
        3,
        token,
      );
      items.push(...next.data.next_items_page.items);
      cursor = next.data.next_items_page.cursor;
      this.addPartialWarnings(warnings, next.errors);
    }
    return { items, warnings };
  }

  private addPartialWarnings(
    warnings: DataWarning[],
    errors: { message: string }[],
  ) {
    if (!errors.length) return;
    warnings.push({
      code: "partial_read",
      entity: "snapshot",
      message: errors.map((error) => error.message).join("; "),
    });
  }
}

export class MondayNormalizer implements Normalizer<MondayRawSnapshot> {
  normalize(
    input: SourceLoadResult<MondayRawSnapshot>,
    connection: SourceConnection,
  ): DataSnapshot {
    const snapshot = normalizeBoards(
      input.raw.deals,
      input.raw.workOrders,
      connection.config as BoardConfig,
      input.warnings,
    );
    return {
      ...snapshot,
      fetchedAt: input.fetchedAt,
      source: {
        adapter: "monday",
        connectionId: connection.id,
        mappingVersion: connection.mappingVersion,
      },
    };
  }
}
