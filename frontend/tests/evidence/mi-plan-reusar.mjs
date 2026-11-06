// Captura de Mi plan con la sesión y el plan que ya dejó scripts/comparar-pantalla.mjs en .local/ (no registra cuentas nuevas).
// Uso (desde frontend/): node tests/evidence/mi-plan-reusar.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lanzar, base } from "./demo-session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const salida = path.join(root, ".local/capturas/mi-plan");
fs.mkdirSync(salida, { recursive: true });
const datos = JSON.parse(fs.readFileSync(path.join(root, ".local/comparar-sesion.datos.json"), "utf8"));
const estado = JSON.parse(fs.readFileSync(path.join(root, ".local/comparar-sesion.json"), "utf8"));
const maqueta = pathToFileURL(path.join(root, "docs/sistema-diseno/componentes/PantallaMiPlan/preview.html")).href;
const browser = await lanzar();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "es-AR", storageState: estado });
  const m = await ctx.newPage();
  await m.goto(maqueta); await m.waitForTimeout(500);
  await m.screenshot({ path: path.join(salida, `${w}-maqueta.png`), fullPage: true });
  await m.close();
  const errores = [], p = await ctx.newPage();
  p.on("pageerror", e => errores.push(e.message));
  p.on("console", msg => { if (msg.type() === "error") errores.push(msg.text()); });
  await p.goto(`${base}/tower-plans/${datos.planId}`);
  await p.waitForSelector(".mp-stage", { timeout: 20000 }).catch(() => console.log("sin etapas; errores:", errores.slice(0, 3)));
  await p.waitForTimeout(3500);
  await p.screenshot({ path: path.join(salida, `${w}-real.png`), fullPage: true });
  console.log(w, JSON.stringify(await p.evaluate(() => ({ etapas: document.querySelectorAll(".mp-stage").length, ancho: document.documentElement.scrollWidth, vista: window.innerWidth }))), "errores:", errores.slice(0, 3));
  await p.close(); await ctx.close();
}
await browser.close();
