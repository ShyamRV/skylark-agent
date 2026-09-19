import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/platform/db/client";
import { sourceConnections } from "@/platform/db/schema";
import type { SourceConnection } from "@/platform/contracts/source";
import {
  decryptCredential,
  encryptCredential,
} from "@/platform/security/credentials";

export async function saveMondayConnection(input: {
  tenantId: string;
  accessToken: string;
  config?: Record<string, unknown>;
}) {
  const [saved] = await getDatabase()
    .insert(sourceConnections)
    .values({
      tenantId: input.tenantId,
      kind: "monday",
      status: "connected",
      credentialCiphertext: encryptCredential(input.accessToken),
      config: input.config ?? {},
    })
    .returning();
  return saved;
}

export async function getTenantConnection(
  tenantId: string,
  connectionId: string,
): Promise<SourceConnection> {
  const [connection] = await getDatabase()
    .select()
    .from(sourceConnections)
    .where(
      and(
        eq(sourceConnections.id, connectionId),
        eq(sourceConnections.tenantId, tenantId),
      ),
    )
    .limit(1);
  if (!connection) throw new Error("Source connection was not found.");
  if (connection.kind !== "monday")
    throw new Error(`Unsupported source connection kind: ${connection.kind}`);
  return {
    id: connection.id,
    tenantId: connection.tenantId,
    kind: "monday",
    credentialRef: `db:${connection.id}`,
    config: connection.config,
    mappingVersion: connection.mappingVersion,
  };
}

export async function getActiveTenantConnection(tenantId: string) {
  const [connection] = await getDatabase()
    .select()
    .from(sourceConnections)
    .where(
      and(
        eq(sourceConnections.tenantId, tenantId),
        eq(sourceConnections.status, "connected"),
      ),
    )
    .limit(1);
  if (!connection) throw new Error("No active data source is configured.");
  return getTenantConnection(tenantId, connection.id);
}

export async function resolveConnectionToken(connection: SourceConnection) {
  const [stored] = await getDatabase()
    .select({ credentialCiphertext: sourceConnections.credentialCiphertext })
    .from(sourceConnections)
    .where(
      and(
        eq(sourceConnections.id, connection.id),
        eq(sourceConnections.tenantId, connection.tenantId),
      ),
    )
    .limit(1);
  if (!stored) throw new Error("Source connection credential was not found.");
  return decryptCredential(stored.credentialCiphertext);
}

export async function updateConnectionConfig(
  tenantId: string,
  connectionId: string,
  config: Record<string, unknown>,
) {
  const [updated] = await getDatabase()
    .update(sourceConnections)
    .set({
      config,
      mappingVersion: sql`${sourceConnections.mappingVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(sourceConnections.id, connectionId),
        eq(sourceConnections.tenantId, tenantId),
      ),
    )
    .returning();
  if (!updated) throw new Error("Source connection was not found.");
  return updated;
}
