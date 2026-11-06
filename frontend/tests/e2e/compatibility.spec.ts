import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { randomUUID } from "node:crypto";
import { emptyTower, type Tower, type TowerInput } from "../../lib/towers";
import type { TowerEvaluation, TowerSimulation } from "../../lib/tower-compatibility";
import type { CatalogPage } from "../../lib/catalog";

test.use({ trace: "off", screenshot: "off", video: "off" });

async function login(page: Page) {
  await page.goto("/account");
  const statuses = await page.evaluate(async credentials => {
    const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
    const options = { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrf_token }, body: JSON.stringify(credentials) };
    const register = await fetch("/api/auth/register", options);
    const login = await fetch("/api/auth/login", options);
    const refreshed = await fetch("/api/auth/csrf", { cache: "no-store" });
    return [register.status, login.status, refreshed.status];
  }, { email: `compat-${randomUUID()}@example.test`, password: randomUUID() });
  expect(statuses).toEqual([201, 200, 200]);
}

async function towerApi(page: Page, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const token = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
      headers["X-CSRF-Token"] = token.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/towers${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(20000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

function state(result: TowerEvaluation, rule: string) { return result.rule_results.find(item => item.rule_id === rule)?.state; }

async function evaluate(page: Page, id: string, revision: number): Promise<TowerEvaluation> {
  const response = await towerApi(page, `/${id}/evaluate`, "POST", { expected_pc_revision: revision });
  expect(response.status).toBe(200);
  return response.data as TowerEvaluation;
}

function line(category: TowerInput["lines"][number]["category"], componentId: string, quantity = 1): TowerInput["lines"][number] {
  return { line_id: null, category, component_id: componentId, declared_model: null, quantity };
}

test("CU05 política esencial 2: evaluar sin BIOS, sin installed_bios y una BIOS anterior no cambia el veredicto", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
  const contextA = await newIsolatedContext(), contextB = await newIsolatedContext();
  const a = await contextA.newPage(), b = await contextB.newPage();
  a.setDefaultTimeout(15000); b.setDefaultTimeout(15000);
  let id: string | null = null;
  let failed = false;
  try {
    await login(a); await login(b);
    // Public, fixed Node-side reference query; never an arbitrary proxy destination.
    const catalogResponse = await fetch("http://127.0.0.1:8000/api/catalog/components?page_size=50");
    expect(catalogResponse.status).toBe(200);
    const catalog: CatalogPage = await catalogResponse.json();
    for (const reference of ["P01", "P03", "P04", "P06", "P07", "P09"]) expect(catalog.items.some(item => item.id === reference)).toBe(true);
    const input: TowerInput = {
      ...emptyTower(),
      name: `Torre D propia ${randomUUID()}`,
      category_status: { ...emptyTower().category_status, cpu: "present", motherboard: "present", ram: "present", gpu: "present", psu: "present", case: "present" },
      lines: [line("cpu", "P01"), line("motherboard", "P03"), line("ram", "P04", 2), line("gpu", "P06"), line("psu", "P07"), line("case", "P09")],
      context: { bios_version: "P1.20", notes: null, assembly_state: "assembled" },
    };
    const created = await towerApi(a, "", "POST", input); expect(created.status).toBe(201);
    let pc = created.data as Tower; id = pc.id;
    // Una evaluación nueva usa la política esencial 2 y no consulta la BIOS.
    let evaluated = await evaluate(a, id, pc.revision);
    expect(evaluated.rules_version).toBe("cu05-tower-essential-engine-2");
    expect(evaluated.scope?.id).toBe("cu05-tower-essential-2");
    expect(evaluated.scope?.policy_version).toBe("tower-essential-policy-2");
    expect(evaluated.rule_results.map(rule => rule.rule_id)).toEqual(["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T11"]);
    expect(state(evaluated, "T01")).toBe("pass");
    const rulesText = JSON.stringify(evaluated.rule_results);
    expect(rulesText).not.toContain("installed_bios");
    expect(rulesText).not.toContain("minimum_bios");
    expect(rulesText).not.toContain("earlier_bios");
    expect(JSON.stringify(evaluated.missing_fields)).not.toMatch(/bios/i);
    expect(evaluated.evaluated_configuration.context.bios_version).toBe("P1.20");
    expect((await towerApi(a, `/${id}`)).data).toEqual(pc);

    // La versión declarada se conserva como dato: ni la ausencia ni una anterior cambian el veredicto.
    const baselineVerdict = evaluated.verdict, baselineState = state(evaluated, "T01"), baselineMissing = JSON.stringify(evaluated.missing_fields);
    for (const bios of [null, "P1.20", "P2.30"] as const) {
      const updated = await towerApi(a, `/${id}`, "PUT", { ...input, context: { ...input.context, bios_version: bios }, revision: pc.revision });
      expect(updated.status).toBe(200); pc = updated.data as Tower;
      evaluated = await evaluate(a, id, pc.revision);
      expect(evaluated.verdict).toBe(baselineVerdict);
      expect(state(evaluated, "T01")).toBe(baselineState);
      expect(JSON.stringify(evaluated.missing_fields)).toBe(baselineMissing);
      expect(JSON.stringify(evaluated.rule_results)).not.toContain("installed_bios");
      expect((await towerApi(a, `/${id}`)).data).toEqual(pc);
    }

    // Una placa candidata se simula sin BIOS: el cuerpo no lleva candidate_context ni installed_bios.
    const simulationBody: TowerSimulation = {
      expected_pc_revision: pc.revision,
      actions: [{ action: "replace_category", category: "motherboard", line_id: null, candidates: [{ component_id: "P03", declared_model: null, quantity: 1 }] }],
    };
    expect(JSON.stringify(simulationBody)).not.toMatch(/bios|candidate_context/i);
    const simulated = await towerApi(a, `/${id}/simulate`, "POST", simulationBody);
    expect(simulated.status).toBe(200);
    const simulation = simulated.data as TowerEvaluation;
    expect(state(simulation, "T01")).toBe("pass");
    expect(JSON.stringify(simulation.rule_results)).not.toContain("installed_bios");
    expect((await towerApi(a, `/${id}`)).data).toEqual(pc);

    // Dueño y revisión siguen resolviéndose en el servidor; ni consultar ni simular modifican la PC.
    const foreignSimulation: TowerSimulation = {
      expected_pc_revision: pc.revision,
      actions: [{ action: "replace_category", category: "cpu", line_id: null, candidates: [{ component_id: "P02", declared_model: null, quantity: 1 }] }],
    };
    expect((await towerApi(b, `/${id}/evaluate`, "POST", { expected_pc_revision: pc.revision })).status).toBe(404);
    expect((await towerApi(b, `/${id}/simulate`, "POST", foreignSimulation)).status).toBe(404);
    expect((await towerApi(a, `/${id}/evaluate`, "POST", { expected_pc_revision: pc.revision + 1 })).status).toBe(409);
    expect((await towerApi(a, `/${id}/simulate`, "POST", { ...foreignSimulation, expected_pc_revision: pc.revision + 1 })).status).toBe(409);
    expect((await towerApi(a, `/${id}`)).data).toEqual(pc);

    // La pantalla de Mi PC no pide BIOS y muestra lo que devolvió el servidor.
    await a.goto("/pcs");
    // En dev la pantalla se hidrata después del esqueleto: esperar la tarjeta real, no el estado de carga.
    const tab = a.getByRole("button", { name: pc.name, exact: true });
    await expect(tab).toBeVisible({ timeout: 20000 });
    await tab.click();
    await expect(a.getByLabel(/BIOS/i)).toHaveCount(0);
    const encaje = a.getByRole("heading", { name: "¿Encaja todo entre sí?", exact: true }).locator("..");
    await expect(encaje).toContainText("Procesador y placa madre", { timeout: 20000 });
    const processorRow = encaje.locator("li").filter({ hasText: "Procesador y placa madre" });
    await expect(processorRow).toContainText("Encaja");
    await expect(processorRow).not.toContainText(/BIOS|installed_bios/i);
    await expect(encaje).not.toContainText(/snapshot|revisión|scope|coverage|PASS/i);
  } catch (error) { failed = true; throw error; }
  finally {
    try {
      if (id) {
        const cleanup = await towerApi(a, `/${id}`, "DELETE");
        if (![204, 404].includes(cleanup.status) && !failed) throw new Error("Own compatibility tower cleanup failed");
      }
    } catch (error) { if (!failed) throw error; }
    finally { await Promise.allSettled([contextA.close(), contextB.close()]); }
  }
});
