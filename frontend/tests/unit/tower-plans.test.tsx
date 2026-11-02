import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyTower, type Tower } from "../../lib/towers";
import { createTowerPlanWriter, emptyManualPlan, planActions, planDraftFromRead, planMoney, positiveRevision, towerPlanInput, towerPlanRequest, type CanonicalPlanAction, type PlanWriteState, type TowerPlanDraft, type TowerPlanRead } from "../../lib/tower-plans";
import type { TowerAction, TowerEvaluation } from "../../lib/tower-compatibility";
import TowerPlanActionEditor from "../../components/tower-plan-action-editor";
import TowerPlanView from "../../components/tower-plan-view";
import TowerPlanEditor from "../../components/tower-plan-editor";
import TowerRecommendations from "../../app/pcs/tower-recommendations";

const id = "12345678-1234-1234-1234-123456789abc", other = "12345678-1234-1234-1234-123456789abd";
function pc(): Tower { return { ...emptyTower(), id, name: "Synthetic PC", revision: 1, origin_schema: 2 }; }
function action(): TowerAction { return { action: "replace_category", category: "storage", line_id: null, candidates: [{ component_id: null, declared_model: "Synthetic disk without technical evidence", quantity: 1 }] }; }
function draft(): TowerPlanDraft { return { name: "Synthetic own plan", pc_id: id, expected_pc_revision: 1, expected_catalog_version: "synthetic-catalog", objective: "general", workload: null, budget_ars: "900719925474099300.19", price_condition: "cash", stages: [{ name: "Stage1", budget_ars: "100.00", materials: [], actions: [action()] }, { name: "Stage2", budget_ars: "100.00", materials: [], actions: [action()] }] }; }
function saved(): TowerPlanRead {
  const cost = { total_ars: null, known_subtotal_ars: "0.00", within_budget: null, lines: [], missing_fields: ["synthetic price missing"], excluded: ["shipping", "financing", "labor"] as ("shipping" | "financing" | "labor")[] };
  const benefit = { status: "unknown" as const, before: null, after: null, source: [], workload: null };
  const evaluation: TowerEvaluation = { verdict: "requiere_verificacion", rule_results: [], missing_fields: ["synthetic technical evidence missing"], rules_version: "cu05-tower-stock-engine-1", data_revision: "synthetic-catalog", pc_revision: 1, scope: { id: "cu05-tower-stock-1", policy_version: "tower-stock-policy-1", inventory_version: "tower-stock-inventory-1", label: "Tower stock", operating_regime: "stock_no_oc", excludes: ["Physical certification"] }, coverage: { required: 12, implemented: 12, evaluated: 0, passed: 0, failed: 0, unknown: 12, not_applicable: 0, not_implemented: 0, complete: false }, additional_checks: [], warnings: [], evaluated_configuration: pc() };
  return { kind: "tower_plan", schema_version: 2, id: other, name: draft().name, revision: 1, pc_id: id, created_at: "2026-10-26T10:00:00Z", updated_at: "2026-10-26T10:00:00Z", snapshot: { kind: "tower_plan", schema_version: 2, name: draft().name, generated_at: "2026-10-26T10:00:00Z", pc_revision: 1, base_configuration: pc(), objective: "general", workload: null, budget_ars: draft().budget_ars, currency: "ARS", price_condition: "cash", versions: { catalog: "synthetic-catalog", rules: "synthetic", policy: "synthetic", inventory: "synthetic", scope: "synthetic", references: "synthetic", identity: "synthetic", calculation: "synthetic" }, stages: draft().stages.map((stage, index) => ({ ...stage, position: index + 1, evaluated_configuration: pc(), evaluation, benefit, dependencies: [], offers: [], cost, cumulative_cost: cost, status: "requires_verification", missing_fields: ["synthetic missing"], warnings: [] })), cost, benefit, status: "requires_verification", label: "Synthetic partial plan", missing_fields: ["synthetic missing"], limitations: ["Not physical certification"] } };
}
function writer(statuses: number[]) {
  const onState = vi.fn<(state: PlanWriteState) => void>(), onSaved = vi.fn(), uuid = vi.fn().mockReturnValueOnce(id).mockReturnValue(other);
  const request = vi.fn<typeof fetch>().mockImplementation(async path => path === "/api/auth/csrf" ? Response.json({ csrf_token: "synthetic" }) : Response.json(statuses[0] < 300 ? saved() : { detail: "private" }, { status: statuses.shift() ?? 201 }));
  return { controller: createTowerPlanWriter({ onState, onSaved, request, uuid }), request, onState, onSaved, uuid };
}
describe("CU07 private tower plans: structural requests and operation identity", () => {
  it("keeps purchases, unknown cost and incomplete coverage ahead of collapsed per-stage technical evidence", () => {
    const plan = saved(), before = JSON.stringify(plan), html = renderToStaticMarkup(<TowerPlanView plan={plan} now={0} />);
    const brief = html.split('class="stage-technical-evaluation"')[0];
    expect(brief).toContain("Cantidad explícita: 1"); expect(brief).toContain("Coste por confirmar"); expect(brief).toContain("Cobertura incompleta: no confirma compatibilidad completa");
    expect(brief).not.toContain("Antes de esta etapa");
    expect(html).toContain('<details class="stage-technical-evaluation">'); expect(html).toContain('<details class="plan-comparison">');
    const stages = html.match(/<details[^>]*class="accordion plan-stage"[^>]*>/g) ?? [];
    expect(stages).toHaveLength(2); expect(stages.every(tag => !/\bopen(?:=|\s|>)/.test(tag))).toBe(true);
    expect(html).toContain('class="stage-summary-parts">Almacenamiento · 1 unidades');
    expect(html).toContain("Antes de esta etapa"); expect(html).toContain("Coste acumulado hasta etapa 2"); expect(html).toContain("Versiones, cobertura completa y copia evaluada"); expect(JSON.stringify(plan)).toBe(before);
  });
  it("places saved inventory before secondary material confirmation while preserving the unchecked control", () => {
    const html = renderToStaticMarkup(<TowerRecommendations pc={pc()} disabled={false} configuration={<div>saved-inventory-sentinel</div>} />);
    expect(html.indexOf("saved-inventory-sentinel")).toBeLessThan(html.indexOf("Materiales y datos a confirmar"));
    expect(html).toContain("Confirmé que tengo pasta térmica disponible"); expect(html).not.toContain('checked=""');
    expect(html.indexOf("Buscar propuestas para mi torre")).toBeLessThan(html.indexOf("saved-inventory-sentinel"));
  });
  it("prepares an explicitly empty manual draft from the real PC reference, never purchases or inherited materials", () => {
    const own = pc(), before = JSON.stringify(own);
    const seed = emptyManualPlan(own, { objective: "gaming", budget_ars: "0.01", price_condition: "cash", workload: null, thermal_available: true }, "synthetic-catalog");
    expect(seed.pc_id).toBe(own.id); expect(seed.expected_pc_revision).toBe(own.revision); expect(seed.budget_ars).toBe("0.01");
    expect(seed.stages).toHaveLength(1); expect(seed.stages[0].actions).toEqual([]); expect(seed.stages[0].materials).toEqual([]); expect(JSON.stringify(own)).toBe(before);
    expect(() => towerPlanInput(seed, id)).toThrow();
    const html = renderToStaticMarkup(<TowerPlanEditor pc={own} seed={seed} onSaved={() => {}} />);
    expect(html).toContain("Agregá al menos una acción a cada etapa"); expect(html).toContain("Confirmar y guardar mi plan"); expect(html).not.toContain('checked=""');
    expect(() => emptyManualPlan(own, { objective: "general", budget_ars: "", price_condition: "cash", workload: null, thermal_available: false }, "synthetic")).toThrow();
  });
  it("consume omisión canónica line_id sólo en replace_category/add_line y emite null sin mutar origen", () => {
    for (const kind of ["replace_category", "add_line"] as const) {
      const source: CanonicalPlanAction = { action: kind, category: "storage", candidates: action().candidates };
      expect(Object.hasOwn(source, "line_id")).toBe(false);
      const normalized = planActions([source])[0]; expect(normalized.line_id).toBeNull(); expect(Object.hasOwn(source, "line_id")).toBe(false);
      const body = draft(); body.stages[0].actions = JSON.parse(JSON.stringify([source])) as TowerAction[];
      expect(towerPlanInput(body, id).stages[0].actions[0].line_id).toBeNull();
      expect(() => planActions([{ ...source, line_id: id }])).toThrow();
    }
    const board: CanonicalPlanAction = { action: "replace_category", category: "motherboard", candidates: [{ component_id: "synthetic-board", declared_model: null, quantity: 1 }] };
    expect(planActions([board])[0]).toMatchObject({ line_id: null, candidate_context: { bios_version: null } });
    expect(planActions([{ ...board, candidate_context: { bios_version: "explicit-BIOS" } }])[0].candidate_context).toEqual({ bios_version: "explicit-BIOS" });
    const read = saved(); read.snapshot.stages[0].actions = [{ action: "replace_category", category: "storage", candidates: action().candidates }];
    expect(planDraftFromRead(read, pc(), "synthetic-catalog").stages[0].actions[0].line_id).toBeNull();
    expect(Object.hasOwn(read.snapshot.stages[0].actions[0], "line_id")).toBe(false);
  });
  it("replace_line/remove_line jamás convierten ID ausente/null/inválido a otra línea", () => {
    for (const kind of ["replace_line", "remove_line"] as const) {
      const source: CanonicalPlanAction = { action: kind, category: "storage", candidates: kind === "remove_line" ? [] : action().candidates };
      expect(() => planActions([source])).toThrow();
      for (const line_id of [null, "", "not-a-uuid"]) expect(() => planActions([{ ...source, line_id }])).toThrow();
      expect(planActions([{ ...source, line_id: other }])[0].line_id).toBe(other);
    }
    expect(() => planActions([{ action: "replace_category", category: "storage", candidates: [{ component_id: "synthetic", declared_model: "also-declared", quantity: 1 }] }])).toThrow();
    expect(() => planActions([{ action: "replace_category", category: "storage", candidates: [{ component_id: "synthetic", declared_model: null, quantity: null as unknown as number }] }])).toThrow();
    expect(() => planActions([{ action: "add_line", category: "ram", candidates: action().candidates }])).toThrow();
  });
  it("decimal exacto, workload, revisiones y cuerpo cerrado; materiales por etapa no heredados", () => {
    const input = draft(); input.stages[0].materials = [{ kind: "thermal_compound", state: "available_confirmed", confirmed: true }];
    const result = towerPlanInput({ ...input, owner_id: "not-sent" } as TowerPlanDraft, id);
    expect(result.budget_ars).toBe("900719925474099300.19"); expect(result.stages[1].materials).toEqual([]); expect(result).not.toHaveProperty("owner_id"); expect(result).not.toHaveProperty("snapshot");
    expect(planMoney("1.2")).toBe("1.20"); for (const bad of ["0", "0.00", "-1", "1e3", "1,00", "1.001"]) expect(() => planMoney(bad)).toThrow();
    for (const revision of [0, NaN, Infinity, 1.2, -1]) { expect(positiveRevision(revision)).toBe(false); expect(() => towerPlanInput({ ...draft(), expected_pc_revision: revision }, id)).toThrow(); }
    expect(() => towerPlanInput({ ...draft(), workload: "blender-cpu" }, id)).toThrow(); expect(() => towerPlanInput({ ...draft(), expected_catalog_version: "\0bad" }, id)).toThrow();
  });
  it("limits stages/actions, no default unknown quantity, RAM whole and BIOS null", () => {
    expect(() => towerPlanInput({ ...draft(), stages: [] }, id)).toThrow(); expect(() => towerPlanInput({ ...draft(), stages: Array.from({ length: 13 }, () => draft().stages[0]) }, id)).toThrow();
    expect(() => towerPlanInput({ ...draft(), stages: Array.from({ length: 3 }, () => ({ ...draft().stages[0], actions: Array.from({ length: 36 }, action) })) }, id)).toThrow();
    expect(() => planActions([{ ...action(), category: "ram", action: "add_line" }])).toThrow();
    expect(() => planActions([{ ...action(), candidates: [{ component_id: null, declared_model: "Synthetic", quantity: null as unknown as number }] }])).toThrow();
    expect(planActions([{ ...action(), category: "motherboard" }])[0].candidate_context).toEqual({ bios_version: null });
    const html = renderToStaticMarkup(<TowerPlanActionEditor pc={pc()} disabled={false} onAdd={() => {}} />); expect(html).toMatch(/type="number"[^>]*value=""/); expect(html).not.toMatch(/type="number"[^>]*value="1"/);
  });
  it("double save sends one operation; uncertain retry keeps identical UUID/body", async () => {
    const h = writer([503, 200]); const input = draft();
    await Promise.all([h.controller.save(input), h.controller.save(input)]); expect(h.onState.mock.calls.at(-1)?.[0].phase).toBe("uncertain");
    await h.controller.save(input); expect(h.uuid).toHaveBeenCalledTimes(1);
    await h.controller.retry(); const posts = h.request.mock.calls.filter(call => call[0] !== "/api/auth/csrf");
    expect(posts).toHaveLength(2); expect(posts[0][1]!.body).toBe(posts[1][1]!.body); expect(h.uuid).toHaveBeenCalledTimes(1); expect(h.onSaved).toHaveBeenCalledTimes(1); h.controller.dispose();
  });
  it("edición tras incierto no reusa UUID con cuerpo distinto; CAS409 no autoGET/save", async () => {
    const h = writer([503, 409]); const input = draft(), before = JSON.stringify(input);
    await h.controller.save(input); h.controller.changed(); input.name = "Explicitly edited"; await h.controller.save(input, other, 1);
    const posts = h.request.mock.calls.filter(call => call[0] !== "/api/auth/csrf"); expect(posts).toHaveLength(2);
    const first = JSON.parse(posts[0][1]!.body as string), second = JSON.parse(posts[1][1]!.body as string);
    expect(first.client_request_id).toBe(id); expect(second.client_request_id).toBe(other); expect(second.expected_plan_revision).toBe(1); expect(posts[1][0]).toBe(`/api/tower-plans/${other}/recalculate`);
    expect(h.onState.mock.calls.at(-1)?.[0].message).toContain("borrador se conserva"); expect(before).not.toBe(JSON.stringify(input)); expect(input.name).toBe("Explicitly edited"); h.controller.dispose();
  });
  it("history is structured/frozen, recalculate re-confirms materials, GET never posts", async () => {
    const plan = saved(); plan.snapshot.stages[0].materials = [{ kind: "thermal_compound", state: "available_confirmed", confirmed: true }];
    plan.snapshot.stages[0].offers = [{ offer_id: "synthetic", store: "venex", product_id: "synthetic", component_id: "synthetic", variant_key: "synthetic", amount: "123.45", currency: "ARS", condition: "cash", availability: "unknown", stock_quantity: null, source_url: "https://example.com/synthetic", observed_at: "2026-10-24T10:00:00Z", expires_at: "2026-10-25T10:00:00Z", status: "fresh" }];
    const before = JSON.stringify(plan), html = renderToStaticMarkup(<TowerPlanView plan={plan} historical now={Date.parse("2026-10-26T10:00:00Z")} />);
    expect(html).toContain("Revisión anterior"); expect(html).toContain("Coste acumulado hasta etapa 2"); expect(html).toContain("Total desconocido / incompleto"); expect(html).toContain("Consultar no actualiza precios ni reserva stock"); expect(JSON.stringify(plan)).toBe(before);
    expect(html).toContain("Estado original del precio"); expect(html).toContain("fresh"); expect(html).toContain("El precio guardado venció"); expect(plan.snapshot.stages[0].offers[0].status).toBe("fresh");
    expect(html).toContain('class="saved-plan-layout"'); expect(html).toContain('aria-label="Decisión sobre el plan"'); expect(html).toContain("Sólo se cobran las acciones de compra, no las piezas conservadas"); expect(html).toContain("Cantidad explícita: 1");
    expect(html).toContain('aria-label="Comparación del plan"'); expect(html).toContain("Base del plan"); expect(html).toContain("Resultado propuesto");
    expect(html).toContain("Configuración del plan, no prueba de hardware poseído"); expect(html).not.toContain("1080p"); expect(html).not.toContain("500 W");
    const edited = planDraftFromRead(plan, pc(), "current-catalog"); expect(edited.stages.every(stage => !stage.materials.length)).toBe(true); expect(plan.snapshot.stages[0].materials).toHaveLength(1);
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(plan)); await towerPlanRequest(`/${other}/revisions/1`, "GET", undefined, undefined, request);
    expect(request).toHaveBeenCalledTimes(1); expect(request.mock.calls[0][1]!.method).toBe("GET"); expect(request.mock.calls[0][1]!.body).toBeUndefined();
  });
  it("cancel save ignores late response without pretending rollback or applying PC", async () => {
    let finish: ((response: Response) => void) | undefined;
    const onSaved = vi.fn(), onState = vi.fn<(state: PlanWriteState) => void>();
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ csrf_token: "synthetic" })).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    const controller = createTowerPlanWriter({ onSaved, onState, request, uuid: () => id }); const pending = controller.save(draft()); await vi.waitFor(() => expect(finish).toBeTypeOf("function")); controller.cancel(); finish!(Response.json(saved(), { status: 201 })); await pending;
    expect(onSaved).not.toHaveBeenCalled(); expect(onState.mock.calls.at(-1)?.[0].phase).toBe("uncertain"); expect(request.mock.calls.some(call => String(call[0]).startsWith("/api/towers"))).toBe(false); controller.dispose();
  });
});
