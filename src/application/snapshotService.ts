import "server-only";
import {
  MondayNormalizer,
  MondaySourceAdapter,
  validateMondayMapping,
} from "@/adapters/monday/adapter";
import {
  getDemoMondayConnection,
  resolveDemoMondayToken,
} from "@/adapters/monday/envConnection";
import { getServerEnv } from "@/config/env";
import type { DataSnapshot } from "@/domain/types";
import type { AgentRequestContext } from "@/agent/graph";
import type { SnapshotRepository } from "@/platform/contracts/snapshot";
import {
  getActiveTenantConnection,
  resolveConnectionToken,
} from "@/platform/connections/repository";
import { MemorySnapshotRepository } from "@/platform/snapshots/memory";
import { RedisSnapshotRepository } from "@/platform/snapshots/redis";
import { recordSnapshotMetadata } from "@/platform/snapshots/metadata";

export class SnapshotService {
  private readonly normalizer = new MondayNormalizer();

  constructor(private readonly repository: SnapshotRepository) {}

  async getForContext(context: AgentRequestContext): Promise<DataSnapshot> {
    const demo = getServerEnv().APP_ENV === "demo";
    const connection = demo
      ? getDemoMondayConnection()
      : await getActiveTenantConnection(context.tenantId);
    const adapter = new MondaySourceAdapter(
      demo ? resolveDemoMondayToken : resolveConnectionToken,
    );
    const key = {
      tenantId: connection.tenantId,
      connectionId: connection.id,
      mappingVersion: connection.mappingVersion,
    };
    const cached = await this.repository.get(key);
    const now = Date.now();
    if (cached && new Date(cached.expiresAt).getTime() > now)
      return cached.snapshot;

    try {
      return await this.repository.withRefreshLock(key, async () => {
        const latest = await this.repository.get(key);
        if (latest && new Date(latest.expiresAt).getTime() > Date.now())
          return latest.snapshot;
        const schemas = await adapter.discover(connection);
        validateMondayMapping(connection, schemas);
        const raw = await adapter.load(connection);
        const snapshot = this.normalizer.normalize(raw, connection);
        const expiresAt = new Date(Date.now() + 60_000).toISOString();
        await this.repository.set(key, {
          snapshot,
          expiresAt,
          staleAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        });
        await recordSnapshotMetadata(key, snapshot, expiresAt);
        return snapshot;
      });
    } catch (error) {
      if (cached && new Date(cached.staleAt).getTime() > now) {
        return {
          ...cached.snapshot,
          warnings: [
            ...cached.snapshot.warnings,
            {
              code: "partial_read",
              entity: "snapshot",
              message:
                "Live refresh failed; showing the most recent cached snapshot.",
            },
          ],
        };
      }
      throw error;
    }
  }

  async invalidate(context: AgentRequestContext) {
    const demo = getServerEnv().APP_ENV === "demo";
    const connection = demo
      ? getDemoMondayConnection()
      : await getActiveTenantConnection(context.tenantId);
    await this.repository.invalidate({
      tenantId: connection.tenantId,
      connectionId: connection.id,
      mappingVersion: connection.mappingVersion,
    });
  }
}

let singleton: SnapshotService | null = null;

export function getSnapshotService() {
  if (singleton) return singleton;
  const env = getServerEnv();
  const repository =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? RedisSnapshotRepository.fromEnvironment()
      : new MemorySnapshotRepository();
  singleton = new SnapshotService(repository);
  return singleton;
}
