import "server-only";
import { createHash } from "node:crypto";
import type { SnapshotKey } from "@/platform/contracts/snapshot";
import type { DataSnapshot } from "@/domain/types";
import { getDatabase, hasDatabase } from "@/platform/db/client";
import { snapshotMetadata } from "@/platform/db/schema";
import { serializeSnapshot } from "./serialization";

export async function recordSnapshotMetadata(
  key: SnapshotKey,
  snapshot: DataSnapshot,
  expiresAt: string,
) {
  if (!hasDatabase()) return;
  await getDatabase().insert(snapshotMetadata).values({
    tenantId: key.tenantId,
    connectionId: key.connectionId,
    mappingVersion: key.mappingVersion,
    fetchedAt: new Date(snapshot.fetchedAt),
    expiresAt: new Date(expiresAt),
    warningCount: snapshot.warnings.length,
    checksum: createHash("sha256")
      .update(serializeSnapshot(snapshot))
      .digest("hex"),
  });
}
