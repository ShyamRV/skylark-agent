import type { DataSnapshot } from "@/domain/types";

export type SnapshotKey = {
  tenantId: string;
  connectionId: string;
  mappingVersion: number;
};

export type StoredSnapshot = {
  snapshot: DataSnapshot;
  expiresAt: string;
  staleAt: string;
};

export interface SnapshotRepository {
  get(key: SnapshotKey): Promise<StoredSnapshot | null>;
  set(key: SnapshotKey, value: StoredSnapshot): Promise<void>;
  invalidate(key: SnapshotKey): Promise<void>;
  withRefreshLock<T>(key: SnapshotKey, task: () => Promise<T>): Promise<T>;
}
