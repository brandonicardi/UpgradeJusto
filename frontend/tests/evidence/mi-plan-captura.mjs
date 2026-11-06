// Captura de /tower-plans/{id} (Mi plan) con un plan real de tres etapas y su maqueta, a 1440 y 390. Siempre sin ventana.
// Uso (desde frontend/): node tests/evidence/mi-plan-captura.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lanzar, clienteApi, base } from "./demo-session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const salida = path.join(root, ".local/capturas/mi-plan");
fs.mkdirSync(salida, { recursive: true });
// Cada corrida deja sus propios archivos: nunca se pisan capturas anteriores.
const corrida = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const piezas = ["cg-13355", "cg-10468", "cg-21696", "P06", "cg-21572", "cg-16949", "cg-16872"];
const categorias = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"];
const maqueta = pathToFileURL(path.join(root, "docs/sistema-diseno/componentes/PantallaMiPlan/preview.html")).href;

const browser = await lanzar();
const marca = `${Date.now()}`.slice(-9), correo = `miplan.${marca}@example.test`, clave = `MiPlan-clave-${marca}`;
// La cuenta se guarda en .local/ para no registrar una nueva en cada corrida (el registro tiene límite de intentos).
const archivoEstado = path.join(salida, "estado.json");
const guardado = fs.existsSync(archivoEstado) ? JSON.parse(fs.readFileSync(archivoEstado, "utf8")) : null;
const ctx0 = await browser.newContext({ locale: "es-AR", storageState: guardado ?? undefined });
const api = clienteApi(ctx0);
if (!guardado) {
  await api.enviar("/api/auth/register", { email: correo, password: clave });
  await api.enviar("/api/auth/login", { email: correo, password: clave });
  fs.writeFileSync(archivoEstado, JSON.stringify(await ctx0.storageState()));
}
const lineas = [];
for (const id of piezas) { const c = await api.obtener(`/api/catalog/components/${encodeURIComponent(id)}`); lineas.push({ line_id: null, category: c.category, component_id: c.id, declared_model: null, quantity: 1 }); }
const pc = await api.enviar("/api/towers", { schema_version: 2, name: "La de casa", category_status: Object.fromEntries(categorias.map(c => [c, lineas.some(l => l.category === c) ? "present" : "unknown"])), lines: lineas, context: { bios_version: "P2.30", notes: null } });
const version = (await api.obtener("/api/catalog/components?page=1&page_size=1")).dataset_version;
const disco = (await api.obtener("/api/catalog/components?page=1&page_size=1&sort=retail_first&category=storage")).items[0];
const etapa = (name, category, action, component_id, quantity = 1) => ({ name, budget_ars: "2000000.00", materials: [], actions: [{ action, category, line_id: null, candidates: [{ component_id, declared_model: null, quantity }] }] });
const plan = await api.enviar("/api/tower-plans", { kind: "tower_plan", schema_version: 2, client_request_id: crypto.randomUUID(), name: "Plan de mejora de la de casa", pc_id: pc.id, expected_pc_revision: pc.revision, expected_catalog_version: version, objective: "gaming", workload: null, budget_ars: "2000000.00", price_condition: "cash",
  stages: [etapa("Más memoria", "ram", "replace_category", "cg-21696", 2), etapa("Placa de video nueva", "gpu", "replace_category", "cg-17116"), etapa("Disco más grande", "storage", "add_line", disco.id)] });
await api.enviar(`/api/tower-plans/${plan.id}/stages/${plan.stage_keys[0]}/progress`, undefined, "PUT");
const estado = await ctx0.storageState();
await ctx0.close();

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "es-AR", storageState: estado });
  const m = await ctx.newPage();
  await m.goto(maqueta); await m.waitForTimeout(500);
  await m.screenshot({ path: path.join(salida, `${corrida}-${w}-maqueta.png`), fullPage: true });
  await m.close();
  const errores = [], p = await ctx.newPage();
  p.on("pageerror", e => errores.push(e.message));
  p.on("console", msg => { if (msg.type() === "error") errores.push(msg.text()); });
  await p.goto(`${base}/tower-plans/${plan.id}`);
  await p.waitForSelector(".mp-stage", { timeout: 30000 }).catch(async () => { await p.screenshot({ path: path.join(salida, `${corrida}-${w}-error.png`), fullPage: true }); console.log("sin etapas; errores:", errores.slice(0, 4)); });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: path.join(salida, `${corrida}-${w}-real.png`), fullPage: true });
  const resumen = await p.evaluate(() => ({ etapas: document.querySelectorAll(".mp-stage").length, hechas: document.querySelectorAll(".mp-stage.is-done").length, ancho: document.documentElement.scrollWidth, vista: window.innerWidth, nav: [...document.querySelectorAll("nav#principal a")].map(a => [a.textContent, a.getAttribute("href"), a.getAttribute("aria-current")]) }));
  if (resumen.ancho > resumen.vista) errores.push(`desborde horizontal: ${resumen.ancho} > ${resumen.vista}`);
  console.log(w, JSON.stringify(resumen), "errores:", errores.slice(0, 4));
  if (w === 1440) {
    await p.getByRole("button", { name: /^Ya la compré: Placa de video nueva/ }).click();
    await p.waitForTimeout(1500);
    console.log("tras comprar:", await p.locator(".mp-stage.is-done").count(), "hechas;", await p.locator(".mp-stage.is-now .mp-sc-kicker").textContent());
  }
  await p.close(); await ctx.close();
}
await browser.close();
