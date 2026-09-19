import type {
  SnapshotKey,
  SnapshotRepository,
  StoredSnapshot,
} from "@/platform/contracts/snapshot";

function cacheKey(key: SnapshotKey) {
  return `${key.tenantId}:${key.connectionId}:${key.mappingVersion}`;
}

export class MemorySnapshotRepository implements SnapshotRepository {
  private readonly snapshots = new Map<string, StoredSnapshot>();
  private readonly locks = new Map<string, Promise<unknown>>();

  async get(key: SnapshotKey) {
    return this.snapshots.get(cacheKey(key)) ?? null;
  }

  async set(key: SnapshotKey, value: StoredSnapshot) {
    this.snapshots.set(cacheKey(key), value);
  }

  async invalidate(key: SnapshotKey) {
    this.snapshots.delete(cacheKey(key));
  }

  async withRefreshLock<T>(key: SnapshotKey, task: () => Promise<T>) {
    const id = cacheKey(key);
    const existing = this.locks.get(id);
    if (existing) return (await existing) as T;
    const running = task().finally(() => this.locks.delete(id));
    this.locks.set(id, running);
    return running;
  }
}
