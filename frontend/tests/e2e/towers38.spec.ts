import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { loginBasic, basicApi, demoInput } from "../support/basic-scope";
import { emptyTower, towerCategories, type Tower, type TowerInput } from "../../lib/towers";
import type { Page } from "@playwright/test";
import type { TowerCatalogPage } from "../../lib/tower-catalog";
import type { TowerEvaluation, TowerSimulation } from "../../lib/tower-compatibility";
import type { CatalogPage } from "../../lib/catalog";

test.use({ trace: "off", screenshot: "off", video: "off" });

function line(category: TowerInput["lines"][number]["category"], componentId: string, quantity = 1): TowerInput["lines"][number] {
  return { line_id: null, category, component_id: componentId, declared_model: null, quantity };
}

function state(result: TowerEvaluation, rule: string) { return result.rule_results.find(item => item.rule_id === rule)?.state; }

async function evaluateTower(page: Page, id: string, revision: number): Promise<TowerEvaluation> {
  const response = await towerApi(page, `/${id}/evaluate`, "POST", { expected_pc_revision: revision });
  expect(response.status).toBe(200);
  return response.data as TowerEvaluation;
}

async function motherboardReferences(): Promise<CatalogPage["items"]> {
  const response = await fetch("http://127.0.0.1:8000/api/catalog/components?category=motherboard&page_size=50");
  expect(response.status).toBe(200);
  return (await response.json() as CatalogPage).items;
}

/** En dev la lista llega después del esqueleto: esperar la tarjeta real antes de abrirla. */
async function openPc(page: Page, name: string) {
  const tab = page.getByRole("button", { name, exact: true });
  await expect(tab).toBeVisible({ timeout: 20000 });
  await tab.click();
}

