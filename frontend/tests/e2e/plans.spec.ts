import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { test } from "./fixtures";
import type { PC, PCInput } from "../../lib/pcs";
import type { Plan, PlanInput, PlanPage } from "../../lib/plans";

test.use({ trace: "off", screenshot: "off", video: "off" });
async function login(page: Page) {
  await page.goto("/account");
  const statuses = await page.evaluate(async credentials => {
    const token = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
    const options = { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(credentials) };
    const registered = await fetch("/api/auth/register", options), logged = await fetch("/api/auth/login", options);
    return [registered.status, logged.status];
  }, { email: `plan-${randomUUID()}@example.test`, password: randomUUID() });
  expect(statuses).toEqual([201, 200]);
}
async function api(page: Page, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async args => {
    const headers: Record<string, string> = {};
    if (args.method !== "GET") {
      const token = await (await fetch("/api/auth/csrf", { cache: "no-store", signal: AbortSignal.timeout(15000) })).json();
      headers["X-CSRF-Token"] = token.csrf_token; headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`/api${args.path}`, { method: args.method, headers, cache: "no-store", signal: AbortSignal.timeout(20000), body: args.body === undefined ? undefined : JSON.stringify(args.body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }, { path, method, body });
}

test("CU07 G: snapshot acumulado persistente, recálculo confirmado, dueño y borrado", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
  const ca = await newIsolatedContext(), cb = await newIsolatedContext();
  const a = await ca.newPage(), b = await cb.newPage();
  a.setDefaultTimeout(15000); b.setDefaultTimeout(15000);
  let pcId: string | null = null, planId: string | null = null, failed = false;
  try {
    await login(a); await login(b);
    const pcInput: PCInput = { name: `PC G propia ${randomUUID()}`, components: [
      { category: "cpu", component_id: "P01", quantity: 1 }, { category: "motherboard", component_id: "P03", quantity: 1 }, { category: "ram", component_id: "P04", quantity: 2 },
    ], context: { bios_version: "P2.30", notes: null } };
    const created = await api(a, "/pcs", "POST", pcInput); expect(created.status).toBe(201);
    let pc = created.data as PC; pcId = pc.id;
    await a.goto("/plans"); await a.getByRole("button", { name: "Nuevo plan", exact: true }).click();
    const form = a.getByRole("form", { name: "Editor de plan", exact: true });
    const name = `Plan G propio ${randomUUID()}`;
    await form.getByLabel("Nombre del plan", { exact: true }).fill(name);
    await form.getByLabel("PC fuente", { exact: true }).selectOption(pc.id);
    await form.getByRole("button", { name: "Cargar PC actual para el plan", exact: true }).click();
    await expect(form).toContainText(`Revisión PC cargada: ${pc.revision}`);
    await form.getByLabel("Presupuesto global ARS", { exact: true }).fill("999999999999.99");
    await form.getByLabel("Nombre etapa 1", { exact: true }).fill("RAM inicial");
    await form.getByLabel("Categoría de etapa 1, cambio 1", { exact: true }).selectOption("ram");
    await form.getByLabel("Componente de etapa 1, cambio 1, opción 1", { exact: true }).selectOption("P05");
    await form.getByLabel("Cantidad de etapa 1, cambio 1, opción 1", { exact: true }).fill("1");
    await form.getByRole("button", { name: "Añadir etapa acumulada", exact: true }).click();
    await form.getByLabel("Nombre etapa 2", { exact: true }).fill("RAM posterior");
    await form.getByLabel("Categoría de etapa 2, cambio 1", { exact: true }).selectOption("ram");
    await form.getByLabel("Componente de etapa 2, cambio 1, opción 1", { exact: true }).selectOption("P04");
    await form.getByLabel("Cantidad de etapa 2, cambio 1, opción 1", { exact: true }).fill("3");
    const waiting = a.waitForResponse(response => response.url().endsWith("/api/plans") && response.request().method() === "POST");
    await form.getByRole("button", { name: "Calcular y guardar borrador", exact: true }).click();
    const savedResponse = await waiting; expect(savedResponse.status()).toBe(201);
    expect(savedResponse.headers()["cache-control"]).toContain("no-store");
    let plan = await savedResponse.json() as Plan; planId = plan.id;
    expect(["requires_verification", "blocked"]).toContain(plan.status);
    const groups = (index: number) => (plan.stages[index].evaluated_configuration as { components: PC["components"] }).components.filter(group => group.category === "ram");
    expect(groups(0)).toEqual([{ category: "ram", component_id: "P05", quantity: 1 }]);
    expect(groups(1)).toEqual([{ category: "ram", component_id: "P04", quantity: 3 }]);
    expect((await api(a, `/pcs/${pc.id}`)).data).toEqual(pc);
    const detail = a.getByRole("region", { name: "Detalle de plan", exact: true });
    await expect(detail).toContainText("Borrador"); await expect(detail).toContainText("Coste acumulado");
    await a.reload(); await a.getByRole("button", { name, exact: true }).click();
    expect((await api(a, `/plans/${plan.id}`)).data).toEqual(plan);
    const body: PlanInput & { revision: number } = { name: plan.name, pc_id: pc.id, expected_pc_revision: pc.revision, objective: plan.objective, budget_ars: plan.budget_ars,
      stages: plan.stages.map(stage => ({ name: stage.name, replacements: stage.replacements })), revision: plan.revision };
    expect(((await api(b, "/plans?page=1&page_size=20")).data as PlanPage).items).toEqual([]);
    for (const method of ["GET", "PUT", "DELETE"]) expect((await api(b, `/plans/${plan.id}`, method, method === "PUT" ? body : undefined)).status).toBe(404);
    expect((await api(a, "/plans", "POST", { ...body, revision: undefined, owner_id: "untrusted" })).status).toBe(422);
    expect((await api(a, `/plans/${plan.id}`, "PUT", { ...body, revision: plan.revision + 1 })).status).toBe(409);
    expect((await api(a, `/plans/${plan.id}`)).data).toEqual(plan);
    const updated = await api(a, `/pcs/${pc.id}`, "PUT", { ...pcInput, context: { bios_version: null, notes: "Cambio explícito propio" }, revision: pc.revision });
    expect(updated.status).toBe(200); pc = updated.data as PC;
    await detail.getByRole("button", { name: "Recargar plan sin recalcular", exact: true }).click();
    await expect(detail).toContainText("La PC cambió");
    expect((await api(a, `/plans/${plan.id}`)).data).toEqual(plan);
    await detail.getByRole("button", { name: "Preparar recálculo", exact: true }).click();
    const confirm = form.getByRole("button", { name: "Confirmar recálculo y guardar plan", exact: true });
    await expect(confirm).toBeDisabled();
    await form.getByRole("button", { name: "Cargar PC actual para el plan", exact: true }).click();
    await expect(form).toContainText(`Revisión PC cargada: ${pc.revision}`);
    await expect(confirm).toBeDisabled();
    await form.getByRole("checkbox").check();
    const recalculated = a.waitForResponse(response => response.url().endsWith(`/api/plans/${planId}`) && response.request().method() === "PUT");
    await confirm.click(); const recalculatedResponse = await recalculated; expect(recalculatedResponse.status()).toBe(200);
    const next = await recalculatedResponse.json() as Plan; expect(next.revision).toBe(plan.revision + 1); expect(next.pc_revision).toBe(String(pc.revision)); plan = next;
    expect((await api(a, `/pcs/${pc.id}`)).data).toEqual(pc);
    expect((await api(a, `/pcs/${pc.id}`, "DELETE")).status).toBe(204); pcId = null;
    const retained = await api(a, `/plans/${plan.id}`); expect(retained.status).toBe(200);
    expect((retained.data as Plan).base_snapshot).toEqual(plan.base_snapshot);
    await detail.getByRole("button", { name: "Recargar plan sin recalcular", exact: true }).click();
    await expect(detail).toContainText(/eliminada|no disponible/);
    await detail.getByRole("button", { name: "Preparar borrado de plan", exact: true }).click();
    const deletion = detail.getByRole("form", { name: "Confirmar borrado de plan", exact: true });
    await deletion.getByRole("checkbox").check();
    await deletion.getByRole("button", { name: "Eliminar plan definitivamente", exact: true }).click();
    await expect(a.getByRole("status", { name: "Estado de planes", exact: true })).toContainText("Plan eliminado");
    expect((await api(a, `/plans/${plan.id}`)).status).toBe(404); planId = null;
  } catch (error) { failed = true; throw error; }
  finally {
    try {
      for (const path of [planId ? `/plans/${planId}` : null, pcId ? `/pcs/${pcId}` : null]) if (path) {
        const cleanup = await api(a, path, "DELETE");
        if (![204, 404].includes(cleanup.status) && !failed) throw new Error("Own plan fixtures cleanup failed");
      }
    } catch (error) { if (!failed) throw error; }
    finally { await Promise.allSettled([ca.close(), cb.close()]); }
  }
});
