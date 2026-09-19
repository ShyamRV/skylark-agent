import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdapterRegistry } from "@/platform/registry";
import { MemorySnapshotRepository } from "@/platform/snapshots/memory";
import {
  deserializeSnapshot,
  serializeSnapshot,
} from "@/platform/snapshots/serialization";
import type { DataSnapshot } from "@/domain/types";
import {
  decryptCredential,
  encryptCredential,
} from "@/platform/security/credentials";
import { resetServerEnvForTests } from "@/config/env";

const snapshot: DataSnapshot = {
  deals: [
    {
      id: "d1",
      name: "Energy deal",
      stage: "qualified",
      amount: 100,
      currency: "INR",
      sector: "energy",
      owner: "A",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      closeDate: new Date("2026-03-01T00:00:00Z"),
    },
  ],
  workOrders: [],
  warnings: [],
  fetchedAt: "2026-01-02T00:00:00Z",
};

beforeEach(() => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  resetServerEnvForTests();
});

describe("production platform contracts", () => {
  it("registers adapters exactly once", () => {
    const registry = new AdapterRegistry();
    const adapter = {
      kind: "monday" as const,
      discover: vi.fn(),
      load: vi.fn(),
      health: vi.fn(),
    };
    registry.register(adapter);
    expect(registry.get("monday")).toBe(adapter);
    expect(() => registry.register(adapter)).toThrow(/already registered/);
  });

  it("coalesces concurrent snapshot refreshes", async () => {
    const repository = new MemorySnapshotRepository();
    const key = { tenantId: "t1", connectionId: "c1", mappingVersion: 1 };
    const task = vi.fn(async () => {
      await Promise.resolve();
      return snapshot;
    });
    const [first, second] = await Promise.all([
      repository.withRefreshLock(key, task),
      repository.withRefreshLock(key, task),
    ]);
    expect(first).toBe(snapshot);
    expect(second).toBe(snapshot);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("round-trips snapshot dates through shared storage", () => {
    const restored = deserializeSnapshot(serializeSnapshot(snapshot));
    expect(restored.deals[0].createdAt).toBeInstanceOf(Date);
    expect(restored.deals[0].createdAt?.toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("encrypts source credentials with authenticated encryption", () => {
    const encrypted = encryptCredential("monday-secret");
    expect(encrypted).not.toContain("monday-secret");
    expect(decryptCredential(encrypted)).toBe("monday-secret");
    expect(() =>
      decryptCredential(`${encrypted.slice(0, -1)}x`),
    ).toThrow();
  });
});