test("@tower05 v2 sin BIOS: cambiar placa conserva el dato guardado y el payload no lleva BIOS", async ({ page }) => {
  test.setTimeout(120000);
  await loginBasic(page);
  const boards = await motherboardReferences();
  expect(boards.length).toBeGreaterThanOrEqual(2);
  const target = boards.find(item => item.id !== "P03") ?? boards[1];
  const input: TowerInput = {
    ...emptyTower(),
    name: "PC propia sin BIOS",
    category_status: { ...emptyTower().category_status, cpu: "present", motherboard: "present" },
    lines: [line("cpu", "P01"), line("motherboard", "P03")],
    // Una BIOS guardada antes de la política 2 se conserva como dato, no se vuelve a pedir.
    context: { bios_version: "P1.20", notes: null, assembly_state: "assembled" },
  };
  const created = await towerApi(page, "", "POST", input); expect(created.status).toBe(201); const own = created.data as Tower;
  try {
    await page.goto("/pcs"); await openPc(page, own.name);
    await expect(page.getByLabel(/BIOS/i)).toHaveCount(0);
    const card = page.locator('article[aria-label="Placa madre"]');
    await card.getByRole("button").last().click();
    const editor = page.locator("form.pcs-editor");
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel(/BIOS/i)).toHaveCount(0);
    await expect(editor).not.toContainText(/\bBIOS\b/i);

    await editor.getByText("Cambiar por otra pieza", { exact: true }).click();
    const selector = editor.getByRole("region", { name: "Selector de Placa madre", exact: true });
    await selector.getByRole("textbox").fill(target.name.slice(0, 60));
    await selector.getByRole("button", { name: "Buscar", exact: true }).click();
    await selector.getByRole("button", { name: target.name, exact: true }).click();
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/towers/${own.id}`) && response.request().method() === "PUT");
    await editor.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    const response = await saved; expect(response.status()).toBe(200);
    const body = response.request().postDataJSON() as TowerInput & { revision: number };
    expect(body.context.bios_version).toBe("P1.20");
    expect(body.context.assembly_state).toBe("assembled");
    expect(body.lines.find(item => item.category === "motherboard")?.component_id).toBe(target.id);
    expect(body).not.toHaveProperty("user_id");
    expect(JSON.stringify(body)).not.toMatch(/candidate_context|installed_bios/i);
    const updated = await response.json() as Tower;
    expect(updated.context.bios_version).toBe("P1.20");
    const evaluated = await evaluateTower(page, own.id, updated.revision);
    expect(evaluated.rules_version).toBe("cu05-tower-essential-engine-2");
    expect(evaluated.scope.id).toBe("cu05-tower-essential-2");
    expect(JSON.stringify(evaluated.rule_results)).not.toContain("installed_bios");
    expect((await towerApi(page, `/${own.id}`)).data).toEqual(updated);
  } finally { expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204); }
});

test("@tower05 v2: T04/T07 no evaluados avisan del gabinete y el soporte exacto CPU/placa sigue importando", async ({ page }) => {
  test.setTimeout(120000);
  await loginBasic(page);
  const boards = await motherboardReferences();
  const unsupported = boards.find(item => item.id !== "P03");
  if (!unsupported) throw new Error("El catálogo real necesita otra placa madre para probar el soporte exacto");
  const noCase: TowerInput = {
    ...emptyTower(),
    name: "PC propia sin gabinete",
    category_status: { ...emptyTower().category_status, cpu: "present", motherboard: "present", ram: "present", gpu: "present", psu: "present" },
    lines: [line("cpu", "P01"), line("motherboard", "P03"), line("ram", "P04", 2), line("gpu", "P06"), line("psu", "P07")],
    context: { bios_version: "P1.20", notes: null, assembly_state: "assembled" },
  };
  const unknownBoard: TowerInput = {
    ...emptyTower(),
    name: "PC propia con placa sin fila",
    category_status: { ...emptyTower().category_status, cpu: "present", motherboard: "present" },
    lines: [line("cpu", "P01"), line("motherboard", unsupported.id)],
    context: { bios_version: null, notes: null, assembly_state: null },
  };
  const created = await towerApi(page, "", "POST", noCase); expect(created.status).toBe(201); const own = created.data as Tower;
  const createdUnknown = await towerApi(page, "", "POST", unknownBoard); expect(createdUnknown.status).toBe(201); const second = createdUnknown.data as Tower;
  try {
    const evaluated = await evaluateTower(page, own.id, own.revision);
    expect(state(evaluated, "T01")).toBe("pass");
    expect(state(evaluated, "T04")).toBe("not_applicable");
    expect(state(evaluated, "T07")).toBe("not_applicable");
    expect(evaluated.warnings.join(" ")).toContain("Chequeá que entre en tu gabinete");
    expect(evaluated.additional_checks.some(check => check.reason.includes("Chequeá que entre en tu gabinete"))).toBe(true);
    // Cooler y ventiladores son opcionales: no agregan faltantes ni bloquean.
    expect(evaluated.missing_fields.filter(field => /^(cooler|fan)/.test(String(field)))).toEqual([]);
    expect(JSON.stringify(evaluated.rule_results)).not.toContain("installed_bios");

    await page.goto("/pcs"); await openPc(page, own.name);
    const encaje = page.getByRole("heading", { name: "¿Encaja todo entre sí?", exact: true }).locator("..");
    await expect(encaje).toContainText("Chequeá que entre en tu gabinete", { timeout: 20000 });
    const physical = encaje.locator("li").filter({ hasText: "Placa de video y gabinete" });
    await expect(physical).toContainText("No evaluado");
    const processor = encaje.locator("li").filter({ hasText: "Procesador y placa madre" });
    await expect(processor).toContainText("Encaja");

    // Mismo socket no alcanza: sin fila exacta del modelo, T01 queda por verificar.
    const secondEvaluation = await evaluateTower(page, second.id, second.revision);
    expect(state(secondEvaluation, "T01")).toBe("unknown");
    expect(JSON.stringify(secondEvaluation.rule_results)).toMatch(/cpu_support/);
  } finally {
    expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204);
    expect((await towerApi(page, `/${second.id}`, "DELETE")).status).toBe(204);
  }
});

test("@tower05 v2: una incompatibilidad documentada sigue fallando aunque la PC ya esté armada", async ({ page }) => {
  test.setTimeout(120000);
  await loginBasic(page);
  const input: TowerInput = {
    ...emptyTower(),
    name: "PC propia choque documentado",
    category_status: { ...emptyTower().category_status, cpu: "present", motherboard: "present", ram: "present", gpu: "present", psu: "present", case: "present" },
    // P16 mide329 mm y P10 admite315 mm: el choque está documentado en el catálogo.
    lines: [line("cpu", "P01"), line("motherboard", "P03"), line("ram", "P04", 2), line("gpu", "P16"), line("psu", "P07"), line("case", "P10")],
    context: { bios_version: "P1.20", notes: null, assembly_state: "assembled" },
  };
  const created = await towerApi(page, "", "POST", input); expect(created.status).toBe(201); const own = created.data as Tower;
  try {
    const result = await evaluateTower(page, own.id, own.revision);
    expect(result.verdict).toBe("incompatible");
    expect(state(result, "T04")).toBe("fail");
    expect(result.warnings.join(" ")).not.toContain("Chequeá que entre en tu gabinete");
    expect(JSON.stringify(result.rule_results)).not.toContain("installed_bios");

    await page.goto("/pcs"); await openPc(page, own.name);
    const encaje = page.getByRole("heading", { name: "¿Encaja todo entre sí?", exact: true }).locator("..");
    await expect(encaje).toContainText("Hay piezas que no encajan entre sí", { timeout: 20000 });
    const physical = encaje.locator("li").filter({ hasText: "Placa de video y gabinete" });
    await expect(physical).toContainText("No encaja");
    await expect(encaje).not.toContainText("Chequeá que entre en tu gabinete");
    expect((await towerApi(page, `/${own.id}`)).data).toEqual(own);
  } finally { expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204); }
});

test("@tower05 torre desconocida y simulación real no guardan cambios", async ({ page }) => {
  await loginBasic(page);
  const draft = { ...emptyTower(), name: "Torre propia por confirmar" };
  const created = await towerApi(page, "", "POST", draft); expect(created.status).toBe(201); const own = created.data as Tower;
  try {
    await page.goto("/pcs"); await openPc(page, draft.name);
    const encaje = page.getByRole("heading", { name: "¿Encaja todo entre sí?", exact: true }).locator("..");
    await expect(encaje).toContainText("Faltan datos técnicos del catálogo", { timeout: 20000 });

    const evaluated = await evaluateTower(page, own.id, own.revision);
    expect(evaluated.verdict).toBe("requiere_verificacion");
    expect(evaluated.scope.id).toBe("cu05-tower-essential-2");
    expect(evaluated.rule_results).toHaveLength(9);

    const simulation: TowerSimulation = {
      expected_pc_revision: own.revision,
      actions: [{ action: "replace_category", category: "storage", line_id: null, candidates: [{ component_id: null, declared_model: "Disco propio por confirmar", quantity: 1 }] }],
    };
    const simulated = await towerApi(page, `/${own.id}/simulate`, "POST", simulation);
    expect(simulated.status).toBe(200);
    const copy = simulated.data as TowerEvaluation;
    expect(copy.verdict).toBe("requiere_verificacion");
    expect(copy.evaluated_configuration.lines.some(item => item.category === "storage" && item.declared_model === "Disco propio por confirmar")).toBe(true);
    expect((await towerApi(page, `/${own.id}`)).data).toEqual(own);

    const other = await towerApi(page, `/${own.id}/simulate`, "POST", { ...simulation, actions: [{ ...simulation.actions[0], candidates: [{ component_id: null, declared_model: "Otro disco por confirmar", quantity: 1 }] }] });
    expect(other.status).toBe(200);
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
    const response = await fetch(`/api/towers${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(20000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

test("@tower38 CRUD real: discos distintos, ventiladores, declarados, revisión y ownership", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
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
    await page.goto("/pcs");
    const add = page.getByRole("button", { name: "Agregar otra PC", exact: true });
    await expect(add).toBeEnabled({ timeout: 20000 });
    await add.click();
    await page.getByLabel("¿Cómo le decimos a esta PC?", { exact: true }).fill("Torre sintética38");
    await page.getByLabel("¿Esta PC ya está armada y funcionando?", { exact: true }).selectOption("new");
    await expect(other, "Ownership actor remains on its separate account page").toHaveURL(/\/account$/);

    // Dos discos declarados distintos.
    await page.getByRole("button", { name: "Agregar almacenamiento", exact: true }).click();
    let editor = page.locator("form.pcs-editor");
    await editor.getByLabel("¿Qué tenés de esto?", { exact: true }).selectOption("present");
    await editor.getByLabel("Modelo", { exact: true }).fill("Disco declarado A");
    await editor.getByRole("button", { name: "Agregar otra línea de almacenamiento", exact: true }).click();
    await editor.getByLabel("¿Cómo la querés indicar?", { exact: true }).last().selectOption("escrito");
    await editor.getByLabel("Modelo", { exact: true }).last().fill("Disco declarado B");
    await editor.getByRole("button", { name: "Guardar esta pieza", exact: true }).click();

    // Un ventilador declarado con cantidad explícita.
    await page.getByRole("button", { name: "Agregar ventiladores", exact: true }).click();
    editor = page.locator("form.pcs-editor");
    await editor.getByLabel("¿Qué tenés de esto?", { exact: true }).selectOption("present");
    await editor.getByLabel("Modelo", { exact: true }).fill("Ventilador declarado");
    await editor.getByLabel("Cantidad de ventiladores", { exact: true }).fill("3");
    await editor.getByRole("button", { name: "Guardar esta pieza", exact: true }).click();

    await expect(page.getByLabel(/BIOS/i)).toHaveCount(0);
    const saved = page.waitForResponse(response => response.url().endsWith("/api/towers") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Guardar mi PC", exact: true }).click();
    const response = await saved; expect(response.status()).toBe(201); own = await response.json() as Tower;
    const sent = response.request().postDataJSON() as TowerInput;
    expect(sent).not.toHaveProperty("user_id");
    expect(sent.context.bios_version).toBeNull();
    expect(sent.context.assembly_state).toBe("new");
    expect(own.lines).toHaveLength(3); expect(own.lines.every(item => !!item.line_id)).toBe(true);
    expect(own.category_status.cpu).toBe("unknown"); expect(own.context.bios_version).toBeNull();
    expect((await towerApi(other, `/${own.id}`)).status).toBe(404);

    const replacement: TowerInput & { revision: number } = {
      schema_version: 2, name: own.name, category_status: own.category_status, lines: own.lines,
      context: { bios_version: own.context.bios_version, notes: own.context.notes, assembly_state: own.context.assembly_state ?? null },
      revision: own.revision,
    };
    expect((await towerApi(page, `/${own.id}`, "PUT", replacement)).status).toBe(200);
    expect((await towerApi(page, `/${own.id}`, "PUT", replacement)).status).toBe(409);
    expect((await basicApi(page, `/${own.id}`)).status).toBe(409);
    await expect(page.getByRole("heading", { name: "¿Encaja todo entre sí?", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Comprobar mi PC", exact: true })).toHaveCount(0);
  } finally { if (own) expect((await towerApi(page, `/${own.id}`, "DELETE")).status).toBe(204); await a.close(); await b.close(); }
});

test("@tower38 lectura legacy no migra al abrirla en Mi PC", async ({ page }) => {
  await loginBasic(page);
  const result = await basicApi(page, "", "POST", demoInput("A")); expect(result.status).toBe(201);
  const id: string = result.data.id;
  try {
    const first = await towerApi(page, `/${id}`), second = await towerApi(page, `/${id}`);
    expect(first.data).toEqual(second.data);
    expect((first.data as Tower).origin_schema).toBe(1);
    expect((await basicApi(page, `/${id}`)).status).toBe(200);
    await page.goto("/pcs"); await openPc(page, result.data.name);
    await expect(page.getByRole("heading", { name: result.data.name, exact: true })).toBeVisible();
    // Abrir Mi PC no escribe una configuración schema2 ni borra la lectura histórica.
    expect((await towerApi(page, `/${id}`)).data).toEqual(first.data);
    expect((await basicApi(page, `/${id}`)).status).toBe(200);
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
    await page.reload(); await openPc(page, draft.name);
    const card = page.locator(`article[aria-label="${towerCategories[part.category]}"]`);
    await expect(card).toContainText(part.name, { timeout: 20000 });
    await card.getByRole("button").last().click();
    const editor = page.locator("form.pcs-editor");
    await expect(editor).toBeVisible();
    // La pieza ya elegida muestra el selector dentro de «Cambiar por otra pieza».
    const change = editor.getByText("Cambiar por otra pieza", { exact: true });
    if (await change.count()) await change.click();
    const selector = page.getByRole("region", { name: `Selector de ${towerCategories[part.category]}`, exact: true });
    await expect(selector).toContainText(part.name, { timeout: 20000 });
    await selector.getByRole("textbox").fill(part.name.slice(0, 60)); await selector.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(selector.getByRole("button", { name: part.name, exact: true })).toBeVisible({ timeout: 20000 });
  } finally { expect((await towerApi(page, `/${created.data.id}`, "DELETE")).status).toBe(204); }
});
