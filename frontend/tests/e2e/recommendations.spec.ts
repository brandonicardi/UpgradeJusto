import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { assertBasic, basicApi, demoInput, loginBasic, openBasic, recommendRam, recommendGpu } from "../support/basic-scope";
import type { PC } from "../../lib/pcs";
import type { CatalogPage } from "../../lib/catalog";

test.use({ trace: "off", screenshot: "off", video: "off" });

test("CU06 básico: beneficio RAM, coste trazable, límite exacto y dueño", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
  const contextA = await newIsolatedContext(), contextB = await newIsolatedContext();
  const a = await contextA.newPage(), b = await contextB.newPage();
  let pc: PC | null = null;
  let failed = false;
  try {
    await loginBasic(a); await loginBasic(b);
    const created = await basicApi(a, "", "POST", demoInput("A"));
    expect(created.status).toBe(201); pc = created.data as PC;
    await openBasic(a, pc);
    const resultPanel = a.getByRole("main").getByRole("region", { name: "Preview de recomendaciones del servidor", exact: true });
    const response = await fetch("http://127.0.0.1:8000/api/catalog/components?page_size=50");
    expect(response.status).toBe(200);
    const catalog = await response.json() as CatalogPage;
    const recommended = (await recommendRam(a, pc, "1000000")).items[0];
    expect(recommended.status).toBe("recommended");
    expect(recommended.benefit.status).toBe("supported");
    expect(recommended.cost.total_ars).toBe("766417.98");
    expect(recommended.cost.within_budget).toBe(true);
    assertBasic(recommended.evaluation, "compatible");
    expect(recommended.cost.lines.length).toBeGreaterThan(0);
    for (const line of recommended.cost.lines) {
      expect(catalog.items.find(item => item.id === line.component_id)?.prices.some(price => price.amount === line.unit_amount && price.currency === "ARS" && price.source === line.source && price.date === line.date)).toBe(true);
      await expect(resultPanel).toContainText(line.source);
      await expect(resultPanel).toContainText(line.date);
    }
    await expect(resultPanel).toContainText("✓ Recomendada");
    await expect(resultPanel.getByRole("region", { name: "Comprobación de componentes", exact: true })).toContainText("Compatible para uso sin overclock");
    await expect(resultPanel).toContainText("Histórico");
    expect((await basicApi(a, `/${pc.id}`)).data).toEqual(pc);
    const exact = (await recommendRam(a, pc, "766417.98")).items[0];
    expect(exact.cost.within_budget).toBe(true);
    const rejected = (await recommendRam(a, pc, "766417.97")).items[0];
    expect(rejected.cost.within_budget).toBe(false); expect(rejected.status).toBe("rejected");
    await expect(resultPanel).toContainText("! No recomendada");
    await expect(resultPanel).toContainText("Te faltan");
    const body = { expected_pc_revision: pc.revision, objective: "general", budget_ars: "1000000", alternatives: [{ key: "owner-check", replacements: [{ category: "ram", candidates: [{ component_id: "P05", quantity: 2 }] }] }] };
    const route = `/${pc.id}/recommendations/preview`;
    expect((await basicApi(b, route, "POST", body)).status).toBe(404);
    expect((await basicApi(a, route, "POST", { ...body, expected_pc_revision: pc.revision + 1 })).status).toBe(409);
    expect((await basicApi(a, route, "POST", { ...body, owner_id: "untrusted" })).status).toBe(422);
    expect((await basicApi(a, route + "?owner_id=", "POST", body)).status).toBe(422);
    const forbidden = await a.evaluate(async args => (await fetch(`/api/pcs${args.route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args.body) })).status, { route, body });
    expect(forbidden).toBe(403);
    expect((await basicApi(a, `/${pc.id}`)).data).toEqual(pc);
    // A necessary unknown must not become a recommendation even with enough money.
    const panel = a.getByRole("main").getByRole("region", { name: "Recomendaciones de mejoras", exact: true });
    await panel.getByLabel("Presupuesto ARS", { exact: true }).fill("1000000");
    await panel.getByRole("button", { name: "Añadir componente dependiente", exact: true }).click();
    await panel.getByLabel("Categoría de dependencia 1, alternativa 1", { exact: true }).selectOption("motherboard");
    await panel.getByLabel("Componente de dependencia 1, alternativa 1, opción 1", { exact: true }).selectOption("P03");
    const waiting = a.waitForResponse(r => r.url().endsWith(route) && r.request().method() === "POST");
    await panel.getByRole("button", { name: "Buscar mejora", exact: true }).click();
    const unknownResponse = await waiting; expect(unknownResponse.status()).toBe(200);
    const unknown = await unknownResponse.json();
    expect(unknown.items[0].status).toBe("requires_verification");
    assertBasic(unknown.items[0].evaluation, "requiere_verificacion");
    await expect(resultPanel.getByRole("region", { name: "Comprobación de componentes", exact: true })).toContainText("Falta información");
    await expect(resultPanel).toContainText("Revisá el modelo exacto del procesador");
    expect((await basicApi(a, `/${pc.id}`)).data).toEqual(pc);
    await openBasic(a, pc);
    const singleGpu = (await recommendGpu(a, pc, false)).items[0];
    expect(singleGpu.status).toBe("rejected");
    assertBasic(singleGpu.evaluation, "incompatible");
    const combo = (await recommendGpu(a, pc, true)).items[0];
    expect(combo.status).toBe("recommended");
    expect(combo.cost.total_ars).toMatch(/^1882130(?:\.0{1,2})?$/);
    expect(combo.cost.within_budget).toBe(true);
    expect(combo.benefit.status).toBe("supported");
    assertBasic(combo.evaluation, "compatible");
    await expect(resultPanel).toContainText("✓ Recomendada");
    for (const line of combo.cost.lines) {
      expect(catalog.items.find(item => item.id === line.component_id)?.prices.some(price => price.amount === line.unit_amount && price.currency === "ARS" && price.date === line.date && price.source === line.source)).toBe(true);
      await expect(resultPanel).toContainText(line.source);
      await expect(resultPanel).toContainText(line.date);
    }
    expect((await basicApi(a, `/${pc.id}`)).data).toEqual(pc);
  } catch (error) { failed = true; throw error; }
  finally {
    try { if (pc && ![204, 404].includes((await basicApi(a, `/${pc.id}`, "DELETE")).status) && !failed) throw new Error("Own recommendation PC cleanup failed"); }
    finally { await Promise.allSettled([contextA.close(), contextB.close()]); }
  }
});
