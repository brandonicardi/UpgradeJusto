import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test } from "../e2e/fixtures";
import { assertBasic, basicApi, demoInput, evaluateBasic, loginBasic, openBasic, recommendRam, recommendGpu, simulateBasic } from "../support/basic-scope";
import type { PC } from "../../lib/pcs";

test("Evidencia final real: dos demos, fallo nominal, unknown y presupuesto", async ({ newIsolatedContext }) => {
  test.setTimeout(180000);
  const context = await newIsolatedContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  page.setDefaultTimeout(15000);
  const directory = path.resolve(process.cwd(), `../.local/evidence/cu05-cu06-scope-v1/after/${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
  const pcs: PC[] = [];
  let phase = "setup", failure: string | null = null;
  async function capture(name: string, panelName?: string) {
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true, animations: "disabled" });
    if (panelName) {
      const panel = page.getByRole("main").getByRole("region", { name: panelName, exact: true });
      await panel.scrollIntoViewIfNeeded();
      await panel.screenshot({ path: path.join(directory, `${name}-panel.png`), animations: "disabled" });
      // Locator screenshots scroll tall elements themselves. Explicitly restore
      // the readable start AFTER the full panel capture, never its midpoint.
      const target = panelName === "Preview de recomendaciones del servidor" ? panel.getByRole("article").first() : panel;
      await target.evaluate(element => element.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
      await page.screenshot({ path: path.join(directory, `${name}-viewport.png`), animations: "disabled" });
    }
  }
  try {
    await mkdir(path.dirname(directory), { recursive: true });
    await mkdir(directory, { recursive: false });
    await loginBasic(page);
    for (const which of ["A", "B"] as const) {
      const created = await basicApi(page, "", "POST", demoInput(which));
      expect(created.status).toBe(201); pcs.push(created.data as PC);
    }
    phase = "catalogo";
    await page.goto("/catalog");
    await expect(page.getByRole("main").getByRole("status")).toContainText("componentes");
    await capture("01catalogo");
    for (const [index, name] of [[0, "02pcAcompatible"], [1, "03pcBcompatible"]] as const) {
      phase = name;
      await openBasic(page, pcs[index]);
      assertBasic(await evaluateBasic(page, pcs[index]), "compatible");
      await expect(page.getByRole("main").getByText("✓ Compatible para uso sin overclock", { exact: true })).toBeVisible();
      await expect(page.getByRole("region", { name: "Comprobación de componentes", exact: true })).toContainText("Revisá montaje y refrigeración antes de instalar");
      await capture(name, "Resultado parcial del servidor");
    }
    phase = "incompatible";
    assertBasic(await simulateBasic(page, pcs[1], "gpu", "P16"), "incompatible");
    await expect(page.getByRole("main").getByText("! Incompatible", { exact: true })).toBeVisible();
    await capture("04incompatible", "Resultado parcial del servidor");
    phase = "unknown";
    const unknown = await simulateBasic(page, pcs[1], "motherboard", "P03");
    assertBasic(unknown, "requiere_verificacion");
    expect(unknown.rule_results.some(rule => rule.state === "unknown")).toBe(true);
    await expect(page.getByRole("main").getByText("! Falta información", { exact: true })).toBeVisible();
    await capture("05unknown", "Resultado parcial del servidor");
    phase = "recomendacion";
    await openBasic(page, pcs[0]);
    const recommended = (await recommendRam(page, pcs[0], "1000000")).items[0];
    expect(recommended.status).toBe("recommended");
    expect(recommended.cost.total_ars).toBe("766417.98");
    expect(recommended.cost.within_budget).toBe(true);
    expect(recommended.benefit.status).toBe("supported");
    assertBasic(recommended.evaluation, "compatible");
    await expect(page.getByRole("main").getByText("✓ Recomendada", { exact: true })).toBeVisible();
    await capture("06recomendacion", "Preview de recomendaciones del servidor");
    phase = "presupuesto-insuficiente";
    const rejected = (await recommendRam(page, pcs[0], "766417.97")).items[0];
    expect(rejected.status).toBe("rejected"); expect(rejected.cost.within_budget).toBe(false);
    await expect(page.getByRole("main").getByText("! No recomendada", { exact: true })).toBeVisible();
    await capture("07presupuestoinsuf", "Preview de recomendaciones del servidor");
    phase = "movil";
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await recommendRam(page, pcs[0], "1000000")).items[0].status).toBe("recommended");
    await capture("08movil390x844", "Preview de recomendaciones del servidor");
    phase = "recomendacion-gpu-fuente";
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openBasic(page, pcs[0]);
    const gpu = (await recommendGpu(page, pcs[0], false)).items[0];
    expect(gpu.status).toBe("rejected");
    assertBasic(gpu.evaluation, "incompatible");
    const combo = (await recommendGpu(page, pcs[0], true)).items[0];
    expect(combo.status).toBe("recommended");
    expect(combo.cost.total_ars).toMatch(/^1882130(?:\.0{1,2})?$/);
    expect(combo.cost.within_budget).toBe(true);
    expect(combo.benefit.status).toBe("supported");
    assertBasic(combo.evaluation, "compatible");
    await expect(page.getByRole("main").getByText("✓ Recomendada", { exact: true })).toBeVisible();
    await capture("09-recomendacion-gpu-fuente", "Preview de recomendaciones del servidor");
    for (const pc of pcs) expect((await basicApi(page, `/${pc.id}`)).data).toEqual(pc);
  } catch { failure = `Evidence failed at phase: ${phase}`; }
  finally {
    for (const pc of pcs) {
      try { if (![204, 404].includes((await basicApi(page, `/${pc.id}`, "DELETE")).status)) failure ??= "Evidence failed at phase: cleanup"; }
      catch { failure ??= "Evidence failed at phase: cleanup"; }
    }
    await context.close();
  }
  if (failure) throw new Error(failure);
});
