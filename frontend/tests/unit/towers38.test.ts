import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyTower, towerInput, type TowerInput } from "../../lib/towers";
import { signedProxyHeaders } from "../../lib/gateway";
import { towersProxy } from "../../lib/towers-proxy";
import { towerCatalogProxy } from "../../lib/tower-catalog-proxy";

const uuid = "12345678-1234-1234-1234-123456789abc";
function declared(): TowerInput {
  const draft = emptyTower(); draft.name = "Torre sintética";
  draft.category_status.storage = "present"; draft.category_status.fan = "present";
  draft.lines = [
    { line_id: null, category: "storage", component_id: null, declared_model: "Disco declarado A", quantity: 1 },
    { line_id: null, category: "storage", component_id: null, declared_model: "Disco declarado B", quantity: 1 },
    { line_id: null, category: "fan", component_id: null, declared_model: "Ventilador declarado", quantity: 3 },
  ]; return draft;
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("contrato cerrado torre38A", () => {
  it("forwards only the two explicit catalog sorts; leaves absent sort at the API default", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ items: [] }))); vi.stubGlobal("fetch", fetcher);
    for (const sort of ["retail_first", "id"]) {
      expect((await towerCatalogProxy(new Request(`http://localhost/api/catalog/components?sort=${sort}&category=storage&q=SSD&page=6&page_size=50`))).status).toBe(200);
      const sent = new URL(String(fetcher.mock.calls.at(-1)?.[0]));
      expect(sent.searchParams.get("sort")).toBe(sort); expect(sent.searchParams.get("page")).toBe("6"); expect(sent.searchParams.get("page_size")).toBe("50"); expect(sent.searchParams.get("category")).toBe("storage"); expect(sent.searchParams.get("q")).toBe("SSD");
    }
    await towerCatalogProxy(new Request("http://localhost/api/catalog/components"));
    expect(new URL(String(fetcher.mock.calls.at(-1)?.[0])).searchParams.has("sort")).toBe(false);
    const count = fetcher.mock.calls.length;
    for (const suffix of ["sort=", "sort=catalog", "sort=price", "sort=id&sort=id", "sort=retail_first&owner_id=other", "sort=id&page=10001", "sort=id&page_size=51"]) expect((await towerCatalogProxy(new Request(`http://localhost/api/catalog/components?${suffix}`))).status).toBe(422);
    expect((await towerCatalogProxy(new Request("http://localhost/api/catalog/components/known?sort=id"), "known")).status).toBe(422);
    expect(fetcher).toHaveBeenCalledTimes(count);
  });
  it("conserva discos distintos, cantidades y nueve estados sin fabricar UUID ni atributos", () => {
    const result = towerInput(declared());
    expect(Object.keys(result.category_status)).toHaveLength(9);
    expect(result.lines).toHaveLength(3); expect(result.lines.every(line => line.line_id === null)).toBe(true);
    expect(result.category_status.cpu).toBe("unknown"); expect(result.context.bios_version).toBeNull();
    expect(result.lines[2].quantity).toBe(3);
    expect(towerInput({ ...declared(), owner_id: uuid } as TowerInput)).not.toHaveProperty("owner_id");
  });
  it("rechaza XOR, estados contradictorios, fracciones, IDs duplicados y límites", () => {
    const draft = declared();
    draft.lines[0].component_id = "P01"; expect(() => towerInput(draft)).toThrow();
    draft.lines[0].component_id = null; draft.category_status.storage = "unknown"; expect(() => towerInput(draft)).toThrow();
    draft.category_status.storage = "present"; draft.lines[2].quantity = 33; expect(() => towerInput(draft)).toThrow();
    draft.lines[2].quantity = 1.5; expect(() => towerInput(draft)).toThrow();
    draft.lines[2].quantity = 1; draft.lines[0].line_id = uuid; draft.lines[1].line_id = uuid; expect(() => towerInput(draft)).toThrow();
  });
  it("admite ausencia explícita sin convertir desconocidos en compatibles", () => {
    const draft = declared(); draft.category_status.gpu = "absent";
    expect(towerInput(draft).category_status.gpu).toBe("absent");
    expect(towerInput(draft)).not.toHaveProperty("verdict");
  });
  it("firma CRUD, comprobación y recomendaciones aceptadas, sin extracción por UUID", () => {
    for (const method of ["GET", "PUT", "DELETE"]) expect(signedProxyHeaders("127.0.0.1", method, `/api/towers/${uuid}`, "s".repeat(32))).not.toBeNull();
    for (const suffix of ["/evaluate", "/simulate", "/recommendations/preview"]) expect(signedProxyHeaders("127.0.0.1", "POST", `/api/towers/${uuid}${suffix}`, "s".repeat(32))).not.toBeNull();
    expect(signedProxyHeaders("127.0.0.1", "POST", `/api/towers/${uuid}/extract`, "s".repeat(32))).toBeNull();
    expect(signedProxyHeaders("127.0.0.1", "DELETE", "/api/towers", "s".repeat(32))).toBeNull();
  });
  it("cierra rutas y queries antes de fetch y exige IP confiable", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect((await towersProxy(new Request("http://localhost/api/towers?owner_id=other"))).status).toBe(422);
    expect((await towersProxy(new Request("http://localhost/api/towers"), "../pcs")).status).toBe(422);
    expect((await towersProxy(new Request("http://localhost/api/towers"))).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("conserva Origin literal y CSRF, acota cuerpo y oculta errores upstream", async () => {
    vi.stubEnv("UJ_PROXY_SECRET", "s".repeat(32));
    const fetcher = vi.fn().mockResolvedValue(Response.json({ detail: "private backend detail" }, { status: 429, headers: { "Retry-After": "12" } })); vi.stubGlobal("fetch", fetcher);
    const request = new Request("http://localhost/api/towers", { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1", Origin: "http://localhost:3000", "X-CSRF-Token": "synthetic", "Content-Type": "application/json" }, body: JSON.stringify(declared()) });
    const response = await towersProxy(request);
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("12"); expect(await response.text()).not.toContain("private backend detail");
    const sent = fetcher.mock.calls[0][1]; expect(sent.headers.get("Origin")).toBe("http://localhost:3000"); expect(sent.headers.get("X-CSRF-Token")).toBe("synthetic"); expect(sent.headers.has("X-UJ-Proxy-Signature")).toBe(true);
    const oversized = new Request("http://localhost/api/towers", { method: "POST", headers: { "X-UJ-Socket-IP": "127.0.0.1" }, body: "x".repeat(262145) });
    expect((await towersProxy(oversized)).status).toBe(413); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("catálogo remoto conserva búsqueda/página y resuelve ID independientemente de listas", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ id: "saved-beyond50" }))); vi.stubGlobal("fetch", fetcher);
    expect((await towerCatalogProxy(new Request("http://localhost/api/catalog/components?q=SSD&category=storage&page=6&page_size=12"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("page=6");
    expect((await towerCatalogProxy(new Request("http://localhost/api/catalog/components/saved-beyond50"), "saved-beyond50")).status).toBe(200);
    expect(String(fetcher.mock.calls[1][0])).toContain("/api/catalog/components/saved-beyond50");
    expect((await towerCatalogProxy(new Request("http://localhost/api/catalog/components?owner_id=other"))).status).toBe(422);
  });
});
