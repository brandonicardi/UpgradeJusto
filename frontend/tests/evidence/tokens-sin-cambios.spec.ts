import { test } from "@playwright/test";
import path from "node:path";

// Cambiar la carpeta de salida permite repetir la captura como "despues" (tarea 4.4).
const outDir = path.resolve(process.cwd(), process.env.TOKENS_EVIDENCE_DIR ?? "tests/evidence/tokens-antes");

const pantallas = [
  { ruta: "/", archivo: "inicio.png" },
  { ruta: "/catalog", archivo: "catalogo.png" },
  { ruta: "/pcs", archivo: "pcs.png" },
];

for (const { ruta, archivo } of pantallas) {
  test(`captura ${ruta}`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: "load" });
    await page.locator("main, h1").first().waitFor({ state: "visible" });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.screenshot({
      path: path.join(outDir, archivo),
      fullPage: true,
      animations: "disabled",
    });
  });
}
