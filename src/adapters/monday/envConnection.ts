import "server-only";
import { getBoardConfig } from "@/config/boards";
import type { SourceConnection } from "@/platform/contracts/source";

export function getDemoMondayConnection(): SourceConnection {
  return {
    id: "monday-env",
    tenantId: "demo",
    kind: "monday",
    credentialRef: "env:MONDAY_API_TOKEN",
    config: getBoardConfig(),
    mappingVersion: 1,
  };
}

export async function resolveDemoMondayToken() {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("MONDAY_API_TOKEN is not configured.");
  return token;
}
