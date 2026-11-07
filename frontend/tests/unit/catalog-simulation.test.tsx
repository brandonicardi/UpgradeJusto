// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { emptyTower, type Tower } from "../../lib/towers";
import { catalogTechnicalText, loadCatalogPCs, simulateCatalogPage } from "../../lib/catalog-simulation";
import PieceFit from "../../components/catalog-piece-fit";
import type { TowerComponent } from "../../lib/tower-catalog";
import CatalogWorkbench from "../../components/catalog-workbench";
import { button, click, mount, settle, type, unmountAll } from "./support/dom";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const pc = (id: string): Tower => ({ ...emptyTower(), name: id, id, revision: 3, origin_schema: 2 });
const part = (id: string): TowerComponent => ({ id, name: id, category: "gpu", attributes: {}, sources: [], prices: [], image: null });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });
describe("¿Encaja en…?", () => {
  // El motor (backend/upgradejusto/compatibility/tower_engine.py) solo responde "compatible" con la evaluación completa:
  // la interfaz muestra el veredicto recibido, sin reinterpretarlo.
  const complete = { verdict: "compatible", coverage: { complete: true }, missing_fields: [], rule_results: [{ rule_id: "T04", state: "pass" }], evaluated_configuration: { lines: [] } };
  const mountPiece = async (evaluation: unknown) => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.startsWith("/api/towers?") ? response({ items: [pc("uno")], total: 1 }) : url === "/api/auth/csrf" ? response({ csrf_token: "t" }) : response(evaluation)));
    const host = await mount(<PieceFit part={part("a")} catalogVersion="cat-v1" />); await settle();
    await type(host.querySelector("select")!, "uno"); await settle();
    return host;
  };
  it("muestra cada veredicto del servidor tal cual, sin cuarto estado", async () => {
    for (const [verdict, text] of [["compatible", "Encaja"], ["incompatible", "No encaja"], ["requiere_verificacion", "Falta un dato"]] as const) {
      const host = await mountPiece({ ...complete, verdict });
      const badge = host.querySelector(".piece-verdict")!;
      expect(badge.getAttribute("data-verdict")).toBe(verdict); expect(badge.textContent).toBe(text);
      expect(host.textContent).not.toContain("Respuesta incompleta"); await unmountAll();
    }
  });
  it("si falla el pedido muestra 'Falta un dato' sin veredicto", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.startsWith("/api/towers?") ? response({ items: [pc("uno")], total: 1 }) : url === "/api/auth/csrf" ? response({ csrf_token: "t" }) : response({}, 500)));
    const host = await mount(<PieceFit part={part("a")} catalogVersion="cat-v1" />); await settle();
    await type(host.querySelector("select")!, "uno"); await settle();
    expect(host.querySelector(".piece-verdict")).toBeNull(); expect(host.textContent).toContain("No pudimos comprobar tu PC ahora. Probá de nuevo en un rato.");
  });
  it("la grilla publica el veredicto del servidor sin reescribirlo", async () => {
    for (const verdict of ["compatible", "incompatible", "requiere_verificacion"]) {
      vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/auth/csrf" ? response({ csrf_token: "t" }) : response({ ...complete, verdict })));
      const publish = vi.fn();
      await simulateCatalogPage(pc("uno"), [part("a")], new AbortController().signal, publish);
      expect(publish).toHaveBeenCalledWith({ a: verdict });
    }
  });
  it("el dato técnico usa solo atributos presentes y aclara faltantes", () => {
    expect(catalogTechnicalText(part("a"))).toBe("No tenemos más datos de esta pieza todavía");
    expect(catalogTechnicalText({ ...part("a"), category: "motherboard", attributes: { reference_facts: JSON.stringify({ socket: "AM4" }) } })).toContain("AM4");
    expect(catalogTechnicalText({ ...part("a"), attributes: { socket: "AM5", memory_type: "DDR5", internal_id: "oculto" } })).toBe("Socket: AM5 · Memoria: DDR5");
  });
  it("sin sesión no muestra estados ni simula y ofrece entrar", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({}, 401)); vi.stubGlobal("fetch", fetcher);
    const host = await mount(<CatalogWorkbench data={{ items: [part("a")], total: 1, page: 1, page_size: 12, dataset_version: "prueba" }} />);
    await settle();
    expect(host.querySelector("article")?.textContent).not.toMatch(/Encaja|No encaja|Falta un dato/);
    expect(host.querySelector('a[href="/account"]')).not.toBeNull();
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith("/api/towers?"))).toBe(true);
  });
  it("sin PCs ofrece agregar una; pagina las PCs de la persona", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({ items: [pc("uno")], total: 2 })).mockResolvedValueOnce(response({ items: [pc("dos")], total: 2 })));
    expect((await loadCatalogPCs(new AbortController().signal)).pcs.map(pc => pc.id)).toEqual(["uno", "dos"]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ items: [], total: 0 })));
    const host = await mount(<CatalogWorkbench data={{ items: [], total: 0, page: 1, page_size: 12, dataset_version: "prueba" }} />);
    await settle(); expect(host.textContent).toContain("Agregá una PC");
  });
  it("solo POST simulate con CSRF, reemplaza la categoría y nunca escribe la PC", async () => {
    const original = pc("uno"), before = JSON.stringify(original), publish = vi.fn();
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => url === "/api/auth/csrf" ? response({ csrf_token: "token" }) : response({ verdict: "incompatible", body: init?.body }));
    vi.stubGlobal("fetch", fetcher);
    await simulateCatalogPage(original, [part("a")], new AbortController().signal, publish);
    expect(JSON.stringify(original)).toBe(before);
    const posts = fetcher.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(1); expect(posts[0][0]).toBe("/api/towers/uno/simulate");
    expect(posts[0][1]?.headers).toMatchObject({ "X-CSRF-Token": "token" });
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual({ expected_pc_revision: 3, actions: [{ action: "replace_category", category: "gpu", line_id: null, candidates: [{ component_id: "a", declared_model: null, quantity: 1 }] }] });
    expect(JSON.stringify(posts)).not.toContain("user_id"); expect(publish).toHaveBeenCalledWith({ a: "incompatible" });
  });
  it("limita a tres simulaciones simultáneas y descarta respuestas canceladas", async () => {
    const pending: ((value: Response) => void)[] = [], publish = vi.fn(), controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((url: string) => url === "/api/auth/csrf" ? Promise.resolve(response({ csrf_token: "t" })) : new Promise<Response>(resolve => pending.push(resolve))));
    const run = simulateCatalogPage(pc("uno"), Array.from({ length: 12 }, (_, i) => part(String(i))), controller.signal, publish);
    await settle(); expect(pending).toHaveLength(3);
    controller.abort(); pending.forEach(resolve => resolve(response({ verdict: "compatible" }))); await run;
    expect(publish).not.toHaveBeenCalled(); expect(pending).toHaveLength(3);
  });
  it("cambiar PC o página descarta el estado anterior aunque el pedido ignore la cancelación", async () => {
    const pending: { url: string; resolve: (value: Response) => void }[] = [];
    vi.stubGlobal("fetch", vi.fn((url: string) => url.startsWith("/api/towers?") ? Promise.resolve(response({ items: [pc("uno"), pc("dos")], total: 2 })) : url === "/api/auth/csrf" ? Promise.resolve(response({ csrf_token: "t" })) : new Promise<Response>(resolve => pending.push({ url, resolve }))));
    const pages = ["a", "b"].map(id => ({ items: [part(id)], total: 2, page: id === "a" ? 1 : 2, page_size: 12, dataset_version: "prueba" }));
    function Screen() { const [index, setIndex] = useState(0); return <><button onClick={() => setIndex(1)}>Otra página</button><CatalogWorkbench data={pages[index]} /></>; }
    const host = await mount(<Screen />); await settle(); const select = host.querySelector("select")!;
    await type(select, "uno"); await settle(); await type(select, "dos"); await settle();
    await act(async () => pending[0].resolve(response({ verdict: "compatible" })));
    expect(host.querySelector("article")?.textContent).not.toContain("Encaja");
    await act(async () => pending[1].resolve(response({ verdict: "incompatible" })));
    expect(host.querySelector("article")?.textContent).toContain("No encaja");
    await click(button(host, "Otra página"));
    expect(host.querySelector("article")?.textContent).not.toContain("No encaja");
    await act(async () => pending[2].resolve(response({ verdict: "requiere_verificacion" })));
    expect(host.querySelector("article")?.textContent).toContain("Falta un dato");
  });
  it("errores, categorías no simulables y respuestas desconocidas no producen estados", async () => {
    const publish = vi.fn(); vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/auth/csrf" ? response({ csrf_token: "t" }) : response({ verdict: "desconocido" })));
    await simulateCatalogPage(pc("uno"), [part("a")], new AbortController().signal, publish); expect(publish).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("falló")));
    await simulateCatalogPage(pc("uno"), [part("a")], new AbortController().signal, publish); expect(publish).not.toHaveBeenCalled();
    await simulateCatalogPage({ ...pc("uno"), revision: 0 }, [part("a")], new AbortController().signal, publish); expect(publish).not.toHaveBeenCalled();
  });
});
