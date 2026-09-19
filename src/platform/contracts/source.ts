import type { DataSnapshot, DataWarning } from "@/domain/types";

export type SourceKind = "monday";

export type SourceConnection = {
  id: string;
  tenantId: string;
  kind: SourceKind;
  credentialRef: string;
  config: Record<string, unknown>;
  mappingVersion: number;
};

export type SourceField = {
  id: string;
  title: string;
  type: string;
};

export type SourceEntitySchema = {
  id: string;
  title: string;
  fields: SourceField[];
};

export type SourceLoadResult<TRaw> = {
  raw: TRaw;
  warnings: DataWarning[];
  fetchedAt: string;
};

export interface SourceAdapter<TRaw = unknown> {
  readonly kind: SourceKind;
  discover(connection: SourceConnection): Promise<SourceEntitySchema[]>;
  load(connection: SourceConnection): Promise<SourceLoadResult<TRaw>>;
  health(connection: SourceConnection): Promise<{
    ok: boolean;
    latencyMs: number;
    message?: string;
  }>;
}

export interface Normalizer<TRaw = unknown> {
  normalize(
    input: SourceLoadResult<TRaw>,
    connection: SourceConnection,
  ): DataSnapshot;
}
