import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { test } from "./fixtures";
import { loginBasic } from "../support/basic-scope";
import { emptyTower, type Tower } from "../../lib/towers";
import { towerPlanInput, type TowerPlanRead, type TowerPlanRecalculate } from "../../lib/tower-plans";
import type { TowerCatalogPage } from "../../lib/tower-catalog";
import type { TowerRecommendationPreview } from "../../lib/tower-recommendations";
import type { Locator, Page, Response as BrowserResponse } from "@playwright/test";
test.use({ trace: "off", screenshot: "off", video: "off" });
async function api(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") { const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json(); headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json"; }
    const response = await fetch(args.path, { method: args.method, cache: "no-store", headers, body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}
async function submitPlanWithDiagnostic(page: Page, editor: Locator, button: string, path: string, postCount: () => number, expectedCount: number): Promise<BrowserResponse> {
  // Observe only real browser traffic. A client validator must not burn the
  // whole30s waiting for a POST that it never sent, leaving cleanup no time.
  let resolveResponse!: (response: BrowserResponse) => void;
  const received = new Promise<BrowserResponse>(resolve => { resolveResponse = resolve; });
  const observe = (response: BrowserResponse) => { if (new URL(response.url()).pathname === path && response.request().method() === "POST") resolveResponse(response); };
  page.on("response", observe);
  try {
    await editor.getByRole("button", { name: button, exact: true }).click();
    await expect.poll(async () => {
      const count = postCount(); if (count !== expectedCount - 1) return count === expectedCount ? "POST observado" : `Cantidad inesperada de POST: ${count}`;
      const alert = page.getByRole("alert", { name: "Estado de guardado del plan", exact: true });
      return await alert.count() ? `Validación local, sin POST: ${await alert.textContent()}` : "Esperando emisión de POST";
    }, { message: "Debe emitirse exactamente un POST real; si hay rechazo local se informa antes del timeout total" }).toBe("POST observado");
    return await received;
  } finally { page.off("response", observe); }
}
test("@tower07 propuesta real→borrador→etapas→save explícito→revisión/historia sin aplicar PC", async ({ page }) => {
  await loginBasic(page);
  const input = emptyTower(); input.name = "PC propia CU07"; input.category_status.cpu = "present"; input.category_status.gpu = "present";
  input.lines = [{ line_id: null, category: "cpu", component_id: "P01", declared_model: null, quantity: 1 }, { line_id: null, category: "gpu", component_id: "P06", declared_model: null, quantity: 1 }];
  const created = await api(page, "/api/towers", "POST", input); expect(created.status).toBe(201); const own = created.data as Tower;
  let saved: TowerPlanRead | null = null, planPosts = 0, pcWrites = 0;
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.startsWith("/api/tower-plans")) planPosts++;
    if (["POST", "PUT", "DELETE"].includes(request.method()) && (path === "/api/towers" || path === `/api/towers/${own.id}`)) pcWrites++;
  });
  try {
    await page.goto("/pcs"); await page.getByRole("button", { name: input.name, exact: true }).click();
    const criteria = page.getByRole("form", { name: "Objetivo y presupuesto de torre", exact: true });
    await criteria.getByLabel("Objetivo de mejora", { exact: true }).selectOption("gaming"); await criteria.getByLabel("Presupuesto ARS (punto decimal, sin miles)", { exact: true }).fill("0.01");
    const recommendation = page.waitForResponse(response => response.url().endsWith(`/api/towers/${own.id}/recommendations/preview`) && response.request().method() === "POST");
    await criteria.getByRole("button", { name: "Buscar propuestas para mi torre", exact: true }).click(); const response = await recommendation; expect(response.status()).toBe(200); const preview = await response.json() as TowerRecommendationPreview;
    expect(preview.items.length, "Prerequisite: an actual published proposal, not a fabricated positive plan").toBeGreaterThan(0);
    test.info().annotations.push({ type: "canonical-action-shape", description: JSON.stringify(preview.items[0].actions.map(action => ({ action: action.action, category: action.category, line_id_present: Object.hasOwn(action, "line_id"), candidate_context_present: Object.hasOwn(action, "candidate_context") }))) });
    await page.getByRole("region", { name: "Propuestas de torre del servidor", exact: true }).getByRole("button", { name: "Preparar plan por etapas (no guardar)", exact: true }).first().click();
    const editor = page.getByRole("form", { name: "Editor de plan de torre", exact: true }); await expect(editor).toBeVisible(); expect(planPosts).toBe(0);
    await editor.getByLabel("Nombre del plan", { exact: true }).fill("Mi plan propio CU07");
    await editor.getByRole("button", { name: "Agregar etapa", exact: true }).click();
    const second = editor.getByRole("region", { name: "Editar etapa 2", exact: true });
    await second.getByLabel("Presupuesto ARS de etapa 2", { exact: true }).fill("10.00");
    await expect(second.getByLabel("Confirmé pasta térmica disponible para etapa 2", { exact: true })).not.toBeChecked();
    await second.getByText("Agregar acción a etapa 2", { exact: true }).click();
    await second.getByLabel("Categoría de acción del plan", { exact: true }).selectOption("storage");
    await second.getByLabel("Modelo de acción 1", { exact: true }).fill("Disco propio por confirmar, sin ficha técnica");
    await expect(second.getByLabel("Cantidad para acción 1", { exact: true })).toHaveValue("");
    await second.getByLabel("Cantidad para acción 1", { exact: true }).fill("1");
    await second.getByRole("button", { name: "Agregar acción a esta etapa", exact: true }).click(); expect(planPosts).toBe(0);
    await editor.getByLabel("Revisé etapas, cantidades y contexto; confirmo guardar sin modificar mi PC", { exact: true }).check();
    const saveResponse = await submitPlanWithDiagnostic(page, editor, "Confirmar y guardar mi plan", "/api/tower-plans", () => planPosts, 1); expect(saveResponse.status()).toBe(201); saved = await saveResponse.json() as TowerPlanRead;
    expect(saved.snapshot.stages).toHaveLength(2); expect(saved.snapshot.stages[1].materials).toEqual([]); expect(saved.snapshot.status).not.toBe("ready"); expect(planPosts).toBe(1); expect(pcWrites).toBe(0);
    const firstSnapshot = saved.snapshot;
    expect((await api(page, `/api/towers/${own.id}`)).data).toEqual(own);
    await page.goto(`/tower-plans/${saved.id}`); await expect(page.getByRole("region", { name: "Detalle de plan de torre", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Preparar un NUEVO borrador con PC y catálogo actuales (reemplaza borrador sin guardar)", exact: true }).click();
    const recalculation = page.getByRole("form", { name: "Editor de plan de torre", exact: true }); await expect(recalculation).toBeVisible();
    await recalculation.getByLabel("Nombre del plan", { exact: true }).fill("Mi plan propio CU07 revisado");
    await recalculation.getByLabel("Revisé etapas, cantidades y contexto; confirmo guardar sin modificar mi PC", { exact: true }).check();
    const updated = await submitPlanWithDiagnostic(page, recalculation, "Confirmar recálculo y guardar nueva revisión", `/api/tower-plans/${saved.id}/recalculate`, () => planPosts, 2); expect(updated.ok()).toBe(true); const current = await updated.json() as TowerPlanRead;
    expect(current.revision).toBe(saved.revision + 1); saved = current; expect(planPosts).toBe(2); expect(pcWrites).toBe(0);
    await page.getByLabel("Revisión histórica", { exact: true }).fill("1");
    const history = page.waitForResponse(item => item.url().endsWith(`/api/tower-plans/${saved!.id}/revisions/1`) && item.request().method() === "GET");
    await page.getByRole("button", { name: "Consultar revisión histórica", exact: true }).click(); const historical = await history; expect(historical.status()).toBe(200); const revision1 = await historical.json() as TowerPlanRead;
    expect(revision1.snapshot).toEqual(firstSnapshot); await expect(page.getByRole("region", { name: "Revisión histórica de plan", exact: true })).toContainText("Historial inmutable");
    expect((await api(page, `/api/towers/${own.id}`)).data).toEqual(own); expect(planPosts).toBe(2); expect(pcWrites).toBe(0);
    await page.getByRole("button", { name: "Volver a revisión actual", exact: true }).click();
    await page.getByRole("button", { name: "Preparar baja del plan", exact: true }).click();
    const deactivation = page.getByRole("form", { name: "Confirmar baja de plan de torre", exact: true });
    await expect(deactivation).toContainText("El historial se conserva; no es borrado físico");
    const confirmation = deactivation.getByLabel("Confirmo dar de baja este plan", { exact: true });
    await expect(confirmation).not.toBeChecked(); await expect(confirmation).toHaveJSProperty("required", true);
    await expect(deactivation.getByRole("button", { name: "Dar de baja el plan", exact: true })).toBeVisible();
    await deactivation.getByRole("button", { name: "Cancelar baja del plan", exact: true }).click();
    await expect(deactivation).toHaveCount(0); expect(planPosts).toBe(2); expect(pcWrites).toBe(0);
  } finally {
    try { if (saved) { const latest = await api(page, `/api/tower-plans/${saved.id}`); if (latest.status === 200) expect((await api(page, `/api/tower-plans/${saved.id}`, "DELETE", { expected_plan_revision: latest.data.revision })).status).toBe(204); else expect(latest.status).toBe(404); } }
    finally { expect((await api(page, `/api/towers/${own.id}`, "DELETE")).status).toBe(204); }
  }
});

test("@tower07-reprepare preparación explícita reemplaza sesión, toma revisión PC nueva y limpia materiales/consentimiento", async ({ page }) => {
  await loginBasic(page);
  const input = { ...emptyTower(), name: "PC propia reprepare" };
  const created = await api(page, "/api/towers", "POST", input); expect(created.status).toBe(201); const own = created.data as Tower;
  let plan: TowerPlanRead | null = null, planPosts = 0, pcWrites = 0;
  try {
    const catalog = await api(page, "/api/catalog/components?page=1&page_size=1"); expect(catalog.status).toBe(200);
    const createBody = towerPlanInput({ name: "Plan propio reprepare", pc_id: own.id, expected_pc_revision: own.revision, expected_catalog_version: (catalog.data as TowerCatalogPage).dataset_version, objective: "general", workload: null, budget_ars: "1000.00", price_condition: "cash", stages: [{ name: "Primera etapa", budget_ars: "1000.00", materials: [], actions: [{ action: "replace_category", category: "storage", line_id: null, candidates: [{ component_id: null, declared_model: "Disco propio por confirmar, sin ficha técnica", quantity: 1 }] }] }] }, randomUUID());
    // Real setup plan with declared hardware and unknown evidence, not a fake
    // quote/evaluation or a replay of the accepted recommendation/provider tests.
    const stored = await api(page, "/api/tower-plans", "POST", createBody); expect(stored.status).toBe(201); plan = stored.data as TowerPlanRead; expect(plan.snapshot.status).not.toBe("ready");
    page.on("request", request => {
      const path = new URL(request.url()).pathname;
      if (request.method() === "POST" && path.startsWith("/api/tower-plans")) planPosts++;
      if (["POST", "PUT", "DELETE"].includes(request.method()) && (path === "/api/towers" || path === `/api/towers/${own.id}`)) pcWrites++;
    });
    await page.goto(`/tower-plans/${plan.id}`);
    const prepare = page.getByRole("button", { name: "Preparar un NUEVO borrador con PC y catálogo actuales (reemplaza borrador sin guardar)", exact: true });
    await prepare.click();
    const editor = page.getByRole("form", { name: "Editor de plan de torre", exact: true }); await expect(editor).toBeVisible();
    const material = editor.getByLabel("Confirmé pasta térmica disponible para etapa 1", { exact: true }), consent = editor.getByLabel("Revisé etapas, cantidades y contexto; confirmo guardar sin modificar mi PC", { exact: true });
    await editor.getByLabel("Nombre del plan", { exact: true }).fill("Borrador anterior sin guardar");
    await material.check(); await consent.check(); await expect(material).toBeChecked(); await expect(consent).toBeChecked(); expect(planPosts).toBe(0);
    // Explicit edit of this test's own PC, equivalent to another tab. The plan
    // flow must never perform this write or keep the old expected revision.
    const updated = await api(page, `/api/towers/${own.id}`, "PUT", { ...input, name: "PC propia revisión nueva", revision: own.revision }); expect(updated.status).toBe(200); const freshPC = updated.data as Tower;
    expect(freshPC.revision).toBe(own.revision + 1); expect(pcWrites).toBe(1);
    await prepare.click();
    await expect(editor.getByLabel("Nombre del plan", { exact: true })).toHaveValue(plan.name);
    await expect(material).not.toBeChecked(); await expect(consent).not.toBeChecked();
    await expect(editor).toContainText(`Revisión PC: ${freshPC.revision}`);
    await expect(editor.getByRole("button", { name: "Confirmar recálculo y guardar nueva revisión", exact: true })).toBeDisabled();
    expect(planPosts).toBe(0); expect(pcWrites).toBe(1);
    await consent.check();
    const response = await submitPlanWithDiagnostic(page, editor, "Confirmar recálculo y guardar nueva revisión", `/api/tower-plans/${plan.id}/recalculate`, () => planPosts, 1);
    expect(response.ok()).toBe(true);
    const body = response.request().postDataJSON() as TowerPlanRecalculate;
    expect(body.expected_pc_revision).toBe(freshPC.revision); expect(body.expected_plan_revision).toBe(plan.revision);
    expect(body.stages[0].materials).toEqual([]); expect(body.name).toBe(plan.name); expect(body.client_request_id).not.toBe(createBody.client_request_id);
    plan = await response.json() as TowerPlanRead; expect(plan.snapshot.pc_revision).toBe(freshPC.revision); expect(planPosts).toBe(1); expect(pcWrites).toBe(1);
    expect((await api(page, `/api/towers/${own.id}`)).data).toEqual(freshPC);
  } finally {
    try { if (plan) { const latest = await api(page, `/api/tower-plans/${plan.id}`); if (latest.status === 200) expect((await api(page, `/api/tower-plans/${plan.id}`, "DELETE", { expected_plan_revision: latest.data.revision })).status).toBe(204); else expect(latest.status).toBe(404); } }
    finally { expect((await api(page, `/api/towers/${own.id}`, "DELETE")).status).toBe(204); }
  }
});
