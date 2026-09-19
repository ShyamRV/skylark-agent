export type AuditEvent = {
  requestId: string;
  tenantId: string;
  actorId: string;
  action: string;
  outcome: "success" | "denied" | "error";
  durationMs?: number;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export interface AuditSink {
  write(event: AuditEvent): Promise<void>;
}

export interface ModelAdapter<TPlan, TResult> {
  plan(question: string): Promise<TPlan>;
  narrate(question: string, result: TResult): Promise<string>;
}
