import { expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { test } from "../e2e/fixtures";
import { assertBasic, basicApi, demoInput, evaluateBasic, loginBasic, openBasic, recommendRam } from "../support/basic-scope";
import type { PC } from "../../lib/pcs";

test("@design-reference Tu próxima mejora real desktop y móvil", async ({ newIsolatedContext }) => {
  test.setTimeout(120000);
  const context = await newIsolatedContext(), page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const directory = path.resolve(process.cwd(), `../.local/evidence/visual-delivery-v1/reference/${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
  let pc: PC | null = null, phase = "setup", failure: string | null = null;
  async function capture(name: string) {
    await page.evaluate(async () => { await document.fonts.ready; window.scrollTo({ top: 0, behavior: "instant" }); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "phase=layout; no horizontal document overflow").toBe(true);
    await expect(page.getByRole("heading", { name: "Tu próxima mejora", exact: true, level: 1 })).toBeInViewport();
    const pcBox = await page.locator(".current-pc").boundingBox();
    const formBox = await page.getByRole("form", { name: "Solicitar preview de alternativas", exact: true }).boundingBox();
    const resultBox = await page.getByRole("region", { name: "Preview de recomendaciones del servidor", exact: true }).boundingBox();
    expect(Boolean(pcBox && formBox && resultBox), "phase=layout; visible PC, form and result boxes required").toBe(true);
    if (!pcBox || !formBox || !resultBox) throw new Error("phase=layout; required box unavailable");
    expect(formBox.y + formBox.height <= resultBox.y, "phase=layout; result must follow complete form").toBe(true);
    if (page.viewportSize()!.width < 700) {
      expect(pcBox.y + pcBox.height <= formBox.y, "phase=layout; mobile PC must precede form").toBe(true);
    } else {
      expect(pcBox.x + pcBox.width <= formBox.x, "phase=layout; desktop PC must be left of form").toBe(true);
      expect(pcBox.y <= formBox.y && formBox.y < pcBox.y + pcBox.height, "phase=layout; form must start beside current PC").toBe(true);
    }
    expect(await page.evaluate(() => {
      const pc = document.querySelector(".current-pc"), form = document.querySelector(".recommendation-form"), result = document.querySelector(".recommendations-output");
      return !!pc && !!form && !!result && !!(pc.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(form.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING);
    }), "phase=layout; DOM and visual order must agree").toBe(true);
    await page.screenshot({ path: path.join(directory, `${name}-viewport.png`), animations: "disabled" });
    await page.screenshot({ path: path.join(directory, `${name}-fullpage.png`), fullPage: true, animations: "disabled" });
  }
  try {
    await mkdir(path.dirname(directory), { recursive: true });
    await mkdir(directory, { recursive: false });
    await loginBasic(page);
    const created = await basicApi(page, "", "POST", demoInput("A"));
    expect(created.status).toBe(201); pc = created.data as PC;
    await openBasic(page, pc);
    phase = "real-evaluation";
    assertBasic(await evaluateBasic(page, pc), "compatible");
    phase = "real-recommendation";
    const result = (await recommendRam(page, pc, "1000000")).items[0];
    expect(result.status).toBe("recommended");
    expect(result.cost.total_ars).toBe("766417.98");
    expect(result.cost.within_budget).toBe(true);
    expect(result.benefit.status).toBe("supported");
    assertBasic(result.evaluation, "compatible");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: "Tu próxima mejora", exact: true })).toBeVisible();
    const card = main.getByRole("article", { name: "Resultado alternativa opcion-1", exact: true });
    await expect(card).toContainText("✓ Recomendada");
    await expect(card.getByText("16 GB → 32 GB", { exact: true })).toBeVisible();
    await expect(card).toContainText("HOY · 2 módulos");
    await expect(card).toContainText("PROPUESTA · 2 módulos");
    await expect(card).toContainText("Compatible para uso sin overclock");
    await expect(card).toContainText("Comprobación básica de componentes. Revisá montaje y refrigeración antes de instalar.");
    await expect(card.getByRole("link", { name: "Planificar mejora →", exact: true })).toHaveAttribute("href", "/plans");
    phase = "desktop-capture";
    await capture("01-desktop-1440");
    phase = "mobile-keyboard";
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.getByRole("button", { name: "Menú", exact: false });
    await menu.focus(); await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("navigation", { name: "Principal", exact: true }).getByRole("link", { name: "Tu próxima mejora", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
    phase = "mobile-capture";
    await capture("02-mobile-390");
    expect((await basicApi(page, `/${pc.id}`)).data).toEqual(pc);
  } catch { failure = `Design reference failed at phase: ${phase}`; }
  finally {
    try { if (pc && ![204, 404].includes((await basicApi(page, `/${pc.id}`, "DELETE")).status)) failure ??= "Design reference failed at phase: cleanup"; }
    catch { failure ??= "Design reference failed at phase: cleanup"; }
    finally { await context.close(); }
  }
  if (failure) throw new Error(failure);
});
