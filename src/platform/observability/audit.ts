import "server-only";
import type { AuditEvent, AuditSink } from "@/platform/contracts/audit";
import { getDatabase, hasDatabase } from "@/platform/db/client";
import { queryAudits } from "@/platform/db/schema";
import { StructuredLogAuditSink } from "./logger";

export class PersistentAuditSink implements AuditSink {
  private readonly fallback = new StructuredLogAuditSink();

  async write(event: AuditEvent) {
    await this.fallback.write(event);
    if (!hasDatabase()) return;
    await getDatabase().insert(queryAudits).values({
      requestId: event.requestId,
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: event.action,
      outcome: event.outcome,
      durationMs: event.durationMs,
      metadata: event.metadata,
      createdAt: new Date(event.createdAt),
    });
  }
}
