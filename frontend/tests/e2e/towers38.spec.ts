import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { loginBasic, basicApi, demoInput } from "../support/basic-scope";
import { emptyTower, type Tower } from "../../lib/towers";
import type { Page, Locator } from "@playwright/test";
import type { TowerCatalogPage } from "../../lib/tower-catalog";
import type { TowerEvaluation, TowerSimulation } from "../../lib/tower-compatibility";

test.use({ trace: "off", screenshot: "off", video: "off" });
async function openBiosSimulation(page: Page, own: Tower) {
  await page.goto("/pcs"); await page.getByRole("button", { name: own.name, exact: true }).click();
  await page.getByText("Comparación manual: simular cambios sin guardar", { exact: true }).click();
  const form = page.getByRole("form", { name: "Simulación manual de torre", exact: true });
  await form.getByLabel("Categoría de la acción", { exact: true }).selectOption("motherboard");
  const catalog = await page.evaluate(async () => {
    const response = await fetch("/api/catalog/components?category=motherboard&page=1&page_size=12&sort=retail_first", { cache: "no-store" });
    const data = await response.json() as TowerCatalogPage;
    return { status: response.status, items: data.items?.map(item => ({ id: item.id, name: item.name })) ?? [] };
  });
  expect(catalog.status).toBe(200);
  // Pick two distinct, publicly served models only for this test's own PC.
  // This does not filter the production selector's catalog or invent attributes.
  const boards = catalog.items.filter((part, index, all) => all.findIndex(other => other.name === part.name) === index);
  expect(boards.length, "BIOS transition test needs two real motherboard references").toBeGreaterThanOrEqual(2);
  return { form, boards: boards.slice(0, 2) };
}
async function observeBiosSimulation(page: Page, form: Locator, id: string): Promise<TowerSimulation> {
  const sent = page.waitForRequest(request => request.url().endsWith(`/api/towers/${id}/simulate`) && request.method() === "POST");
  const received = page.waitForResponse(response => response.url().endsWith(`/api/towers/${id}/simulate`) && response.request().method() === "POST");
  await form.getByRole("button", { name: "Simular sin guardar", exact: true }).click();
  const body = (await sent).postDataJSON() as TowerSimulation;
  expect((await received).status()).toBe(200);
  return body;
}
test("@tower05-bios cambiar placa A a B limpia BIOS; cantidad/misma placa no la borran", async ({ page }) => {
  await loginBasic(page);
  const created = await towerApi(page, "", "POST", { ...emptyTower(), name: "PC propia transición BIOS" }); expect(created.status).toBe(201); const own = created.data as Tower;
  try {
    const { form, boards: [a, b] } = await openBiosSimulation(page, own);
    await form.getByLabel("Identificación candidata 1", { exact: true }).selectOption("catalog");
    const selector = form.getByRole("region", { name: "Selector de Placa madre", exact: true });
    await selector.getByRole("button", { name: a.name, exact: true }).click();
    const bios = form.getByLabel("BIOS candidata (vacío = desconocida)", { exact: true }); await bios.fill("P2.30");
    await form.getByLabel("Cantidad candidata 1 (unidades)", { exact: true }).fill("1"); await expect(bios).toHaveValue("P2.30");
    await selector.getByRole("button", { name: a.name, exact: true }).click(); await expect(bios).toHaveValue("P2.30");
    await selector.getByRole("button", { name: b.name, exact: true }).click(); await expect(bios).toHaveValue("");
    const body = await observeBiosSimulation(page, form, own.id);
    expect(body.actions).toHaveLength(1); expect(body.actions[0].candidates[0].component_id).toBe(b.id); expect(body.actions[0].candidate_context).toEqual({ bios_version: null });
    expect((await towerApi(page, `/${own.id}`)).data).toEqual(own);
  } finally { expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204); }
});
test("@tower05-bios agregar acción retiene BIOS explícita de A pero no la hereda a segunda B", async ({ page }) => {
  await loginBasic(page);
  const created = await towerApi(page, "", "POST", { ...emptyTower(), name: "PC propia secuencia BIOS" }); expect(created.status).toBe(201); const own = created.data as Tower;
  try {
    const { form, boards: [a, b] } = await openBiosSimulation(page, own);
    await form.getByLabel("Identificación candidata 1", { exact: true }).selectOption("catalog");
    await form.getByRole("region", { name: "Selector de Placa madre", exact: true }).getByRole("button", { name: a.name, exact: true }).click();
    const bios = form.getByLabel("BIOS candidata (vacío = desconocida)", { exact: true }); await bios.fill("P2.30");
    await form.getByRole("button", { name: "Agregar acción a la secuencia", exact: true }).click();
    await expect(bios).toHaveValue("");
    await form.getByLabel("Identificación candidata 1", { exact: true }).selectOption("catalog");
    await form.getByRole("region", { name: "Selector de Placa madre", exact: true }).getByRole("button", { name: b.name, exact: true }).click();
    await expect(bios).toHaveValue(""); await form.getByRole("button", { name: "Agregar acción a la secuencia", exact: true }).click();
    const body = await observeBiosSimulation(page, form, own.id);
    expect(body.actions).toHaveLength(2);
    expect(body.actions[0].candidates[0].component_id).toBe(a.id); expect(body.actions[0].candidate_context).toEqual({ bios_version: "P2.30" });
    expect(body.actions[1].candidates[0].component_id).toBe(b.id); expect(body.actions[1].candidate_context).toEqual({ bios_version: null });
    expect((await towerApi(page, `/${own.id}`)).data).toEqual(own);
  } finally { expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204); }
});
test("@tower05 torre desconocida y simulación manual real no guardan cambios", async ({ page }) => {
  await loginBasic(page);
  const draft = { ...emptyTower(), name: "Torre propia por confirmar" };
  const created = await towerApi(page, "", "POST", draft); expect(created.status).toBe(201);
  const own = created.data as Tower;
  try {
    await page.goto("/pcs"); await page.getByRole("button", { name: draft.name, exact: true }).click();
    const panel = page.getByRole("region", { name: "Comprobación de torre", exact: true });
    const evaluated = page.waitForResponse(response => response.url().endsWith(`/api/towers/${own.id}/evaluate`) && response.request().method() === "POST");
    await panel.getByRole("button", { name: "Comprobar mi PC", exact: true }).click();
    const response = await evaluated; expect(response.status()).toBe(200); const result: TowerEvaluation = await response.json();
    expect(result.verdict).toBe("requiere_verificacion"); expect(result.scope.id).toBe("cu05-tower-stock-1"); expect(result.rule_results).toHaveLength(12);
    await expect(panel.getByRole("region", { name: "Resultado de torre del servidor", exact: true })).toContainText("Faltan datos para comprobar tu torre");
    await panel.getByText("Comparación manual: simular cambios sin guardar", { exact: true }).click();
    const form = panel.getByRole("form", { name: "Simulación manual de torre", exact: true });
    await form.getByLabel("Categoría de la acción", { exact: true }).selectOption("storage");
    await form.getByLabel("Modelo candidato 1", { exact: true }).fill("Disco propio por confirmar");
    const simulated = page.waitForResponse(item => item.url().endsWith(`/api/towers/${own.id}/simulate`) && item.request().method() === "POST");
    await form.getByRole("button", { name: "Simular sin guardar", exact: true }).click();
    const simulation = await simulated; expect(simulation.status()).toBe(200); const copy: TowerEvaluation = await simulation.json();
    expect(copy.verdict).toBe("requiere_verificacion"); expect(copy.evaluated_configuration.lines.some(line => line.category === "storage" && line.declared_model === "Disco propio por confirmar")).toBe(true);
    expect((await towerApi(page, `/${own.id}`)).data).toEqual(own);
    await form.getByLabel("Modelo candidato 1", { exact: true }).fill("Otro disco por confirmar");
    await expect(panel.getByRole("status").filter({ hasText: "La propuesta manual cambió" })).toBeVisible();
    expect((await towerApi(page, `/${own.id}`)).data).toEqual(own);
  } finally { expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204); }
});
test("@tower05 fallo BIOS curado conserva faltantes de torre y no muta snapshot", async ({ page }) => {
  await loginBasic(page);
  // Original curated CPU/board fixture and explicit BIOS declaration already used
  // by the basic contract tests. No fabricated product attributes/geometry.
  const basic = demoInput("A"), draft = emptyTower(); draft.name = "Torre propia BIOS por revisar";
  draft.context = { bios_version: "P1.20", notes: null };
  draft.lines = basic.components.map(group => ({ ...group, line_id: null, declared_model: null }));
  for (const group of basic.components) draft.category_status[group.category] = "present";
  const created = await towerApi(page, "", "POST", draft); expect(created.status).toBe(201); const own = created.data as Tower;
  try {
    await page.goto("/pcs"); await page.getByRole("button", { name: draft.name, exact: true }).click();
    const panel = page.getByRole("region", { name: "Comprobación de torre", exact: true });
    const evaluated = page.waitForResponse(response => response.url().endsWith(`/api/towers/${own.id}/evaluate`) && response.request().method() === "POST");
    await panel.getByRole("button", { name: "Comprobar mi PC", exact: true }).click();
    const response = await evaluated; expect(response.status()).toBe(200); const result: TowerEvaluation = await response.json();
    expect(result.verdict).toBe("incompatible"); expect(result.rule_results.some(rule => rule.rule_id === "T01" && rule.state === "fail")).toBe(true); expect(result.missing_fields.length).toBeGreaterThan(0);
    await expect(panel.getByRole("region", { name: "Incompatibilidades conocidas", exact: true })).toBeVisible();
    await expect(panel.getByRole("region", { name: "Datos faltantes de torre", exact: true })).toBeVisible();
    expect((await towerApi(page, `/${own.id}`)).data).toEqual(own);
  } finally { expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204); }
});
async function towerApi(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
      headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/towers${args.path}`, { method: args.method, headers, cache: "no-store", body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}
test("@tower38 CRUD real: discos distintos, ventiladores, declarados, revisión y ownership", async ({ newIsolatedContext }) => {
  const a = await newIsolatedContext(), b = await newIsolatedContext(), page = await a.newPage(), other = await b.newPage();
  await loginBasic(page); await loginBasic(other);
  // Check persisted server sessions, not just login response codes. Never expose
  // identity/cookies in assertion output; the other page intentionally stays /account.
  for (const actor of [page, other]) {
    const sessionStatus = await actor.evaluate(async () => (await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })).status);
    expect(sessionStatus, "Each isolated actor must retain its authenticated server session").toBe(200);
  }
  let own: Tower | null = null;
  try {
    await page.goto("/pcs"); await page.getByRole("button", { name: "Nueva PC", exact: true }).click();
    const form = page.getByRole("form", { name: "Editor de PC", exact: true });
    await form.getByLabel("Nombre de PC", { exact: true }).fill("Torre sintética38");
    await expect(page, "Editor actor must remain on /pcs after filling the name").toHaveURL(/\/pcs$/);
    await expect(other, "Ownership actor remains on its separate account page").toHaveURL(/\/account$/);
    const editorSession = await page.evaluate(async () => (await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })).status);
    expect(editorSession, "Editor session must still be authenticated before category selection").toBe(200);
    await expect(form.getByLabel("Estado de Almacenamiento", { exact: true })).toHaveAttribute("id", "tower-status-storage");
    await form.getByLabel("Estado de Almacenamiento", { exact: true }).selectOption("present");
    for (const model of ["Disco declarado A", "Disco declarado B"]) {
      await form.getByRole("button", { name: "Agregar línea de Almacenamiento", exact: true }).click();
      await form.getByLabel("Modelo declarado de Almacenamiento", { exact: true }).last().fill(model);
    }
    await form.getByLabel("Estado de Ventiladores", { exact: true }).selectOption("present");
    await form.getByRole("button", { name: "Agregar línea de Ventiladores", exact: true }).click();
    await form.getByLabel("Modelo declarado de Ventiladores", { exact: true }).fill("Ventilador declarado");
    await form.getByLabel("Cantidad de unidades", { exact: true }).last().fill("3");
    const saved = page.waitForResponse(response => response.url().endsWith("/api/towers") && response.request().method() === "POST");
    await form.getByRole("button", { name: "Guardar PC", exact: true }).click();
    const response = await saved; expect(response.status()).toBe(201); own = await response.json() as Tower;
    expect(own.lines).toHaveLength(3); expect(own.lines.every(line => !!line.line_id)).toBe(true); expect(own.category_status.cpu).toBe("unknown"); expect(own.context.bios_version).toBeNull();
    expect((await towerApi(other, `/${own.id}`)).status).toBe(404);
    const input = { ...emptyTower(), name: own.name, category_status: own.category_status, lines: own.lines };
    expect((await towerApi(page, `/${own.id}`, "PUT", { ...input, revision: own.revision })).status).toBe(200);
    expect((await towerApi(page, `/${own.id}`, "PUT", { ...input, revision: own.revision })).status).toBe(409);
    expect((await basicApi(page, `/${own.id}`)).status).toBe(409);
    await expect(page.getByRole("button", { name: "Comprobar mi PC", exact: true })).toHaveCount(1);
  } finally { if (own) expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204); await a.close(); await b.close(); }
});
test("@tower38 lectura legacy no migra; primer guardado requiere conversión explícita", async ({ page }) => {
  await loginBasic(page);
  const result = await basicApi(page, "", "POST", demoInput("A")); expect(result.status).toBe(201);
  const id: string = result.data.id;
  try {
    const first = await towerApi(page, `/${id}`), second = await towerApi(page, `/${id}`);
    expect(first.data).toEqual(second.data); expect(first.data.origin_schema).toBe(1); expect((await basicApi(page, `/${id}`)).status).toBe(200);
    await page.goto("/pcs"); await page.getByRole("button", { name: result.data.name, exact: true }).click();
    await page.getByRole("button", { name: "Editar PC", exact: true }).click();
    const form = page.getByRole("form", { name: "Editor de PC", exact: true });
    await expect(form.getByLabel("Confirmo convertir esta configuración a torre schema2 al guardar", { exact: true })).not.toBeChecked();
    await form.getByLabel("Confirmo convertir esta configuración a torre schema2 al guardar", { exact: true }).check();
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/towers/${id}`) && response.request().method() === "PUT");
    await form.getByRole("button", { name: "Guardar PC", exact: true }).click(); expect((await saved).status()).toBe(200);
    expect((await towerApi(page, `/${id}`)).data.origin_schema).toBe(2); expect((await basicApi(page, `/${id}`)).status).toBe(409);
  } finally { expect((await towerApi(page, `/${id}`, "DELETE")).status).toBe(204); }
});
test("@tower38-catalog ID posterior a50 se resuelve realmente fuera de la primera página", async ({ page }) => {
  await loginBasic(page); await page.goto("/pcs");
  const beyond = await page.evaluate(async () => {
    const response = await fetch("/api/catalog/components?page=2&page_size=50", { cache: "no-store" });
    return { status: response.status, data: await response.json() as TowerCatalogPage };
  });
  expect(beyond.status).toBe(200); expect(beyond.data.total, "Gate requiere catálogo real con más de50 registros; no se fabrican piezas").toBeGreaterThan(50);
  const part = beyond.data.items[0]; expect(part).toBeTruthy();
  const draft = emptyTower(); draft.name = "Referencia posterior a50"; draft.category_status[part.category] = "present";
  draft.lines = [{ line_id: null, category: part.category, component_id: part.id, declared_model: null, quantity: 1 }];
  const created = await towerApi(page, "", "POST", draft); expect(created.status).toBe(201);
  try {
    await page.reload(); await page.getByRole("button", { name: draft.name, exact: true }).click();
    await expect(page.getByRole("region", { name: "Detalle de PC", exact: true })).toContainText(part.name);
    await page.getByRole("button", { name: "Editar PC", exact: true }).click();
    const selector = page.getByRole("region", { name: /Selector de/ }); await expect(selector).toContainText(part.name);
    await selector.getByRole("textbox").fill(part.name.slice(0, 60)); await selector.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(selector.getByRole("button", { name: part.name, exact: true })).toBeVisible();
  } finally { expect((await towerApi(page, `/${created.data.id}`, "DELETE")).status).toBe(204); }
});
