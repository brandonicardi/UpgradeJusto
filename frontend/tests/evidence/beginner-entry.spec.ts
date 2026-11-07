import { expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { test } from "../e2e/fixtures";
import { captureBoth } from "../support/visual-evidence";
import { loginBasic, basicApi, demoInput, openBasic, evaluateBasic, assertBasic, recommendRam } from "../support/basic-scope";
import { hardwareGuideSources, hardwareTextExample } from "../../lib/hardware-guide";
import type { PC } from "../../lib/pcs";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("@entry38-ui acciones, anclas y foco sin superposición1440/390", async ({ newIsolatedContext }) => {
  test.setTimeout(90000);
  const context = await newIsolatedContext(), page = await context.newPage(); page.setDefaultTimeout(10000);
  let phase = "setup", failure: string | null = null;
  try {
    const parent = path.resolve(process.cwd(), "../.local/evidence/tiendas/entry-delta");
    await mkdir(parent, { recursive: true });
    const directory = path.join(parent, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
    await mkdir(directory, { recursive: false });
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport); await page.goto("/");
      phase = "skip-keyboard";
      const skip = page.getByRole("link", { name: "Saltar al contenido", exact: true });
      await page.keyboard.press("Tab"); await expect(skip).toBeFocused(); await expect(skip).toBeInViewport();
      const skipBox = await skip.boundingBox(), mainBox = await page.getByRole("main").boundingBox();
      expect(Boolean(skipBox && mainBox && skipBox.y + skipBox.height <= mainBox.y), "Focused skip link must occupy its own row, not overlay content").toBe(true);
      await skip.press("Enter"); await expect(page.getByRole("main")).toBeFocused();
      await expect(skip).not.toBeInViewport();
      const titleBox = await page.getByRole("heading", { level: 1, name: "Quiero mejorar mi PC", exact: true }).boundingBox();
      expect(Boolean(titleBox && titleBox.y >= 0), "Skip navigation must not crop the entry title").toBe(true);
      const help = page.getByRole("main").getByRole("link", { name: "Necesito ayuda", exact: true });
      await page.keyboard.press("Tab"); await expect(help).toBeFocused();
      await expect(help).toHaveClass(/beginner-choice-primary/);
      await expect(page.getByRole("main").getByRole("link", { name: "Quiero pegar una lista", exact: true })).toHaveAttribute("aria-describedby", "beginner-paste-note");
      phase = "entry-capture";
      await page.evaluate(async () => { await document.fonts.ready; window.scrollTo({ top: 0, behavior: "instant" }); });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Entry must not overflow").toBe(true);
      await page.screenshot({ path: path.join(directory, `01-entry-${viewport.width}.png`), animations: "disabled" });
      await page.screenshot({ path: path.join(directory, `01-entry-${viewport.width}-fullpage.png`), fullPage: true, animations: "disabled" });
      phase = "guide-keyboard";
      await help.press("Enter");
      const heading = page.getByRole("heading", { name: "Encontrá los componentes sin abrir la PC", exact: true });
      await expect(heading).toBeFocused(); await expect(skip).not.toBeInViewport();
      const guide = page.getByRole("region", { name: "Encontrá los componentes sin abrir la PC", exact: true });
      const task = guide.getByText("Procesador y memoria: empezá por Configuración", { exact: true });
      await page.keyboard.press("Tab"); await expect(task).toBeFocused(); await task.press("Enter");
      await expect(task.locator("..")).toHaveJSProperty("open", true);
      await expect(guide.getByRole("link", { name: "Cómo encontrar información del dispositivo en Microsoft", exact: false })).toBeVisible();
      expect(await page.locator(".entry-shell > .sidebar").evaluate(element => getComputedStyle(element).position), "Public guide navigation must stay at document start").toBe("static");
      phase = "guide-capture";
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Guide must not overflow").toBe(true);
      await page.screenshot({ path: path.join(directory, `02-guide-${viewport.width}.png`), animations: "disabled" });
      await page.screenshot({ path: path.join(directory, `02-guide-${viewport.width}-fullpage.png`), fullPage: true, animations: "disabled" });
    }
  } catch { failure = `Integral38 entry UI failed phase=${phase}`; }
  finally { await context.close(); }
  if (failure) throw new Error(failure);
});

