import "server-only";
import { getSnapshotService } from "@/application/snapshotService";

const demoContext = {
  requestId: "legacy-loader",
  tenantId: "demo",
  actorId: "system",
  threadId: "legacy-loader",
  roles: ["admin"],
};

/**
 * Compatibility wrapper for existing dashboard code.
 * New code should request snapshots through SnapshotService with request context.
 */
export async function loadSnapshot() {
  return getSnapshotService().getForContext(demoContext);
}

export async function clearSnapshotCache() {
  await getSnapshotService().invalidate(demoContext);
}
