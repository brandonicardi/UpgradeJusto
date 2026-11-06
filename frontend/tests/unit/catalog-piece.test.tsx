// @vitest-environment jsdom
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PiecePrices from "../../components/catalog-piece-prices";
import { afterEach, describe, expect, it, vi } from "vitest";
import PieceFit from "../../components/catalog-piece-fit";
import { pieceFacts, piecePlanDraft, simulatePiece } from "../../lib/catalog-piece";
import { emptyTower, type Tower } from "../../lib/towers";
import type { TowerComponent } from "../../lib/tower-catalog";
import { mount, settle, type, click, button, unmountAll } from "./support/dom";
const part: TowerComponent = { id: "pieza", name: "Pieza de prueba", category: "gpu", attributes: {}, sources: [], prices: [] };
const pc = (id: string): Tower => ({ ...emptyTower(), name: id, id, revision: 2, origin_schema: 2 });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const evaluation = (verdict: string) => ({ verdict, rule_results: [{ rule_id: "T04", state: "unknown" }], evaluated_configuration: { ...pc("uno"), lines: [{ category: "gpu", component_id: part.id, quantity: 1 }] } });
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });
describe("ficha y simulación", () => {
  it("precio vigente con moneda, fecha y tienda sin redondear; importe ausente no es vigente", () => {
    const offer = { offer_id: "o", store: "venex" as const, product_id: "p", component_id: part.id, variant_key: "v", amount: "1234.56", currency: "ARS" as const, condition: "cash" as const, availability: "unknown" as const, stock_quantity: null, source_url: "https://venex.com.ar/p", observed_at: "2020-01-01T00:00:00Z", expires_at: "2099-01-01T00:00:00Z", status: "fresh" as const };
    const html = renderToStaticMarkup(<PiecePrices part={{ ...part, offers: [offer] }} compact />);
    expect(html).toContain("ARS 1.234,56"); expect(html).toContain("Venex"); expect(html).toContain("visto el"); expect(html).not.toContain("El más bajo");
    expect(renderToStaticMarkup(<PiecePrices part={{ ...part, offers: [{ ...offer, amount: null }] }} compact />)).toContain("Sin precio");
  });
  it("solo presenta atributos documentados y faltantes", () => {
    expect(pieceFacts(part)[0].value).toBe("No tenemos ese dato todavía");
    expect(pieceFacts({ ...part, attributes: { length_mm: null, tdp_w: "115" } })).toEqual([{ label: "Largo (mm)", value: "Falta un dato" }, { label: "Consumo (W)", value: "115" }]);
  });
  it("sin sesión ofrece entrar, sin veredicto ni simulación", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({}, 401)); vi.stubGlobal("fetch", fetcher);
    const host = await mount(<PieceFit part={part} catalogVersion="cat-v1" />); await settle();
    expect(host.querySelector('a[href="/account"]')).not.toBeNull(); expect(host.querySelector(".piece-verdict")).toBeNull();
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith("/api/towers?"))).toBe(true);
  });
  it("simula con CSRF y nunca guarda ni manda identidad", async () => {
    const original = pc("uno"), before = JSON.stringify(original);
    const fetcher = vi.fn(async (url: string) => response(url === "/api/auth/csrf" ? { csrf_token: "token" } : evaluation("compatible"))); vi.stubGlobal("fetch", fetcher);
    await simulatePiece(original, part, new AbortController().signal);
    expect(JSON.stringify(original)).toBe(before);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(["/api/auth/csrf", "/api/towers/uno/simulate"]);
  });
  it("cambiar de PC descarta respuestas viejas y la acción muestra la configuración sin guardar", async () => {
    const pending: ((value: Response) => void)[] = [];
    const fetcher = vi.fn((url: string, init?: RequestInit) => url.startsWith("/api/towers?") ? Promise.resolve(response({ items: [pc("uno"), pc("dos")], total: 2 })) : url === "/api/auth/csrf" ? Promise.resolve(response({ csrf_token: "t" })) : new Promise<Response>(resolve => { expect(init?.headers).toMatchObject({ "X-CSRF-Token": "t" }); expect(String(init?.body)).not.toContain("user_id"); pending.push(resolve); }));
    vi.stubGlobal("fetch", fetcher); const host = await mount(<PieceFit part={part} catalogVersion="cat-v1" />); await settle();
    const select = host.querySelector("select")!; await type(select, "uno"); await settle(); await type(select, "dos"); await settle();
    await act(async () => pending[0](response(evaluation("compatible")))); expect(host.querySelector(".piece-verdict")).toBeNull();
    await act(async () => pending[1](response(evaluation("incompatible")))); expect(host.querySelector(".piece-verdict")?.textContent).toBe("No encaja");
    expect(host.textContent).toContain("Largo de la gráfica"); expect(host.textContent).toContain("Falta un dato");
    await click(button(host, "Ver cómo quedaría mi PC")); await settle(); await act(async () => pending[2](response(evaluation("requiere_verificacion"))));
    expect(host.textContent).toContain("Tu PC con este cambio"); expect(host.textContent).toContain("Pieza de prueba");
    expect(fetcher.mock.calls.filter(([, init]) => init?.method).every(([url, init]) => url.endsWith("/simulate") && init?.method === "POST")).toBe(true);
  });
  const pcList = (fetcher = vi.fn(async (url: string, init?: RequestInit) => { void init; return url.startsWith("/api/towers?") ? response({ items: [pc("uno")], total: 1 }) : url === "/api/auth/csrf" ? response({ csrf_token: "t" }) : response(evaluation("compatible")); })) => { vi.stubGlobal("fetch", fetcher); return fetcher; };
  const sumar = (host: HTMLElement) => button(host, "Sumar a mi plan") as HTMLButtonElement;
  it("Sumar a mi plan solo abre el formulario: sin red ni escrituras", async () => {
    const fetcher = pcList(); const host = await mount(<PieceFit part={part} catalogVersion="cat-v1" />); await settle();
    expect(sumar(host).disabled).toBe(true);
    await type(host.querySelector("select")!, "uno"); await settle();
    const calls = fetcher.mock.calls.length; expect(sumar(host).disabled).toBe(false);
    await click(sumar(host)); await settle();
    expect(host.querySelector('[aria-label="Preparar plan desde esta pieza"]')).not.toBeNull(); expect(host.textContent).toContain("Todavía no se guarda nada");
    expect(fetcher.mock.calls).toHaveLength(calls);
    expect(fetcher.mock.calls.map(([url]) => String(url)).filter(url => !url.startsWith("/api/towers?"))).toEqual(["/api/auth/csrf", "/api/towers/uno/simulate"]);
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
  it("preparar con presupuesto válido abre el editor con la pieza en la etapa 1, sin guardar", async () => {
    const fetcher = pcList(); const host = await mount(<PieceFit part={part} catalogVersion="cat-v1" />); await settle();
    await type(host.querySelector("select")!, "uno"); await settle(); await click(sumar(host));
    await type(host.querySelector('input[inputmode="decimal"]')!, "500000"); const calls = fetcher.mock.calls.length;
    await click(button(host, "Preparar borrador")); await settle();
    const section = host.querySelector('section[aria-label="Borrador de plan desde esta pieza"]');
    expect(section).not.toBeNull(); expect(section?.querySelector('section[aria-label="Borrador de plan por etapas"]')).not.toBeNull();
    expect(section?.textContent).toContain("Etapa 1"); expect(section?.textContent).toContain("pieza × 1"); expect(section?.textContent).toContain("gpu · replace_category"); expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(fetcher.mock.calls).toHaveLength(calls);
  });
  it("presupuesto inválido muestra una alerta y no abre el editor", async () => {
    pcList(); const host = await mount(<PieceFit part={part} catalogVersion="cat-v1" />); await settle();
    await type(host.querySelector("select")!, "uno"); await settle(); await click(sumar(host));
    await type(host.querySelector('input[inputmode="decimal"]')!, "mucho"); await click(button(host, "Preparar borrador"));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Presupuesto"); expect(host.querySelector('section[aria-label="Borrador de plan desde esta pieza"]')).toBeNull();
  });
  it("sin versión del catálogo el botón queda deshabilitado y se explica", async () => {
    pcList(); const host = await mount(<PieceFit part={part} catalogVersion={null} />); await settle();
    await type(host.querySelector("select")!, "uno"); await settle();
    expect(sumar(host).disabled).toBe(true); expect(host.textContent).toContain("No pudimos consultar la versión del catálogo. Recargá la ficha para preparar un plan.");
  });
  it("piecePlanDraft arma la etapa 1 con la pieza y no muta la PC", () => {
    const original = pc("uno"), before = JSON.stringify(original);
    const draft = piecePlanDraft(original, part, { objective: "gaming", budget_ars: "500000", price_condition: "list", workload: null, thermal_available: false }, "cat-v1");
    expect(JSON.stringify(original)).toBe(before);
    expect(draft.stages).toHaveLength(1); expect(draft.stages[0].budget_ars).toBe(draft.budget_ars); expect(draft.budget_ars).toBe("500000.00");
    expect(draft.objective).toBe("gaming"); expect(draft.price_condition).toBe("list"); expect(draft.stages[0].materials).toEqual([]);
    expect(draft.stages[0].actions).toEqual([{ action: "replace_category", category: "gpu", line_id: null, candidates: [{ component_id: "pieza", declared_model: null, quantity: 1 }] }]);
    expect(draft.expected_catalog_version).toBe("cat-v1"); expect(draft.pc_id).toBe("uno"); expect(draft.expected_pc_revision).toBe(2);
    expect(() => piecePlanDraft(original, part, { objective: "gaming", budget_ars: "0", price_condition: "cash", workload: null, thermal_available: false }, "cat-v1")).toThrow();
  });
});
