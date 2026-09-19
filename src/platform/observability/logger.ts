import "server-only";
import pino from "pino";
import { getServerEnv } from "@/config/env";
import type { AuditEvent, AuditSink } from "../contracts/audit";

export const logger = pino({
  level: getServerEnv().LOG_LEVEL,
  redact: {
    paths: [
      "authorization",
      "token",
      "accessCode",
      "credential",
      "*.authorization",
      "*.token",
      "*.accessCode",
      "*.credential",
    ],
    censor: "[REDACTED]",
  },
  base: { service: "skylark-bi" },
});

export class StructuredLogAuditSink implements AuditSink {
  async write(event: AuditEvent) {
    logger.info({ audit: event }, "business intelligence audit event");
  }
}
