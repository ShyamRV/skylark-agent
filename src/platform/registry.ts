import type { SourceAdapter, SourceKind } from "./contracts/source";

export class AdapterRegistry {
  private readonly adapters = new Map<SourceKind, SourceAdapter>();

  register(adapter: SourceAdapter) {
    if (this.adapters.has(adapter.kind))
      throw new Error(`Adapter ${adapter.kind} is already registered.`);
    this.adapters.set(adapter.kind, adapter);
    return this;
  }

  get(kind: SourceKind): SourceAdapter {
    const adapter = this.adapters.get(kind);
    if (!adapter) throw new Error(`No source adapter is registered for ${kind}.`);
    return adapter;
  }

  list() {
    return [...this.adapters.keys()];
  }
}
