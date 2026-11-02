import { remoteCatalog, type TowerCatalogPage, type TowerComponent } from "./tower-catalog";
import type { TowerRecommendationItem } from "./tower-recommendations";

export type MetadataQuery = { id: string; version: string };
export type MetadataEntry = { status: "ready"; part: TowerComponent } | { status: "unavailable" };
export type MetadataSnapshot = { status: "active" | "catalog_changed" | "unavailable"; entries: ReadonlyMap<string, MetadataEntry> };
export const metadataKey = (id: string, version: string) => JSON.stringify([version, id]);
export function visibleProposals<T>(items: readonly T[], count = 6): T[] { return items.slice(0, Math.max(0, count)); }
export function moreProposalCount(total: number, current: number): number { return Math.min(total, current + 6); }
export function visibleMetadataQueries(items: readonly TowerRecommendationItem[]): MetadataQuery[] {
  return items.flatMap(item => item.actions.flatMap(action => action.candidates.flatMap(candidate => candidate.component_id ? [{ id: candidate.component_id, version: item.versions.catalog }] : [])));
}

// Instantiate per preview only. No global cache, per-card abort or retries.
// One serial batch per version brackets its <=4 ID workers with two version GETs.
export function createPreviewMetadataLoader(request: <T>(suffix: string, signal?: AbortSignal) => Promise<T> = remoteCatalog) {
  const controller = new AbortController(), cache = new Map<string, MetadataEntry>(), queued = new Map<string, MetadataQuery>(), requested = new Set<string>();
  const listeners = new Set<(snapshot: MetadataSnapshot) => void>();
  let status: MetadataSnapshot["status"] = "active", running = false, disposed = false;
  const snapshot = (): MetadataSnapshot => ({ status, entries: new Map(cache) });
  function notify() { if (!disposed) { const value = snapshot(); for (const listener of listeners) listener(value); } }
  function invalidate(next: "catalog_changed" | "unavailable") { status = next; cache.clear(); queued.clear(); notify(); }
  async function versionMatches(expected: string): Promise<boolean> {
    const page = await request<TowerCatalogPage>("?page=1&page_size=1", controller.signal);
    return !!expected && page.dataset_version === expected;
  }
  async function pump() {
    if (running || disposed || status !== "active") return;
    running = true;
    try {
      while (queued.size && !disposed && status === "active") {
        const version = queued.values().next().value!.version;
        const batch = [...queued.values()].filter(query => query.version === version);
        for (const query of batch) queued.delete(metadataKey(query.id, query.version));
        if (!await versionMatches(version)) { if (!disposed) invalidate("catalog_changed"); return; }
        if (disposed) return;
        const staged = new Map<string, MetadataEntry>(); let cursor = 0;
        async function worker() {
          while (cursor < batch.length && !disposed) {
            const query = batch[cursor++], key = metadataKey(query.id, version);
            try {
              const part = await request<TowerComponent>(`/${encodeURIComponent(query.id)}`, controller.signal);
              if (!disposed) staged.set(key, part.id === query.id ? { status: "ready", part } : { status: "unavailable" });
            } catch { if (!disposed) staged.set(key, { status: "unavailable" }); }
          }
        }
        await Promise.all(Array.from({ length: Math.min(4, batch.length) }, () => worker()));
        if (disposed) return;
        if (!await versionMatches(version)) { if (!disposed) invalidate("catalog_changed"); return; }
        if (disposed) return;
        for (const [key, entry] of staged) cache.set(key, entry);
        notify();
      }
    } catch { if (!disposed) invalidate("unavailable"); }
    finally { running = false; }
  }
  return {
    snapshot,
    subscribe(listener: (snapshot: MetadataSnapshot) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load(queries: readonly MetadataQuery[]) {
      if (disposed || status !== "active") return;
      for (const query of queries) {
        const key = metadataKey(query.id, query.version);
        if (!requested.has(key)) { requested.add(key); queued.set(key, { ...query }); }
      }
      // Coalesce visible consumers before starting a shared batch.
      queueMicrotask(() => { void pump(); });
    },
    dispose() { disposed = true; controller.abort(); queued.clear(); cache.clear(); requested.clear(); listeners.clear(); },
  };
}
