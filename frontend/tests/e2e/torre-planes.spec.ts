import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { test } from "./fixtures";
import { loginBasic } from "../support/basic-scope";
import { emptyTower, type Tower } from "../../lib/towers";
import { towerPlanInput, type TowerPlanRead } from "../../lib/tower-plans";
import type { TowerCatalogPage } from "../../lib/tower-catalog";
import type { Page } from "@playwright/test";
test.use({ trace: "off", screenshot: "off", video: "off" });

async function api(page: Page, path: string, method = "GET", body?: unknown) {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") { const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json(); headers["X-CSRF-Token"] = csrf.csrf_token; headers["Content-Type"] = "application/json"; }
    const response = await fetch(args.path, { method: args.method, cache: "no-store", headers, body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

const declared = (category: "storage" | "fan", model: string) => ({ action: "add_line" as const, category, line_id: null, candidates: [{ component_id: null, declared_model: model, quantity: 1 }] });

// Pantalla real «Mi plan»: plan creado por la API con componentes declarados (sin precios ni fichas inventadas),
// comprobado desde el navegador. Marcar una compra o actualizar precios nunca toca la PC guardada.
test("@tower07-mi-plan la pantalla guía la próxima compra, actualiza precios y no toca Mi PC sin confirmar", async ({ page }) => {
  await loginBasic(page);
  const input = { ...emptyTower(), name: "PC propia mi plan" };
  const created = await api(page, "/api/towers", "POST", input); expect(created.status).toBe(201);
  const own = created.data as Tower;
  let plan: TowerPlanRead | null = null, pcWrites = 0;
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (["POST", "PUT", "DELETE"].includes(request.method()) && (path === "/api/towers" || path === `/api/towers/${own.id}`)) pcWrites++;
  });
  try {
    const catalog = await api(page, "/api/catalog/components?page=1&page_size=1"); expect(catalog.status).toBe(200);
    const body = towerPlanInput({
      name: "Mi plan propio", pc_id: own.id, expected_pc_revision: own.revision, expected_catalog_version: (catalog.data as TowerCatalogPage).dataset_version, objective: "general", workload: null, budget_ars: "1000.00", price_condition: "cash",
      stages: [{ name: "Compra 1", budget_ars: "500.00", materials: [], actions: [declared("storage", "SSD propio sin ficha")] }, { name: "Compra 2", budget_ars: "500.00", materials: [], actions: [declared("fan", "Ventilador propio sin ficha")] }],
    }, randomUUID());
    const stored = await api(page, "/api/tower-plans", "POST", body); expect(stored.status).toBe(201);
    plan = stored.data as TowerPlanRead;
    expect(typeof plan.spent_ars === "string" || plan.spent_ars === null).toBe(true);

    await page.goto(`/tower-plans/${plan.id}`);
    await expect(page.getByRole("heading", { name: "Tu plan, paso a paso", level: 1 })).toBeVisible();
    const next = page.getByRole("region", { name: "Tu próxima compra", exact: true });
    await expect(next).toBeVisible();
    await expect(next).toContainText("Hoy tenés"); await expect(next).toContainText("Comprás");
    await expect(page.getByRole("region", { name: "Plata del plan", exact: true })).toContainText("Todo el plan");
    await expect(page.getByRole("region", { name: "Todas tus compras", exact: true })).toBeVisible();
    await expect(page.locator(".mp")).not.toContainText(/Etapa|pieza|Dar de baja|snapshot/);

    // A 390 px se apila sin desplazamiento horizontal.
    await page.setViewportSize({ width: 390, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1440, height: 900 });

    // Marcar la compra no cambia Mi PC; «Ahora no» deja todo igual.
    const marked = page.waitForResponse(response => response.url().includes(`/api/tower-plans/${plan!.id}/stages/`) && response.request().method() === "PUT");
    await page.getByRole("button", { name: "Ya la compré: Compra 1", exact: true }).click();
    expect((await marked).status()).toBe(200);
    await expect(page.getByText("¿Actualizamos Mi PC?")).toBeVisible();
    await page.getByRole("button", { name: "Ahora no", exact: true }).click();
    expect(pcWrites).toBe(0);
    expect((await api(page, `/api/towers/${own.id}`)).data).toEqual(own);

    // Actualizar precios pide confirmar y guarda una versión nueva del plan; Mi PC sigue igual.
    await page.getByRole("button", { name: "Actualizar precios", exact: true }).click();
    await expect(page.getByText("¿Buscamos los precios de hoy?")).toBeVisible();
    const recalculated = page.waitForResponse(response => response.url().endsWith(`/api/tower-plans/${plan!.id}/recalculate`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Buscar precios nuevos", exact: true }).click();
    const response = await recalculated; expect(response.ok()).toBe(true);
    const sent = response.request().postDataJSON() as { expected_plan_revision: number; expected_pc_revision: number };
    expect(sent.expected_plan_revision).toBe(plan.revision); expect(sent.expected_pc_revision).toBe(own.revision);
    plan = await response.json() as TowerPlanRead;
    await expect(page.getByText("Actualizamos los precios de tu plan")).toBeVisible();
    expect(pcWrites).toBe(0); expect((await api(page, `/api/towers/${own.id}`)).data).toEqual(own);

    // Borrar el plan pide confirmación explícita.
    await page.getByRole("button", { name: "Borrar este plan", exact: true }).click();
    const form = page.getByRole("form", { name: "Confirmar que querés borrar el plan", exact: true });
    await expect(form).toBeVisible();
    const sure = form.getByLabel("Quiero borrar este plan", { exact: true });
    await expect(sure).not.toBeChecked(); await expect(sure).toHaveJSProperty("required", true);
    await form.getByRole("button", { name: "Mejor no", exact: true }).click();
    await expect(form).toHaveCount(0);
  } finally {
    try { if (plan) { const latest = await api(page, `/api/tower-plans/${plan.id}`); if (latest.status === 200) expect((await api(page, `/api/tower-plans/${plan.id}`, "DELETE", { expected_plan_revision: latest.data.revision })).status).toBe(204); else expect(latest.status).toBe(404); } }
    finally { expect((await api(page, `/api/towers/${own.id}`, "DELETE")).status).toBe(204); }
  }
});
