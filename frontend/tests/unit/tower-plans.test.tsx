// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyTower, type Tower } from "../../lib/towers";
import { createTowerPlanWriter, emptyManualPlan, planActions, planDraftFromRead, planMoney, planProgressSummary, planStageStates, positiveRevision, setStageProgress, towerPlanInput, towerPlanRequest, type CanonicalPlanAction, type PlanWriteState, type TowerPlanDraft, type TowerPlanRead } from "../../lib/tower-plans";
import type { TowerAction, TowerEvaluation } from "../../lib/tower-compatibility";
import TowerPlanActionEditor from "../../components/tower-plan-action-editor";
import TowerPlanView from "../../components/tower-plan-view";
import TowerPlanEditor from "../../components/tower-plan-editor";
import TowerRecommendations from "../../app/pcs/tower-recommendations";
import TowerPlans from "../../app/tower-plans/workspace";
import { button, byLabel, click, mount, settle, type, unmountAll } from "./support/dom";

afterEach(async () => { vi.useRealTimers(); await unmountAll(); vi.unstubAllGlobals(); });

const id = "12345678-1234-1234-1234-123456789abc", other = "12345678-1234-1234-1234-123456789abd";
function pc(): Tower { return { ...emptyTower(), id, name: "Synthetic PC", revision: 1, origin_schema: 2 }; }
function action(): TowerAction { return { action: "replace_category", category: "storage", line_id: null, candidates: [{ component_id: null, declared_model: "Synthetic disk without technical evidence", quantity: 1 }] }; }
function draft(): TowerPlanDraft { return { name: "Synthetic own plan", pc_id: id, expected_pc_revision: 1, expected_catalog_version: "synthetic-catalog", objective: "general", workload: null, budget_ars: "900719925474099300.19", price_condition: "cash", stages: [{ name: "Stage1", budget_ars: "100.00", materials: [], actions: [action()] }, { name: "Stage2", budget_ars: "100.00", materials: [], actions: [action()] }] }; }
function saved(): TowerPlanRead {
  const cost = { total_ars: null, known_subtotal_ars: "0.00", within_budget: null, lines: [], missing_fields: ["synthetic price missing"], excluded: ["shipping", "financing", "labor"] as ("shipping" | "financing" | "labor")[] };
  const benefit = { status: "unknown" as const, before: null, after: null, source: [], workload: null };
  const evaluation: TowerEvaluation = { verdict: "requiere_verificacion", rule_results: [], missing_fields: ["synthetic technical evidence missing"], rules_version: "cu05-tower-stock-engine-1", data_revision: "synthetic-catalog", pc_revision: 1, scope: { id: "cu05-tower-stock-1", policy_version: "tower-stock-policy-1", inventory_version: "tower-stock-inventory-1", label: "Tower stock", operating_regime: "stock_no_oc", excludes: ["Physical certification"] }, coverage: { required: 12, implemented: 12, evaluated: 0, passed: 0, failed: 0, unknown: 12, not_applicable: 0, not_implemented: 0, complete: false }, additional_checks: [], warnings: [], evaluated_configuration: pc() };
  return { kind: "tower_plan", schema_version: 2, id: other, name: draft().name, revision: 1, pc_id: id, created_at: "2026-10-26T10:00:00Z", updated_at: "2026-10-26T10:00:00Z", stage_keys: draft().stages.map((_, index) => "ab"[index].repeat(64)), progress: {}, snapshot: { kind: "tower_plan", schema_version: 2, name: draft().name, generated_at: "2026-10-26T10:00:00Z", pc_revision: 1, base_configuration: pc(), objective: "general", workload: null, budget_ars: draft().budget_ars, currency: "ARS", price_condition: "cash", versions: { catalog: "synthetic-catalog", rules: "synthetic", policy: "synthetic", inventory: "synthetic", scope: "synthetic", references: "synthetic", identity: "synthetic", calculation: "synthetic" }, stages: draft().stages.map((stage, index) => ({ ...stage, position: index + 1, evaluated_configuration: pc(), evaluation, benefit, dependencies: [], offers: [], cost, cumulative_cost: cost, status: "requires_verification", missing_fields: ["synthetic missing"], warnings: [] })), cost, benefit, status: "requires_verification", label: "Synthetic partial plan", missing_fields: ["synthetic missing"], limitations: ["Not physical certification"] } };
}
function writer(statuses: number[]) {
  const onState = vi.fn<(state: PlanWriteState) => void>(), onSaved = vi.fn(), uuid = vi.fn().mockReturnValueOnce(id).mockReturnValue(other);
  const request = vi.fn<typeof fetch>().mockImplementation(async path => path === "/api/auth/csrf" ? Response.json({ csrf_token: "synthetic" }) : Response.json(statuses[0] < 300 ? saved() : { detail: "private" }, { status: statuses.shift() ?? 201 }));
  return { controller: createTowerPlanWriter({ onState, onSaved, request, uuid }), request, onState, onSaved, uuid };
}
describe("CU07 private tower plans: structural requests and operation identity", () => {
  it("el workspace conserva edición, recálculo y baja, y permite consultar y dejar una versión anterior sin escrituras", async () => {
    const plan = saved();
    const request = vi.fn<typeof fetch>().mockImplementation(async input => {
      const path = String(input);
      if (path === "/api/tower-plans?page=1&page_size=20") return Response.json({ items: [plan], total: 1, page: 1, page_size: 20 });
      if (path === `/api/tower-plans/${other}` || path === `/api/tower-plans/${other}/revisions/1`) return Response.json(plan);
      if (path === `/api/towers/${id}`) return Response.json(pc());
      if (path.startsWith("/api/catalog/components?")) return Response.json({ dataset_version: "synthetic-catalog", items: [], total: 0, page: 1, page_size: 1 });
      throw new Error(`Solicitud inesperada: ${path}`);
    });
    vi.stubGlobal("fetch", request);
    const host = await mount(<TowerPlans initialId={other} />); await settle();
    await click(button(host, "Preparar un NUEVO borrador con PC y catálogo actuales (reemplaza borrador sin guardar)"));
    expect(host.querySelector('[aria-label="Editor de plan de torre"]')).not.toBeNull();
    expect(button(host, "Confirmar y guardar los cambios del plan")?.disabled).toBe(true);
    await click(button(host, "Preparar baja del plan"));
    const deactivation = host.querySelector('[aria-label="Confirmar baja de plan de torre"]');
    expect(deactivation).not.toBeNull(); expect(deactivation?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false);
    expect(button(host, "Dar de baja el plan")).not.toBeNull();
    await click(button(host, "Cancelar baja del plan"));
    await type(byLabel(host, "Número de versión"), "1");
    await click(button(host, "Ver la versión anterior"));
    expect(host.textContent).toContain("Versión anterior del plan");
    expect(button(host, "Preparar baja del plan")).toBeNull(); expect(host.querySelector('[aria-label="Editor de plan de torre"]')).toBeNull();
    await click(button(host, "Volver a la versión actual"));
    expect(host.textContent).not.toContain("Versión anterior del plan"); expect(button(host, "Preparar baja del plan")).not.toBeNull();
    expect(request.mock.calls.some(([path]) => String(path).endsWith("/revisions/1"))).toBe(true);
    expect(request.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
  });
  it("muestra tres estados reales como propuestas, con costes informados y sin progreso de compra", () => {
    const plan = saved();
    plan.snapshot.stages = ["ready", "blocked", "requires_verification"].map((status, index) => ({ ...plan.snapshot.stages[0], position: index + 1, name: `Cambio ${index + 1}`, status: status as "ready" | "blocked" | "requires_verification", evaluation: { ...plan.snapshot.stages[0].evaluation, verdict: (["compatible", "incompatible", "requiere_verificacion"] as const)[index] }, cost: { ...plan.snapshot.cost, total_ars: index === 2 ? null : "900719925474099300.19" }, cumulative_cost: { ...plan.snapshot.cost, total_ars: index === 2 ? null : "900719925474099301.21" } }));
    plan.snapshot.cost = { ...plan.snapshot.cost, total_ars: "900719925474099302.23", within_budget: false };
    plan.snapshot.stages[0].evaluation.rule_results = [{ rule_id: "T04", family: "case", state: "not_applicable", facts: [], evidence: [], conditions: [], missing_fields: [] }];
    const before = JSON.stringify(plan), html = renderToStaticMarkup(<TowerPlanView plan={plan} now={0} />);
    const root = document.createElement("div"); root.innerHTML = html;
    expect(root.querySelectorAll(".plan-reading-stage")).toHaveLength(3);
    expect(root.querySelectorAll("details[open]")).toHaveLength(0);
    const visible = root.cloneNode(true) as HTMLElement;
    visible.querySelectorAll("details").forEach(detail => detail.remove());
    const brief = visible.textContent!;
    for (const text of ["Cantidad explícita: 1", "Costo por confirmar", "No pudimos revisar todo: todavía no confirma que encaje", "Encaja", "No encaja", "Falta un dato", "No evaluado: Largo de la gráfica. No es un dato que falte", "Plan bloqueado", "Plan pendiente de verificación", "Listo según el servidor", "2 con precio completo", "1 con costo por confirmar", "Así quedaría tu plan", "Tu PC con todo el plan", "Para el uso de todos los días", "Supera el presupuesto guardado"]) expect(brief).toContain(text);
    expect(brief).not.toContain("Antes de esta etapa");
    expect(brief).not.toMatch(/Hecha|Comprada|Ya compraste|etapas compradas|snapshot|coverage|schema|PASS/);
    expect(root.querySelector("progress,[role=progressbar]")).toBeNull();
    expect(root.querySelectorAll("[aria-current=step]")).toHaveLength(1); expect(brief).toContain("Paso actual");
    expect(root.querySelectorAll(".plan-stage-number")).toHaveLength(3);
    expect(root.querySelectorAll(".accordion.plan-stage")).toHaveLength(3);
    expect(html).toContain('<details class="stage-technical-evaluation">'); expect(html).toContain('<details class="plan-comparison">');
    expect(brief).toContain("900.719.925.474.099.300,19"); expect(brief).toContain("900.719.925.474.099.301,21"); expect(brief).toContain("900.719.925.474.099.302,23");
    expect(html).toContain("Antes de esta etapa"); expect(html).toContain("Costo acumulado hasta etapa 3"); expect(html).toContain("Versiones, cobertura completa y copia evaluada"); expect(JSON.stringify(plan)).toBe(before);
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
  it("autocompleta el modelo propio con el catálogo, sin elegir la primera coincidencia", async () => {
    vi.useFakeTimers();
    const part = { id: "gpu-1", category: "gpu" as const, name: "RTX 4060", attributes: {}, sources: [], prices: [], image: null };
    const request = vi.fn<typeof fetch>().mockImplementation(async input => {
      const url = String(input);
      if (url.startsWith("/api/catalog/components?")) return Response.json({ dataset_version: "v1", items: [part], total: 1, page: 1, page_size: 8 });
      if (url === "/api/catalog/components/gpu-1") return Response.json(part);
      throw new Error(`Solicitud inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", request);
    const host = await mount(<TowerPlanActionEditor pc={pc()} disabled={false} onAdd={() => {}} />);
    await type(byLabel(host, "Qué pieza querés cambiar"), "gpu");
    const input = byLabel(host, "Modelo de la pieza") as HTMLInputElement;
    await type(input, "RTX");
    expect(request).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(260); });
    expect(request.mock.calls.some(([url]) => String(url).includes("q=RTX") && String(url).includes("category=gpu"))).toBe(true);
    expect(host.querySelector('[role="listbox"]')).not.toBeNull();
    expect(host.querySelector('[role="option"][aria-selected="true"]')).toBeNull();
    await act(async () => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })); });
    expect(input.getAttribute("aria-activedescendant")).toBe(host.querySelector('[role="option"]')?.id);
    await act(async () => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await Promise.resolve(); });
    expect(host.textContent).toContain("Selección actual");
    expect(request.mock.calls.some(([url]) => String(url) === "/api/catalog/components/gpu-1")).toBe(true);
    vi.useRealTimers();
  });
  it("deja el texto libre como modelo declarado si no se elige una sugerencia", async () => {
    const onAdd = vi.fn();
    const host = await mount(<TowerPlanActionEditor pc={pc()} disabled={false} onAdd={onAdd} />);
    await type(byLabel(host, "Modelo de la pieza"), "Placa rara sin ficha");
    await type(byLabel(host, "Cantidad de la pieza 1"), "1");
    await click(button(host, "Sumar el cambio a esta etapa"));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0].candidates[0]).toMatchObject({ component_id: null, declared_model: "Placa rara sin ficha", quantity: 1 });
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
    expect(html).toContain("Versión anterior del plan"); expect(html).toContain("Este plan se guardó 1 vez · tu PC cambió 1 vez"); expect(html).not.toMatch(/revisión \d|snapshot/i); expect(html).toContain("Cotizaciones conservadas de esta versión"); expect(html).toContain("123,45"); expect(html).toContain("https://example.com/synthetic"); expect(html).toContain("Costo acumulado hasta etapa 2"); expect(html).toContain("Total desconocido / incompleto"); expect(html).toContain("Consultar no actualiza precios ni reserva stock"); expect(JSON.stringify(plan)).toBe(before);
    expect(html).toContain("Estado original del precio"); expect(html).toContain("fresh"); expect(html).toContain("El precio guardado venció"); expect(plan.snapshot.stages[0].offers[0].status).toBe("fresh");
    expect(html).toContain('class="saved-plan-layout"'); expect(html).toContain('aria-label="Decisión sobre el plan"'); expect(html).toContain("Sólo se cobran las acciones de compra, no las piezas conservadas"); expect(html).toContain("Cantidad explícita: 1");
    expect(html).toContain('aria-label="Comparación del plan"'); expect(html).toContain("Base del plan"); expect(html).toContain("Resultado propuesto");
    expect(html).toContain("Configuración del plan, no prueba de hardware poseído"); expect(html).not.toContain("1080p"); expect(html).not.toContain("500 W");
    const edited = planDraftFromRead(plan, pc(), "current-catalog"); expect(edited.stages.every(stage => !stage.materials.length)).toBe(true); expect(plan.snapshot.stages[0].materials).toHaveLength(1);
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(plan)); await towerPlanRequest(`/${other}/revisions/1`, "GET", undefined, undefined, request);
    expect(request).toHaveBeenCalledTimes(1); expect(request.mock.calls[0][1]!.method).toBe("GET"); expect(request.mock.calls[0][1]!.body).toBeUndefined();
  });
  it("deriva hecha, actual y pendiente desde stage_keys y progress; sin marcas la primera es la actual", () => {
    const plan = saved(); plan.snapshot.stages = [...plan.snapshot.stages, { ...plan.snapshot.stages[0], position: 3 }]; plan.stage_keys = ["a".repeat(64), "b".repeat(64), "c".repeat(64)];
    expect(planStageStates(plan)).toEqual(["actual", "pendiente", "pendiente"]);
    expect(planStageStates(plan, { ["a".repeat(64)]: "2026-11-05T10:00:00Z" })).toEqual(["hecha", "actual", "pendiente"]);
    expect(planStageStates(plan, { ["a".repeat(64)]: "x", ["c".repeat(64)]: "x" })).toEqual(["hecha", "actual", "hecha"]);
    expect(planStageStates(plan, { ["d".repeat(64)]: "x" })).toEqual(["actual", "pendiente", "pendiente"]);
    expect(planStageStates(plan, { ["a".repeat(64)]: "x" }, true)).toEqual(["propuesta", "propuesta", "propuesta"]);
    expect(planProgressSummary(["hecha", "hecha", "actual", "pendiente", "pendiente"])).toBe("2 de 5 etapas compradas"); expect(planProgressSummary(["hecha"])).toBe("1 de 1 etapa comprada"); expect(planProgressSummary(["actual", "pendiente"])).toBeNull();
  });
  it("muestra Ya lo compré / Deshacer y el resumen solo en la versión actual", () => {
    const plan = saved(); plan.progress = { ["a".repeat(64)]: "2026-11-05T10:00:00Z" };
    const root = document.createElement("div"); root.innerHTML = renderToStaticMarkup(<TowerPlanView plan={plan} now={0} onProgress={() => {}} />);
    const labels = Array.from(root.querySelectorAll("button")).map(item => item.textContent);
    expect(labels).toContain("Deshacer"); expect(labels.filter(label => label === "Ya lo compré")).toHaveLength(1);
    expect(root.textContent).toContain("1 de 2 etapas compradas"); expect(root.textContent).toContain("Hecha"); expect(root.textContent).toContain("Paso actual");
    const aside = root.querySelector(".plan-reading-aside")!.cloneNode(true) as HTMLElement; aside.querySelectorAll("details").forEach(detail => detail.remove());
    expect(aside.textContent).not.toMatch(/snapshot|schema|revisión \d|[0-9a-f]{64}/i); expect(root.querySelector(".plan-reading-stages")!.textContent).not.toMatch(/[0-9a-f]{64}/);
    const history = document.createElement("div"); history.innerHTML = renderToStaticMarkup(<TowerPlanView plan={plan} now={0} historical onProgress={() => {}} />);
    expect(Array.from(history.querySelectorAll("button")).some(item => /Ya lo compré|Deshacer/.test(item.textContent ?? ""))).toBe(false);
    expect(history.textContent).not.toMatch(/etapas compradas|Hecha|Paso actual/); expect(history.textContent).toContain("Cambio propuesto");
  });
  it("marca y desmarca con CSRF, sin cuerpo ni user_id, y muestra el progreso confirmado por el servidor", async () => {
    const plan = saved(), first = "a".repeat(64); let progress: Record<string, string> = {};
    const request = vi.fn<typeof fetch>().mockImplementation(async (input, options) => {
      const path = String(input);
      if (path === "/api/tower-plans?page=1&page_size=20") return Response.json({ items: [plan], total: 1, page: 1, page_size: 20 });
      if (path === `/api/tower-plans/${other}`) return Response.json(plan);
      if (path === "/api/auth/csrf") return Response.json({ csrf_token: "synthetic" });
      if (path === `/api/tower-plans/${other}/stages/${first}/progress`) { progress = options?.method === "PUT" ? { [first]: "2026-11-05T10:00:00Z" } : {}; return Response.json({ kind: "tower_plan_progress", plan_id: other, revision: 1, progress }); }
      throw new Error(`Solicitud inesperada: ${path}`);
    });
    vi.stubGlobal("fetch", request);
    const host = await mount(<TowerPlans initialId={other} />); await settle();
    expect(host.textContent).not.toContain("etapas compradas");
    await click(button(host, /^Ya lo compré: Stage1$/));
    expect(host.textContent).toContain("1 de 2 etapas compradas"); expect(button(host, /^Deshacer: Stage1$/)).not.toBeNull();
    const writes = request.mock.calls.filter(([path]) => String(path).includes("/progress"));
    expect(writes).toHaveLength(1); expect(writes[0][1]!.method).toBe("PUT"); expect(writes[0][1]!.body).toBeUndefined(); expect((writes[0][1]!.headers as Headers).get("X-CSRF-Token")).toBe("synthetic");
    expect(JSON.stringify(request.mock.calls)).not.toContain("user_id");
    await click(button(host, /^Deshacer: Stage1$/));
    expect(host.textContent).not.toContain("etapas compradas"); expect(button(host, /^Ya lo compré: Stage1$/)).not.toBeNull();
    expect(request.mock.calls.filter(([path]) => String(path).includes("/progress")).map(([, options]) => options?.method)).toEqual(["PUT", "DELETE"]);
  });
  it("si falla marcar, muestra un aviso y conserva el plan sin inventar marcas ni reintentar", async () => {
    const plan = saved(), first = "a".repeat(64);
    const request = vi.fn<typeof fetch>().mockImplementation(async input => {
      const path = String(input);
      if (path === "/api/tower-plans?page=1&page_size=20") return Response.json({ items: [plan], total: 1, page: 1, page_size: 20 });
      if (path === `/api/tower-plans/${other}`) return Response.json(plan);
      if (path === "/api/auth/csrf") return Response.json({ csrf_token: "synthetic" });
      if (path === `/api/tower-plans/${other}/stages/${first}/progress`) return Response.json({ detail: "private" }, { status: 503 });
      throw new Error(`Solicitud inesperada: ${path}`);
    });
    vi.stubGlobal("fetch", request);
    const host = await mount(<TowerPlans initialId={other} />); await settle();
    await click(button(host, /^Ya lo compré: Stage1$/));
    const alert = host.querySelector('[role="alert"]'); expect(alert?.textContent).toContain("No pudimos confirmar el cambio"); expect(alert?.textContent).not.toContain("private");
    expect(host.querySelector('[aria-label="Detalle de plan de torre"]')).not.toBeNull(); expect(button(host, /^Ya lo compré: Stage1$/)).not.toBeNull(); expect(host.textContent).not.toContain("etapas compradas");
    expect(request.mock.calls.filter(([path]) => String(path).includes("/progress"))).toHaveLength(1);
  });
  it("setStageProgress rechaza ids y claves inválidas antes de enviar y valida la respuesta", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async path => path === "/api/auth/csrf" ? Response.json({ csrf_token: "synthetic" }) : Response.json({ kind: "tower_plan_progress", progress: { nope: "x" } }));
    await expect(setStageProgress(other, "A".repeat(64), true, undefined, request)).rejects.toThrow(); await expect(setStageProgress("no-uuid", "a".repeat(64), true, undefined, request)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
    await expect(setStageProgress(other, "a".repeat(64), true, undefined, request)).rejects.toThrow("Respuesta de progreso inválida.");
  });
  it("cancel save ignores late response without pretending rollback or applying PC", async () => {
    let finish: ((response: Response) => void) | undefined;
    const onSaved = vi.fn(), onState = vi.fn<(state: PlanWriteState) => void>();
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ csrf_token: "synthetic" })).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    const controller = createTowerPlanWriter({ onSaved, onState, request, uuid: () => id }); const pending = controller.save(draft()); await vi.waitFor(() => expect(finish).toBeTypeOf("function")); controller.cancel(); finish!(Response.json(saved(), { status: 201 })); await pending;
    expect(onSaved).not.toHaveBeenCalled(); expect(onState.mock.calls.at(-1)?.[0].phase).toBe("uncertain"); expect(request.mock.calls.some(call => String(call[0]).startsWith("/api/towers"))).toBe(false); controller.dispose();
  });
});
