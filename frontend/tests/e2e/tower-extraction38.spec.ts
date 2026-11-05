import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { loginBasic } from "../support/basic-scope";
import { towerCategories, towerKeys, type Tower } from "../../lib/towers";
import type { TowerExtraction } from "../../lib/tower-extraction";

// Prepared only. Build must wait for backend CU02 fixes/review READY and the
// explicit real-provider TEST gate. No mock provider, trace, video or screenshots.
test.use({ trace: "off", screenshot: "off", video: "off" });
test("@tower02 texto real, propuesta editable nueve categorías y único guardado explícito", async ({ page }) => {
  // One provider call can use its full30s deadline, plus own auth/edit/cleanup.
  test.setTimeout(90000);
  await loginBasic(page); let saved: Tower | null = null, confirms = 0;
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/towers/extract/confirm") confirms++; });
  try {
    await page.goto("/pcs/import");
    const text = "Memoria: módulos DDR4, cantidad por confirmar. Almacenamiento: SSD modelo y cantidad por confirmar. Ventiladores: cantidad por confirmar. No conozco el resto de las piezas.";
    await page.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true }).fill(text);
    const extracted = page.waitForResponse(response => response.url().endsWith("/api/towers/extract") && response.request().method() === "POST", { timeout: 40000 });
    await page.getByRole("button", { name: "Extraer propuesta", exact: true }).click();
    const response = await extracted; expect(response.status()).toBe(200); const preview: TowerExtraction = await response.json();
    expect(preview.requires_confirmation).toBe(true); expect(preview.evidence).toHaveLength(9); expect(confirms).toBe(0);
    const total = await page.evaluate(async () => { const response = await fetch("/api/towers?page=1&page_size=20", { cache: "no-store" }); return (await response.json()).total; }); expect(total).toBe(0);
    const form = page.getByRole("form", { name: "Propuesta editable de torre", exact: true }); await expect(form).toBeVisible();
    // Explicit synthetic user's edits, not inferred quantities or manufacturer data.
    const remove = form.getByRole("button", { name: /^Retirar línea / }); const count = await remove.count();
    for (let i = 0; i < count; i++) await remove.first().click();
    for (const category of towerKeys) await form.getByLabel(`Estado de ${towerCategories[category]}`, { exact: true }).selectOption("unknown");
    await form.getByLabel("Estado de Almacenamiento", { exact: true }).selectOption("present");
    await form.getByRole("button", { name: "Agregar línea de Almacenamiento", exact: true }).click();
    await expect(form.getByLabel("Cantidad explícita 1 (unidades)", { exact: true })).toHaveValue("");
    await form.getByLabel("Modelo declarado 1", { exact: true }).fill("SSD declarado propio sin ficha técnica");
    await form.getByLabel("Cantidad explícita 1 (unidades)", { exact: true }).fill("1");
    await form.getByRole("button", { name: "Seguir al paso 3", exact: true }).click(); expect(confirms).toBe(0);
    const confirmForm = page.getByRole("form", { name: "Guardar tu PC", exact: true }); await expect(confirmForm).toBeVisible();
    await confirmForm.getByLabel("Nombre de tu PC", { exact: true }).fill("Torre importada propia de prueba");
    await expect(confirmForm.getByRole("button", { name: "Confirmar y guardar mi torre", exact: true })).toBeDisabled(); expect(confirms).toBe(0);
    await confirmForm.getByLabel("Revisé esta propuesta y confirmo explícitamente guardarla", { exact: true }).check();
    const confirmed = page.waitForResponse(item => item.url().endsWith("/api/towers/extract/confirm") && item.request().method() === "POST");
    await confirmForm.getByRole("button", { name: "Confirmar y guardar mi torre", exact: true }).click();
    const result = await confirmed; expect(result.status()).toBe(201); saved = await result.json() as Tower;
    expect(confirms).toBe(1); expect(saved.schema_version).toBe(2); expect(saved.lines[0].quantity).toBe(1); expect(saved.lines[0].line_id).toBeTruthy();
    await expect(page.getByRole("region", { name: "Torre guardada", exact: true })).toContainText("No se evaluó compatibilidad");
  } finally {
    if (saved) {
      const status = await page.evaluate(async id => { const csrf = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json(); return (await fetch(`/api/towers/${id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrf.csrf_token } })).status; }, saved.id);
      expect(status).toBe(204);
    }
  }
});
