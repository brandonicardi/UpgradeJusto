import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { PC, PCInput } from "../../lib/pcs";
import type { Evaluation } from "../../lib/compatibility";
import type { Preview } from "../../lib/recommendations";

export async function loginBasic(page: Page) {
  await page.goto("/account");
  const statuses = await page.evaluate(async credentials => {
    const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
    const options = { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrf_token }, body: JSON.stringify(credentials) };
    const register = await fetch("/api/auth/register", options);
    const login = await fetch("/api/auth/login", options);
    return [register.status, login.status];
  }, { email: `basic-${randomUUID()}@example.test`, password: randomUUID() });
  expect(statuses).toEqual([201, 200]);
}
export async function basicApi(page: Page, route: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
      headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api/pcs${args.route}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(15000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { route, method, body });
}
export function demoInput(which: "A" | "B"): PCInput {
  const ids = which === "A" ? ["P01", "P03", "P04", "P06", "P07", "P09"] : ["P02", "P03", "P05", "P06", "P08", "P10"];
  return { name: `PC demo propia ${which}`, components: (["cpu", "motherboard", "ram", "gpu", "psu", "case"] as const).map((category, i) => ({ category, component_id: ids[i], quantity: category === "ram" ? 2 : 1 })), context: { bios_version: "P2.30", notes: null } };
}
export async function openBasic(page: Page, pc: PC) {
  await page.goto("/pcs/legacy");
  await page.getByRole("main").getByRole("button", { name: pc.name, exact: true }).click();
}
export async function evaluateBasic(page: Page, pc: PC) {
  const response = page.waitForResponse(r => r.url().endsWith(`/api/pcs/${pc.id}/compatibility/evaluate`) && r.request().method() === "POST");
  await page.getByRole("main").getByRole("button", { name: "Comprobar mi PC", exact: true }).click();
  const received = await response; expect(received.status()).toBe(200);
  return await received.json() as Evaluation;
}
export function assertBasic(result: Evaluation, verdict: string) {
  expect(result.verdict).toBe(verdict);
  expect(result.rules_version).toBe("cu05-basic-stock-engine-1");
  expect(result.scope?.id).toBe("cu05-basic-stock-1");
  expect(result.scope?.operating_regime).toBe("stock_no_oc");
  for (let i = 1; i <= 7; i++) expect(result.rule_results.some(rule => rule.rule_id === `B0${i}`)).toBe(true);
}
export async function simulateBasic(page: Page, pc: PC, category: string, reference: string) {
  const panel = page.getByRole("main").getByRole("region", { name: "Compatibilidad parcial", exact: true });
  const simulation = panel.getByText("Simular otro componente", { exact: true });
  if (!await simulation.evaluate(element => element.parentElement?.hasAttribute("open"))) await simulation.click();
  await panel.getByLabel("Categoría a sustituir", { exact: true }).selectOption(category);
  await panel.getByLabel("Referencia candidata 1", { exact: true }).selectOption(reference);
  const response = page.waitForResponse(r => r.url().endsWith(`/api/pcs/${pc.id}/compatibility/simulate`) && r.request().method() === "POST");
  await panel.getByRole("button", { name: "Simular sin guardar", exact: true }).click();
  const received = await response; expect(received.status()).toBe(200);
  return await received.json() as Evaluation;
}
export async function recommendRam(page: Page, pc: PC, budget: string) {
  const panel = page.getByRole("main").getByRole("region", { name: "Recomendaciones de mejoras", exact: true });
  await panel.getByLabel("Objetivo", { exact: true }).selectOption("general");
  await panel.getByLabel("Presupuesto ARS", { exact: true }).fill(budget);
  await panel.getByLabel("Categoría de mejora", { exact: true }).selectOption("ram");
  await panel.getByLabel("Componente nuevo", { exact: true }).selectOption("P05");
  await panel.getByLabel("Cantidad de módulos", { exact: true }).fill("2");
  const response = page.waitForResponse(r => r.url().endsWith(`/api/pcs/${pc.id}/recommendations/preview`) && r.request().method() === "POST");
  await panel.getByRole("button", { name: "Buscar mejora", exact: true }).click();
  const received = await response; expect(received.status()).toBe(200);
  return await received.json() as Preview;
}

export async function recommendGpu(page: Page, pc: PC, includePsu: boolean) {
  const panel = page.getByRole("main").getByRole("region", { name: "Recomendaciones de mejoras", exact: true });
  await panel.getByLabel("Objetivo", { exact: true }).selectOption("general");
  await panel.getByLabel("Presupuesto ARS", { exact: true }).fill("2000000");
  await panel.getByLabel("Categoría de mejora", { exact: true }).selectOption("gpu");
  await panel.getByLabel("Componente nuevo", { exact: true }).selectOption("P15");
  if (includePsu) {
    await panel.getByRole("button", { name: "Añadir componente dependiente", exact: true }).click();
    await panel.getByLabel("Categoría de dependencia 1, alternativa 1", { exact: true }).selectOption("psu");
    await panel.getByLabel("Componente de dependencia 1, alternativa 1, opción 1", { exact: true }).selectOption("P08");
  }
  const response = page.waitForResponse(r => r.url().endsWith(`/api/pcs/${pc.id}/recommendations/preview`) && r.request().method() === "POST");
  await panel.getByRole("button", { name: "Buscar mejora", exact: true }).click();
  const received = await response; expect(received.status()).toBe(200);
  return await received.json() as Preview;
}