test("@entry38 entrada, ayuda y continuidad real PC a propuesta sin guardado implícito", async ({ newIsolatedContext }) => {
  test.setTimeout(150000);
  const context = await newIsolatedContext(), page = await context.newPage(); page.setDefaultTimeout(15000);
  let phase = "entry", ownPC: PC | null = null, failure: string | null = null, extractionPosts = 0, pcPosts = 0;
  page.on("request", request => {
    if (request.method() !== "POST") return;
    const route = new URL(request.url()).pathname;
    if (["/api/pcs/extract", "/api/towers/extract"].includes(route)) extractionPosts++;
    if (["/api/pcs", "/api/towers"].includes(route)) pcPosts++;
  });
  try {
    const parent = path.resolve(process.cwd(), "../.local/evidence/tiendas/entry");
    await mkdir(parent, { recursive: true });
    const directory = path.join(parent, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
    await mkdir(directory, { recursive: false });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Quiero mejorar mi PC", exact: true })).toBeVisible();
    for (const name of ["Conozco mis componentes", "Necesito ayuda", "Quiero pegar una lista"]) await expect(page.getByRole("main").getByRole("link", { name, exact: true })).toBeVisible();
    await captureBoth(page, directory, "01-entrada-principiante");
    phase = "guide-keyboard";
    await page.getByRole("main").getByRole("link", { name: "Necesito ayuda", exact: true }).click();
    const guide = page.getByRole("region", { name: "Encontrá los componentes sin abrir la PC", exact: true });
    const summary = guide.getByText("Procesador y memoria: empezá por Configuración", { exact: true });
    await summary.focus(); await summary.press("Enter");
    await expect(guide.getByRole("link", { name: "Cómo encontrar información del dispositivo en Microsoft", exact: false })).toBeVisible();
    await expect(guide.getByRole("link", { name: "Cómo encontrar información del dispositivo en Microsoft", exact: false })).toHaveAttribute("href", hardwareGuideSources.device);
    await captureBoth(page, directory, "02-guia-integrada", guide);
    phase = "manual-entry";
    await loginBasic(page); await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "Conozco mis componentes", exact: true }).click();
    await expect(page).toHaveURL(/\/pcs$/);
    await page.getByRole("button", { name: "Nueva PC", exact: true }).click();
    await page.getByText("Cómo encontrar los datos de mi PC", { exact: true }).click();
    await expect(page.getByRole("form", { name: "Editor de PC", exact: true })).toBeVisible();
    expect(pcPosts).toBe(0);
    await captureBoth(page, directory, "03-editor-con-ayuda");
    await page.getByRole("button", { name: "Cancelar edición", exact: true }).click();
    phase = "paste-example"; await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: "Quiero pegar una lista", exact: true }).click();
    const example = page.getByRole("region", { name: "Ejemplo de lista de componentes", exact: true });
    const text = page.getByLabel("Texto de la PC (máximo 12000 caracteres)", { exact: true });
    await expect(example).toContainText(hardwareTextExample); await expect(text).toHaveValue("");
    expect(await page.evaluate(() => {
      const example = document.querySelector("[data-hardware-example]"), input = document.querySelector('textarea[name="text"]');
      return !!example && !!input && !!(example.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING);
    }), "Hardware example must precede the textarea").toBe(true);
    await captureBoth(page, directory, "04-ejemplo-antes-del-texto");
    expect(extractionPosts).toBe(0); expect(pcPosts).toBe(0);
    expect(((await basicApi(page, "?page=1&page_size=20")).data as { total: number }).total).toBe(0);
    phase = "existing-workspace-continuity";
    const created = await basicApi(page, "", "POST", { ...demoInput("A"), name: "Mi PC de escritorio" }); expect(created.status).toBe(201); ownPC = created.data as PC;
    await openBasic(page, ownPC); assertBasic(await evaluateBasic(page, ownPC), "compatible");
    const recommendation = (await recommendRam(page, ownPC, "1000000")).items[0];
    expect(recommendation.status).toBe("recommended"); expect(recommendation.cost.total_ars).toBe("766417.98");
    const result = page.getByRole("region", { name: "Preview de recomendaciones del servidor", exact: true });
    await expect(result.getByText("16 GB → 32 GB", { exact: true })).toBeVisible();
    await expect(result.getByRole("link", { name: "Planificar mejora →", exact: true })).toHaveAttribute("href", "/plans");
    await captureBoth(page, directory, "05-pc-objetivo-propuesta", result);
    expect((await basicApi(page, `/${ownPC.id}`)).data).toEqual(ownPC);
  } catch { failure = `Integral38 entry evidence failed phase=${phase}`; }
  finally {
    try { if (ownPC && ![204, 404].includes((await basicApi(page, `/${ownPC.id}`, "DELETE")).status)) failure ??= "Integral38 entry evidence failed phase=cleanup"; }
    catch { failure ??= "Integral38 entry evidence failed phase=cleanup"; }
    finally { await context.close(); }
  }
  if (failure) throw new Error(failure);
});
