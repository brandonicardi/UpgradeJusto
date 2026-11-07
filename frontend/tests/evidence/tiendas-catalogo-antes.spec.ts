import { expect, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { test } from "../e2e/fixtures";

test.use({ trace: "off", screenshot: "off", video: "off" });
const routes = [
  { name: "01-lista-pagina1", route: "/catalog?page=1&page_size=12", kind: "list" },
  { name: "02-lista-pagina2", route: "/catalog?page=2&page_size=12", kind: "list" },
  { name: "03-ficha-ventilador", route: "/catalog/cg-11473", kind: "detail" },
  { name: "04-ficha-almacenamiento", route: "/catalog/cg-11960", kind: "detail" },
] as const;
type Capture = { file: string; horizontal_overflow: boolean };
async function screenshot(page: Page, anchor: Locator, directory: string, file: string): Promise<Capture> {
  await expect(anchor).toBeVisible();
  await anchor.evaluate(element => element.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" }));
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  // Natural lazy loading only. Missing src is an observed baseline defect, not
  // an excuse to patch loading attributes, swap images or stall on offscreen img.
  await expect.poll(() => page.locator("main img").evaluateAll(images => images.every(image => {
    if (!(image instanceof HTMLImageElement) || !image.getAttribute("src")) return true;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return true;
    return image.complete;
  })), { message: "Visible public images must finish loading or use their real fallback" }).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await page.screenshot({ path: path.join(directory, file), animations: "disabled" });
  return { file, horizontal_overflow: overflow };
}
async function observations(page: Page) {
  return page.locator("main").evaluate(main => {
    const images = [...main.querySelectorAll("img")];
    const options = [...main.querySelectorAll<HTMLSelectElement>('select[name="category"]')].flatMap(select => [...select.options].filter(option => option.value !== ""));
    return {
      category_filter_options_count: options.length,
      category_filter_labels: options.map(option => option.textContent ?? ""),
      undefined_alt_present: images.some(image => image.alt.includes("undefined")),
      undefined_alt_count: images.filter(image => image.alt.includes("undefined")).length,
      illustration_count: images.filter(image => image.alt.startsWith("Ilustración de categoría:")).length,
      image_without_src_count: images.filter(image => !image.getAttribute("src")).length,
      loaded_product_photo_count: images.filter(image => !image.alt.startsWith("Ilustración de categoría:") && image.complete && image.naturalWidth > 0).length,
      placeholder_count: main.querySelectorAll(".placeholder,.tower-product-photo > span").length,
      offer_rendered_count: main.querySelectorAll(".tower-offer,.catalog-offer,[data-retail-offer]").length,
      price_pending_count: [...main.querySelectorAll(".catalog-card-price,.result-price")].filter(element => element.textContent?.trim() === "Precio por confirmar").length,
      catalog_cards_count: main.querySelectorAll(".catalog-card").length,
    };
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`@catalog38-before BASELINE OBSERVACIONAL catálogo actual ${viewport.width}`, async ({ newImageEvidenceContext }) => {
    // Default30s retained. No login, Google, provider, shared capability or writes.
    const context = await newImageEvidenceContext(), page = await context.newPage();
    await page.setViewportSize(viewport);
    const parent = path.resolve(process.cwd(), "../.local/tiendas/catalog-before");
    await mkdir(parent, { recursive: true });
    const directory = path.join(parent, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
    await mkdir(directory, { recursive: false });
    const records: { route: string; http_status: number; captures: Capture[]; observation: Awaited<ReturnType<typeof observations>> }[] = [];
    let phase = "start", failed = false;
    try {
      for (const item of routes) {
        phase = `${item.name}-navigate`;
        const response = await page.goto(item.route); expect(response?.status()).toBe(200);
        const main = page.getByRole("main"), heading = main.getByRole("heading", { level: 1 }).first();
        phase = `${item.name}-content`;
        let content: Locator;
        if (item.kind === "list") {
          await expect(main.locator(".catalog-card").first()).toBeVisible();
          const reportedPageTwoCase = main.locator(".catalog-card").filter({ has: page.locator('a[href="/catalog/cg-10422"]') });
          content = item.name === "02-lista-pagina2" && await reportedPageTwoCase.count() ? reportedPageTwoCase.first() : main.locator(".catalog-card").first();
        } else content = main.getByRole("region", { name: "Resumen del componente", exact: true });
        const captures: Capture[] = [];
        phase = `${item.name}-header-capture`;
        captures.push(await screenshot(page, heading, directory, `${item.name}-${viewport.width}-encabezado.png`));
        phase = `${item.name}-content-capture`;
        captures.push(await screenshot(page, content, directory, `${item.name}-${viewport.width}-contenido.png`));
        records.push({ route: item.route, http_status: response!.status(), captures, observation: await observations(page) });
      }
      phase = "capture_complete";
    } catch { failed = true; }
    finally {
      try { await writeFile(path.join(directory, "index.json"), JSON.stringify({ purpose: "BASELINE_OBSERVATIONAL_NOT_FUNCTIONAL_OR_VISUAL_APPROVAL", viewport, state: failed ? "capture_incomplete" : "capture_complete", phase, routes: records, business_findings_are_not_asserted_as_success: true }, null, 2), { flag: "wx" }); }
      finally { await context.close(); }
    }
    if (failed) throw new Error(`phase=${phase}; error_enum=catalog_baseline_capture`);
  });
}
