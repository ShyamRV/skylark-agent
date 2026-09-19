import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ...timestamps,
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  ...timestamps,
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roles: jsonb("roles").$type<string[]>().notNull().default(["analyst"]),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("membership_tenant_user").on(table.tenantId, table.userId),
  ],
);

export const sourceConnections = pgTable("source_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("pending"),
  credentialCiphertext: text("credential_ciphertext").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  mappingVersion: integer("mapping_version").notNull().default(1),
  ...timestamps,
});

export const boardMappings = pgTable(
  "board_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => sourceConnections.id, { onDelete: "cascade" }),
    entity: text("entity").notNull(),
    boardId: text("board_id").notNull(),
    columns: jsonb("columns")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("board_mapping_connection_entity").on(
      table.connectionId,
      table.entity,
    ),
  ],
);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  threadId: text("thread_id").notNull(),
  title: text("title"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
});

export const queryAudits = pgTable("query_audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: text("request_id").notNull().unique(),
  tenantId: text("tenant_id").notNull(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  outcome: text("outcome").notNull(),
  durationMs: integer("duration_ms"),
  metadata: jsonb("metadata")
    .$type<Record<string, string | number | boolean | null>>()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const snapshotMetadata = pgTable("snapshot_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: text("tenant_id").notNull(),
  connectionId: text("connection_id").notNull(),
  mappingVersion: integer("mapping_version").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  warningCount: integer("warning_count").notNull(),
  checksum: text("checksum"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const metricLineage = pgTable("metric_lineage", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: text("request_id").notNull(),
  tenantId: text("tenant_id").notNull(),
  metric: text("metric").notNull(),
  plan: jsonb("plan").notNull(),
  sampleSize: integer("sample_size").notNull(),
  excludedCount: integer("excluded_count").notNull(),
  source: jsonb("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
