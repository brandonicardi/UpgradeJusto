import { describe, expect, it, vi } from "vitest";
import { createPreviewMetadataLoader, metadataKey, moreProposalCount, visibleMetadataQueries, visibleProposals } from "../../lib/preview-metadata";
import type { TowerComponent } from "../../lib/tower-catalog";
import type { TowerRecommendationItem } from "../../lib/tower-recommendations";

// Synthetic connector metadata only; no published product/quote or external call.
function part(id: string): TowerComponent { return { id, category: "cpu", name: `Synthetic ${id}`, attributes: {}, prices: [], sources: [], image: null }; }
function item(key: string, id: string): TowerRecommendationItem {
  return { key, versions: { catalog: "v1" }, actions: [{ action: "replace_category", category: "cpu", line_id: null, candidates: [{ component_id: id, declared_model: null, quantity: 1 }] }] } as TowerRecommendationItem;
}
describe("metadatos por preview: versión, dedupe, límite y cancelación", () => {
  it("mismo SKU en varias cards se consulta una vez, con un guard compartido antes/después", async () => {
    const calls: string[] = [];
    const request = async <T>(suffix: string): Promise<T> => { calls.push(suffix); return (suffix.startsWith("?") ? { dataset_version: "v1" } : part(suffix.slice(1))) as T; };
    const loader = createPreviewMetadataLoader(request);
    const queries = visibleMetadataQueries([item("a", "same-after50"), item("b", "same-after50"), item("c", "same-after50")]);
    loader.load(queries); loader.load(queries);
    await vi.waitFor(() => expect(loader.snapshot().entries.size).toBe(1));
    expect(calls).toEqual(["?page=1&page_size=1", "/same-after50", "?page=1&page_size=1"]);
    loader.load(queries); await Promise.resolve(); expect(calls).toHaveLength(3);
    expect(loader.snapshot().entries.get(metadataKey("same-after50", "v1"))?.status).toBe("ready"); loader.dispose();
  });
  it("limita workers a4 y no publica fotos/nombres antes de cerrar bracket del lote", async () => {
    let active = 0, peak = 0, guards = 0;
    const jobs: { finish: () => void }[] = [];
    const request = <T>(suffix: string): Promise<T> => {
      if (suffix.startsWith("?")) { guards++; return Promise.resolve({ dataset_version: "v1" } as T); }
      active++; peak = Math.max(peak, active);
      return new Promise<T>(resolve => { jobs.push({ finish() { active--; resolve(part(suffix.slice(1)) as T); } }); });
    };
    const loader = createPreviewMetadataLoader(request); loader.load(Array.from({ length: 10 }, (_, i) => ({ id: `id-${i}`, version: "v1" })));
    await vi.waitFor(() => expect(jobs).toHaveLength(4)); expect(loader.snapshot().entries.size).toBe(0);
    jobs.slice(0, 4).forEach(job => job.finish()); await vi.waitFor(() => expect(jobs).toHaveLength(8));
    jobs.slice(4, 8).forEach(job => job.finish()); await vi.waitFor(() => expect(jobs).toHaveLength(10));
    jobs.slice(8).forEach(job => job.finish()); await vi.waitFor(() => expect(loader.snapshot().entries.size).toBe(10));
    expect(peak).toBe(4); expect(active).toBe(0); expect(guards).toBe(2); loader.dispose();
  });
  it("cambio de versión antes no consulta IDs y después invalida también metadatos previos", async () => {
    const calls: string[] = []; let version = "v2", mutateOnB = false;
    const request = async <T>(suffix: string): Promise<T> => { calls.push(suffix); if (suffix.startsWith("?")) return { dataset_version: version } as T; if (mutateOnB && suffix === "/b") version = "v2"; return part(suffix.slice(1)) as T; };
    const early = createPreviewMetadataLoader(request); early.load([{ id: "a", version: "v1" }]);
    await vi.waitFor(() => expect(early.snapshot().status).toBe("catalog_changed")); expect(calls).toEqual(["?page=1&page_size=1"]); early.dispose();
    calls.length = 0; version = "v1";
    const late = createPreviewMetadataLoader(request); late.load([{ id: "a", version: "v1" }]); await vi.waitFor(() => expect(late.snapshot().entries.size).toBe(1));
    mutateOnB = true; late.load([{ id: "b", version: "v1" }]); await vi.waitFor(() => expect(late.snapshot().status).toBe("catalog_changed"));
    expect(late.snapshot().entries.size).toBe(0); expect(calls.filter(path => path.startsWith("?"))).toHaveLength(4); late.dispose();
  });
  it("si no puede probar la versión, conserva fallback sin publicar metadatos", async () => {
    const request = async <T>(): Promise<T> => { throw new Error("Synthetic unavailable version"); };
    const loader = createPreviewMetadataLoader(request); loader.load([{ id: "a", version: "v1" }]);
    await vi.waitFor(() => expect(loader.snapshot().status).toBe("unavailable")); expect(loader.snapshot().entries.size).toBe(0); loader.dispose();
  });
  it("otra revisión/usuario/preview no comparte caché aunque el catálogo y SKU coincidan", async () => {
    let idCalls = 0;
    const request = async <T>(suffix: string): Promise<T> => { if (suffix.startsWith("?")) return { dataset_version: "v1" } as T; idCalls++; return part("same") as T; };
    const first = createPreviewMetadataLoader(request); first.load([{ id: "same", version: "v1" }]); await vi.waitFor(() => expect(first.snapshot().entries.size).toBe(1)); first.dispose();
    const second = createPreviewMetadataLoader(request); expect(second.snapshot().entries.size).toBe(0); second.load([{ id: "same", version: "v1" }]); await vi.waitFor(() => expect(second.snapshot().entries.size).toBe(1));
    expect(idCalls).toBe(2); second.dispose();
  });
  it("preview/revisión nueva crea contexto vacío; dispose aborta y respuesta tardía no notifica", async () => {
    let finish: ((value: TowerComponent) => void) | undefined, signal: AbortSignal | undefined;
    const listener = vi.fn();
    const request = <T>(suffix: string, current?: AbortSignal): Promise<T> => {
      signal = current;
      if (suffix.startsWith("?")) return Promise.resolve({ dataset_version: "v1" } as T);
      return new Promise<T>(resolve => { finish = value => resolve(value as T); });
    };
    const old = createPreviewMetadataLoader(request); old.subscribe(listener); old.load([{ id: "same", version: "v1" }]);
    await vi.waitFor(() => expect(finish).toBeTypeOf("function")); old.dispose(); expect(signal?.aborted).toBe(true); finish!(part("same"));
    await Promise.resolve(); await Promise.resolve(); expect(listener).not.toHaveBeenCalled(); expect(old.snapshot().entries.size).toBe(0);
    let idCalls = 0;
    const next = createPreviewMetadataLoader(async <T>(suffix: string): Promise<T> => { if (suffix.startsWith("?")) return { dataset_version: "v2" } as T; idCalls++; return part("same") as T; });
    expect(next.snapshot().entries.size).toBe(0); next.load([{ id: "same", version: "v2" }]); await vi.waitFor(() => expect(next.snapshot().entries.size).toBe(1));
    expect(idCalls).toBe(1); expect(next.snapshot().entries.has(metadataKey("same", "v1"))).toBe(false); next.dispose();
  });
  it("sólo solicita metadatos visibles; mostrar6más conserva orden/keys y todos los128 resultados", async () => {
    const items = Array.from({ length: 128 }, (_, i) => item(`server-${i}`, `id-${i}`)); const original = items.map(value => value.key);
    const calls: string[] = []; const loader = createPreviewMetadataLoader(async <T>(suffix: string): Promise<T> => { calls.push(suffix); return (suffix.startsWith("?") ? { dataset_version: "v1" } : part(suffix.slice(1))) as T; });
    loader.load(visibleMetadataQueries(visibleProposals(items))); await vi.waitFor(() => expect(loader.snapshot().entries.size).toBe(6));
    expect(calls.filter(path => !path.startsWith("?"))).toHaveLength(6);
    let count = 6; count = moreProposalCount(items.length, count); loader.load(visibleMetadataQueries(visibleProposals(items, count)));
    await vi.waitFor(() => expect(loader.snapshot().entries.size).toBe(12)); expect(calls.filter(path => !path.startsWith("?"))).toHaveLength(12);
    for (let i = 0; i < 22; i++) count = moreProposalCount(items.length, count);
    expect(visibleProposals(items, count).map(value => value.key)).toEqual(original); expect(items.map(value => value.key)).toEqual(original); expect(count).toBe(128);
    // Reaching visible count in the pure paginator is not an implicit metadata fetch.
    expect(calls.filter(path => !path.startsWith("?"))).toHaveLength(12); loader.dispose();
  });
});
