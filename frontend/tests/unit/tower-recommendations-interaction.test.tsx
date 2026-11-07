// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import TowerRecommendations from "../../app/pcs/tower-recommendations";
import TowerRecommendationView from "../../app/pcs/tower-recommendation-view";
import { emptyTower, type Tower } from "../../lib/towers";
import type { TowerRecommendationPreview } from "../../lib/tower-recommendations";
import { button, click, mount, settle, unmountAll } from "./support/dom";

const pc: Tower = { ...emptyTower(), id: "12345678-1234-1234-1234-123456789abc", name: "Mi PC", revision: 1, origin_schema: 2 };
// Datos sintéticos: no afirman compatibilidad física ni precios reales.
function preview(): TowerRecommendationPreview {
  return { pc_id: pc.id, pc_revision: 1, objective: "general", budget_ars: "1000", mode: "automatic", missing_fields: [], limitations: [], items: [{
    key: "primera", status: "requires_verification", actions: [{ action: "add_line", category: "storage", line_id: null, candidates: [{ component_id: null, declared_model: "Disco declarado", quantity: 1 }] }],
    evaluation: { verdict: "requiere_verificacion", rule_results: [], missing_fields: [], rules_version: "cu05-tower-stock-engine-1", data_revision: "synthetic", pc_revision: 1, scope: { id: "cu05-tower-stock-1", policy_version: "tower-stock-policy-1", inventory_version: "tower-stock-inventory-1", label: "Torre", operating_regime: "stock_no_oc", excludes: [] }, coverage: { required: 1, implemented: 1, evaluated: 0, passed: 0, failed: 0, unknown: 1, not_applicable: 0, not_implemented: 0, complete: false }, additional_checks: [], warnings: [], evaluated_configuration: pc },
    benefit: { status: "unknown", before: null, after: null, source: [], workload: null }, cost: { total_ars: null, known_subtotal_ars: "0", within_budget: null, lines: [], missing_fields: [], excluded: [] }, dependencies: [], offers: [], versions: { catalog: "synthetic", rules: "synthetic", references: "synthetic", identity: "synthetic", search: "synthetic" }, missing_fields: [],
  }] };
}
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

describe("Preparar una propuesta sin guardarla", () => {
  it("Preparar plan llama al callback con la propuesta original, sin fetch ni mensaje de agregado", async () => {
    const result = preview(), onPreparePlan = vi.fn(), request = vi.fn(); vi.stubGlobal("fetch", request);
    const host = await mount(<TowerRecommendationView result={result} onPreparePlan={onPreparePlan} />);
    await click(button(host, "Preparar plan"));
    expect(onPreparePlan).toHaveBeenCalledExactlyOnceWith(result.items[0]); expect(request).not.toHaveBeenCalled();
    expect(host.textContent).not.toMatch(/quedó agregado|agregamos|plan guardado/i);
    expect(host.textContent).toContain("borrador revisable");
  });
  it("abre el editor real con sus acciones; guardar sigue siendo una confirmación aparte", async () => {
    const request = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/auth/csrf") return Response.json({ csrf_token: "synthetic" });
      if (String(input) === `/api/towers/${pc.id}/recommendations/preview`) return Response.json(preview());
      return Response.json({ detail: "No esperado" }, { status: 404 });
    }); vi.stubGlobal("fetch", request);
    const host = await mount(<TowerRecommendations pc={pc} disabled={false} initialDraft={{ objective: "general", budget_ars: "1000", price_condition: "cash", workload: null, thermal_available: false }} />);
    await click(button(host, "Buscar propuestas para mi torre")); await settle();
    expect(host.querySelector('[aria-label="Editor de plan de torre"]')).toBeNull();
    request.mockClear(); await click(button(host, "Preparar plan"));
    const editor = host.querySelector('[aria-label="Borrador del plan por compras"]');
    expect(editor).not.toBeNull(); expect(editor?.textContent).toContain("Disco declarado"); expect(editor?.textContent).toContain("Borrador de compras: no guardado");
    expect(button(editor!, "Confirmar y guardar mi plan")?.disabled).toBe(true);
    expect(host.textContent).not.toMatch(/quedó agregado|agregamos|plan guardado/i);
    expect(request).not.toHaveBeenCalled();
  });
  it("Mostrar 6 más mantiene las anteriores y el orden, sin solicitudes nuevas", async () => {
    const result = preview(); result.items = Array.from({ length: 8 }, (_, index) => ({ ...result.items[0], key: `propuesta-${index}`, actions: [{ ...result.items[0].actions[0], candidates: [{ component_id: null, declared_model: `Disco ${index + 1}`, quantity: 1 }] }] }));
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    const host = await mount(<TowerRecommendationView result={result} />);
    const first = host.querySelector('article[aria-label="Propuesta 1"]');
    expect(host.textContent).toContain("Mostrando 6 de 8 propuestas, en el orden del servidor.");
    await click(button(host, "Mostrar 6 más"));
    expect(host.querySelector('article[aria-label="Propuesta 1"]')).toBe(first);
    expect(Array.from(host.querySelectorAll("article")).map(article => article.querySelector('[aria-label="Cambio propuesto"]')?.textContent?.match(/Disco \d+/)?.[0])).toEqual(Array.from({ length: 8 }, (_, index) => `Disco ${index + 1}`));
    expect(host.textContent).toContain("Mostrando 8 de 8 propuestas, en el orden del servidor.");
    expect(request).not.toHaveBeenCalled();
  });
});
