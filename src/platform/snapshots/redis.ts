import "server-only";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { getServerEnv } from "@/config/env";
import type {
  SnapshotKey,
  SnapshotRepository,
  StoredSnapshot,
} from "@/platform/contracts/snapshot";
import {
  deserializeSnapshot,
  serializeSnapshot,
} from "./serialization";

function keyFor(key: SnapshotKey) {
  return `skylark:snapshot:${key.tenantId}:${key.connectionId}:${key.mappingVersion}`;
}

export class RedisSnapshotRepository implements SnapshotRepository {
  constructor(private readonly redis: Redis) {}

  static fromEnvironment() {
    const env = getServerEnv();
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
      throw new Error("Upstash Redis is not configured.");
    return new RedisSnapshotRepository(
      new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      }),
    );
  }

  async get(key: SnapshotKey): Promise<StoredSnapshot | null> {
    const value = await this.redis.get<string>(keyFor(key));
    if (!value) return null;
    const parsed = JSON.parse(value) as Omit<StoredSnapshot, "snapshot"> & {
      snapshot: string;
    };
    return {
      ...parsed,
      snapshot: deserializeSnapshot(parsed.snapshot),
    };
  }

  async set(key: SnapshotKey, value: StoredSnapshot) {
    const ttl = Math.max(
      1,
      Math.ceil((new Date(value.staleAt).getTime() - Date.now()) / 1000),
    );
    await this.redis.set(
      keyFor(key),
      JSON.stringify({
        ...value,
        snapshot: serializeSnapshot(value.snapshot),
      }),
      { ex: ttl },
    );
  }

  async invalidate(key: SnapshotKey) {
    await this.redis.del(keyFor(key));
  }

  async withRefreshLock<T>(key: SnapshotKey, task: () => Promise<T>) {
    const lockKey = `${keyFor(key)}:lock`;
    const token = randomUUID();
    const acquired = await this.redis.set(lockKey, token, { nx: true, ex: 30 });
    if (!acquired) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const existing = await this.get(key);
      if (existing) return existing.snapshot as T;
      throw new Error("Snapshot refresh is already in progress.");
    }
    try {
      return await task();
    } finally {
      await this.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        [lockKey],
        [token],
      );
    }
  }
}
