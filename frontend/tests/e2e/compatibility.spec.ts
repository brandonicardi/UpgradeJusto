import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { randomUUID } from "node:crypto";
import type { PC, PCInput } from "../../lib/pcs";
import type { Evaluation } from "../../lib/compatibility";
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

async function api(page: Page, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const token = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
      headers["X-CSRF-Token"] = token.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/pcs${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(15000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

function r01(result: Evaluation) { return result.rule_results.find(rule => rule.rule_id === "B01")?.state; }

test("CU05 delta plataforma: evidencia RAM parcial, exceso de slots, no mutación y dueño", async ({ newIsolatedContext }) => {
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
    for (const reference of ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P09"]) expect(catalog.items.some(item => item.id === reference)).toBe(true);
    const input: PCInput = { name: `PC D propia ${randomUUID()}`, components: [
      { category: "cpu", component_id: "P01", quantity: 1 }, { category: "motherboard", component_id: "P03", quantity: 1 }, { category: "ram", component_id: "P04", quantity: 2 },
      { category: "gpu", component_id: "P06", quantity: 1 }, { category: "psu", component_id: "P07", quantity: 1 }, { category: "case", component_id: "P09", quantity: 1 },
    ], context: { bios_version: "P2.30", notes: null } };
    const created = await api(a, "", "POST", input); expect(created.status).toBe(201);
    let pc = created.data as PC; id = pc.id;
    await a.goto("/pcs"); await a.getByRole("button", { name: input.name, exact: true }).click();
    const panel = a.getByRole("region", { name: "Compatibilidad parcial", exact: true });
    const resultPanel = a.getByRole("region", { name: "Resultado parcial del servidor", exact: true });
    await expect(panel).toContainText("No modifica tu PC");
    async function evaluate() {
      const waiting = a.waitForResponse(response => response.url().endsWith(`/api/pcs/${id}/compatibility/evaluate`) && response.request().method() === "POST", { timeout: 15000 });
      await panel.getByRole("button", { name: "Comprobar mi PC", exact: true }).click();
      const response = await waiting; expect(response.status()).toBe(200);
      await expect(resultPanel).toBeVisible();
      return await response.json() as Evaluation;
    }
    let evaluated = await evaluate();
    expect(r01(evaluated)).toBe("pass"); expect(evaluated.verdict).toBe("compatible");
    expect(evaluated.rules_version).toBe("cu05-basic-stock-engine-1"); expect(evaluated.pc_revision).toBe(String(pc.revision));
    expect(evaluated.scope?.id).toBe("cu05-basic-stock-1");
    const ramRule = evaluated.rule_results.find(rule => rule.rule_id === "B02");
    expect(ramRule).toBeDefined();
    expect(ramRule?.state).toBe("pass");
    expect(JSON.stringify({ facts: ramRule?.facts, evidence: ramRule?.evidence })).toMatch(/DDR4/i);
    expect(JSON.stringify(ramRule?.evidence)).toMatch(/https?:\/\//);
    expect(evaluated.rule_results).toHaveLength(7);
    await expect(resultPanel.getByRole("region", { name: "Comprobación de componentes", exact: true })).toContainText("Compatible para uso sin overclock");
    await resultPanel.getByText("Ver comprobación de mi PC", { exact: true }).click();
    await resultPanel.getByText("Cómo se comprobó", { exact: true }).click();
    const formatRule = evaluated.rule_results.find(rule => rule.rule_id === "B07");
    expect(formatRule).toBeDefined();
    function sourceUrls(value: Evaluation["rule_results"][number]["evidence"]): string[] {
      if (Array.isArray(value)) return value.flatMap(sourceUrls);
      if (value && typeof value === "object") return Object.values(value).flatMap(sourceUrls);
      if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? [url.href] : []; } catch { return []; }
      }
      return [];
    }
    const expectedUrls = [...new Set(sourceUrls(formatRule!.evidence))];
    expect(expectedUrls.length).toBeGreaterThan(0);
    const ruleSummary = resultPanel.getByText("Gabinete y formatos", { exact: true });
    await ruleSummary.click();
    const ruleDetails = ruleSummary.locator("..");
    await expect(ruleDetails).toHaveJSProperty("open", true);
    await expect(ruleDetails).toContainText(`Código técnico: ${formatRule!.rule_id}`);
    for (const url of expectedUrls) {
      const source = ruleDetails.getByRole("link").filter({ hasText: url }).first();
      await expect(source).toBeVisible();
      await expect(source).toHaveAttribute("href", url);
    }
    expect((await api(a, `/${id}`)).data).toEqual(pc);

    for (const [bios, state, verdict] of [["P1.20", "fail", "incompatible"], [null, "unknown", "requiere_verificacion"], ["P2.31", "unknown", "requiere_verificacion"]] as const) {
      const updated = await api(a, `/${id}`, "PUT", { ...input, context: { bios_version: bios, notes: null }, revision: pc.revision });
      expect(updated.status).toBe(200); pc = updated.data as PC;
      await a.goto("/pcs"); await a.getByRole("button", { name: input.name, exact: true }).click();
      await a.getByText("Más opciones", { exact: true }).click();
      await expect(a.getByRole("region", { name: "Detalle de PC", exact: true }).getByText(`Revisión ${pc.revision}`, { exact: true })).toBeVisible();
      evaluated = await evaluate(); expect(r01(evaluated)).toBe(state); expect(evaluated.verdict).toBe(verdict);
      expect((await api(a, `/${id}`)).data).toEqual(pc);
    }
    const restored = await api(a, `/${id}`, "PUT", { ...input, revision: pc.revision });
    expect(restored.status).toBe(200); pc = restored.data as PC;
    await a.goto("/pcs"); await a.getByRole("button", { name: input.name, exact: true }).click();
    await a.getByText("Más opciones", { exact: true }).click();
    await expect(a.getByRole("region", { name: "Detalle de PC", exact: true }).getByText(`Revisión ${pc.revision}`, { exact: true })).toBeVisible();
    async function simulate() {
      const waiting = a.waitForResponse(response => response.url().endsWith(`/api/pcs/${id}/compatibility/simulate`) && response.request().method() === "POST", { timeout: 15000 });
      await panel.getByRole("button", { name: "Simular sin guardar", exact: true }).click();
      const response = await waiting; expect(response.status()).toBe(200);
      await expect(resultPanel).toContainText("Simulación sobre copia");
      return await response.json() as Evaluation;
    }
    await panel.getByText("Simular otro componente", { exact: true }).click();
    await panel.getByLabel("Categoría a sustituir", { exact: true }).selectOption("motherboard");
    await panel.getByLabel("Referencia candidata 1", { exact: true }).selectOption("P03");
    let simulation = await simulate(); expect(r01(simulation)).toBe("unknown");
    expect((simulation.evaluated_configuration as { context: { bios_version: string | null } }).context.bios_version).toBeNull();
    await panel.getByLabel("BIOS declarada de placa candidata", { exact: false }).fill("P2.30");
    simulation = await simulate(); expect(r01(simulation)).toBe("pass"); expect(simulation.verdict).toBe("compatible");
    await panel.getByLabel("Categoría a sustituir", { exact: true }).selectOption("cpu");
    await panel.getByLabel("Referencia candidata 1", { exact: true }).selectOption("P02");
    simulation = await simulate(); expect(r01(simulation)).toBe("pass");
    await panel.getByLabel("Categoría a sustituir", { exact: true }).selectOption("ram");
    await panel.getByLabel("Referencia candidata 1", { exact: true }).selectOption("P05");
    await panel.getByLabel("Cantidad candidata 1", { exact: true }).fill("2");
    simulation = await simulate();
    const groups = (simulation.evaluated_configuration as { components: PC["components"] }).components;
    expect(groups.filter(group => group.category === "ram")).toEqual([{ category: "ram", component_id: "P05", quantity: 2 }]);
    expect((await api(a, `/${id}`)).data).toEqual(pc);
    await panel.getByLabel("Referencia candidata 1", { exact: true }).selectOption("P04");
    await panel.getByLabel("Cantidad candidata 1", { exact: true }).fill("5");
    simulation = await simulate();
    expect(simulation.rule_results.find(rule => rule.rule_id === "B02")?.state).toBe("fail");
    expect(simulation.verdict).toBe("incompatible");
    const powerRule = simulation.rule_results.find(rule => rule.rule_id === "B05");
    expect(powerRule).toBeDefined();
    expect(simulation.scope?.operating_regime).toBe("stock_no_oc");
    expect((simulation.evaluated_configuration as { components: PC["components"] }).components.filter(group => group.category === "ram")).toEqual([{ category: "ram", component_id: "P04", quantity: 5 }]);
    expect((await api(a, `/${id}`)).data).toEqual(pc);
    for (const action of ["evaluate", "simulate"]) {
      const body = action === "evaluate" ? { expected_pc_revision: pc.revision } : { expected_pc_revision: pc.revision, category: "cpu", candidates: [{ component_id: "P02", quantity: 1 }] };
      expect((await api(b, `/${id}/compatibility/${action}`, "POST", body)).status).toBe(404);
      expect((await api(a, `/${id}/compatibility/${action}`, "POST", { ...body, expected_pc_revision: 1 })).status).toBe(409);
    }
    expect((await api(a, `/${id}`)).data).toEqual(pc);
  } catch (error) { failed = true; throw error; }
  finally {
    try {
      if (id) {
        const cleanup = await api(a, `/${id}`, "DELETE");
        if (![204, 404].includes(cleanup.status) && !failed) throw new Error("Own compatibility PC cleanup failed");
      }
    } catch (error) { if (!failed) throw error; }
    finally { await Promise.allSettled([contextA.close(), contextB.close()]); }
  }
});
