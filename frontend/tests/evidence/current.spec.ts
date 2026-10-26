import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { test } from "../e2e/fixtures";
import type { PC, PCInput } from "../../lib/pcs";
import type { Evaluation } from "../../lib/compatibility";
import type { Preview } from "../../lib/recommendations";

const directory = path.resolve(process.cwd(), "../.local/evidence/cu05-cu06-scope-v1/before");

async function login(page: Page) {
  await page.goto("/account");
  const statuses = await page.evaluate(async credentials => {
    const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
    const options = { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrf_token }, body: JSON.stringify(credentials) };
    const registered = await fetch("/api/auth/register", options);
    const loggedIn = await fetch("/api/auth/login", options);
    const refreshed = await fetch("/api/auth/csrf", { cache: "no-store" });
    return [registered.status, loggedIn.status, refreshed.status];
  }, { email: `evidence-${randomUUID()}@example.test`, password: randomUUID() });
  expect(statuses).toEqual([201, 200, 200]);
}

async function api(page: Page, route: string, method: string, body?: unknown) {
  return page.evaluate(async args => {
    const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
    const response = await fetch(`/api/pcs${args.route}`, {
      method: args.method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrf_token },
      cache: "no-store", signal: AbortSignal.timeout(15000),
      body: args.body === undefined ? undefined : JSON.stringify(args.body),
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { route, method, body });
}

async function capture(page: Page, filename: string) {
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.screenshot({ path: path.join(directory, filename), fullPage: true, animations: "disabled" });
}

test("Estado actual real CU05/CU06: capturas antes de cambios", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
  const context = await newIsolatedContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  page.setDefaultTimeout(15000);
  let id: string | null = null;
  let phase = "setup";
  let failure: string | null = null;
  try {
    for (const filename of ["01-catalogo.png", "02-pc-evaluacion.png", "03-recomendaciones.png", "03b-recomendaciones-panel.png"]) {
      let exists = false;
      try { await access(path.join(directory, filename)); exists = true; } catch { /* No artifact yet. */ }
      if (exists) { phase = "before-preserved-use-new-root-never-regenerate"; throw new Error("Before evidence exists: use a new root; never regenerate references."); }
    }
    await mkdir(directory, { recursive: true });
    await login(page);
    const input: PCInput = {
      name: "PC demo propia — evidencia antes",
      components: [
        { category: "cpu", component_id: "P01", quantity: 1 },
        { category: "motherboard", component_id: "P03", quantity: 1 },
        { category: "ram", component_id: "P04", quantity: 2 },
        { category: "gpu", component_id: "P06", quantity: 1 },
        { category: "psu", component_id: "P07", quantity: 1 },
        { category: "case", component_id: "P09", quantity: 1 },
      ], context: { bios_version: "P2.30", notes: null },
    };
    const created = await api(page, "", "POST", input);
    expect(created.status).toBe(201);
    id = (created.data as PC).id;

    phase = "catalogo";
    await page.goto("/catalog");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: "Catálogo de componentes", exact: true })).toBeVisible();
    await expect(main.getByRole("status")).toContainText("componentes");
    await capture(page, "01-catalogo.png");

    phase = "pc-evaluacion";
    await page.goto("/pcs");
    await page.getByRole("button", { name: input.name, exact: true }).click();
    const compatibility = main.getByRole("region", { name: "Compatibilidad parcial", exact: true });
    const evaluationPanel = main.getByRole("region", { name: "Resultado parcial del servidor", exact: true });
    const evaluating = page.waitForResponse(response => response.url().endsWith(`/api/pcs/${id}/compatibility/evaluate`) && response.request().method() === "POST");
    await compatibility.getByRole("button", { name: "Evaluar revisión guardada", exact: true }).click();
    const evaluated = await evaluating;
    expect(evaluated.status()).toBe(200);
    const evaluation = await evaluated.json() as Evaluation;
    expect(evaluation.verdict).toBe("requiere_verificacion");
    expect(evaluation.rule_results.some(rule => rule.state === "unknown")).toBe(true);
    await expect(evaluationPanel).toBeVisible();
    await expect(evaluationPanel.getByRole("region", { name: "Faltantes informados", exact: true })).not.toBeEmpty();
    await capture(page, "02-pc-evaluacion.png");

    phase = "recomendaciones";
    const recommendations = main.getByRole("region", { name: "Recomendaciones de mejoras", exact: true });
    const result = main.getByRole("region", { name: "Preview de recomendaciones del servidor", exact: true });
    await expect(recommendations).toContainText("Gastos excluidos");
    await recommendations.getByLabel("Objetivo", { exact: true }).selectOption("general");
    await recommendations.getByLabel("Presupuesto ARS", { exact: true }).fill("1000000");
    await recommendations.getByLabel("Categoría A1 S1", { exact: true }).selectOption("ram");
    await recommendations.getByLabel("Referencia A1 S1 C1", { exact: true }).selectOption("P05");
    await recommendations.getByLabel("Cantidad RAM A1 S1 C1", { exact: true }).fill("2");
    const previewing = page.waitForResponse(response => response.url().endsWith(`/api/pcs/${id}/recommendations/preview`) && response.request().method() === "POST");
    await recommendations.getByRole("button", { name: "Solicitar preview sin guardar", exact: true }).click();
    const previewed = await previewing;
    expect(previewed.status()).toBe(200);
    const preview = await previewed.json() as Preview;
    expect(preview.items[0].status).toBe("requires_verification");
    expect(preview.items[0].evaluation.verdict).toBe("requiere_verificacion");
    await expect(result).toContainText("Requiere verificación");
    await expect(result).toContainText("unknown");
    await capture(page, "03-recomendaciones.png");
    // Explicit evidence, not a snapshot reference. Preserve every label/unknown.
    await result.screenshot({ path: path.join(directory, "03b-recomendaciones-panel.png"), animations: "disabled" });
  } catch {
    // Never expose credentials, response bodies, DOM contents or account details.
    failure = `Evidence failed at phase: ${phase}`;
  } finally {
    try {
      if (id) {
        const deleted = await api(page, `/${id}`, "DELETE");
        if (![204, 404].includes(deleted.status) && !failure) failure = "Evidence failed at phase: cleanup";
      }
    } catch { failure ??= "Evidence failed at phase: cleanup"; }
    finally { await context.close(); }
  }
  if (failure) throw new Error(failure);
});
