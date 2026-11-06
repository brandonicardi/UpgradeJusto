// Captura de /conviene (datos reales del servidor) y de su maqueta, a 1440 y 390. Siempre sin ventana.
// Uso (desde frontend/): node tests/evidence/conviene-captura.mjs [gaming] [general] [productividad]
// Arma una PC con piezas reales del catálogo (la lista de abajo) y deja las capturas en .local/capturas/conviene/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lanzar, clienteApi, base } from "./demo-session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const salida = path.join(root, ".local/capturas/conviene");
fs.mkdirSync(salida, { recursive: true });
// Cada corrida deja sus propios archivos: nunca se pisan capturas anteriores.
const corrida = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const escenarios = { gaming: ["gaming", "1500000"], general: ["everyday", "500000"], productividad: ["work", "500000"] };
const pedidos = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(escenarios);
const piezas = ["cg-13355", "cg-10468", "cg-21696", "P06", "cg-21572", "cg-16949", "cg-16872"];
const categorias = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"];
const maqueta = pathToFileURL(path.join(root, "docs/sistema-diseno/componentes/PantallaConviene/preview.html")).href;

const browser = await lanzar();
const marca = `${Date.now()}`.slice(-9), correo = `conviene.${marca}@example.test`, clave = `Conviene-clave-${marca}`;
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
const estado = await ctx0.storageState();
await ctx0.close();

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "es-AR", storageState: estado });
  const m = await ctx.newPage();
  await m.goto(maqueta); await m.waitForTimeout(500);
  await m.screenshot({ path: path.join(salida, `${corrida}-${w}-maqueta.png`), fullPage: true });
  await m.close();
  for (const nombre of pedidos) {
    const [objetivo, presupuesto] = escenarios[nombre];
    const errores = [];
    const p = await ctx.newPage();
    p.on("pageerror", e => errores.push(e.message));
    p.on("console", msg => { if (msg.type() === "error") errores.push(msg.text()); });
    if (process.env.UJ_VOLCAR) p.on("response", async r => { if (r.url().includes("/recommendations/preview")) { const j = await r.json().catch(() => null); console.log("PROPUESTAS", JSON.stringify(j?.items?.slice(0, 2).map(i => ({ benefit: i.benefit, cost: { ...i.cost, lines: undefined }, actions: i.actions, status: i.status, verdict: i.evaluation.verdict }))), JSON.stringify(j?.missing_fields), JSON.stringify(j?.limitations)); } });
    await p.goto(`${base}/conviene?objetivo=${objetivo}&presupuesto=${presupuesto}&pc=${pc.id}`);
    await p.waitForSelector(".cv", { timeout: 30000 });
    await p.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.screenshot({ path: path.join(salida, `${corrida}-${w}-${nombre}.png`), fullPage: true });
    const resumen = await p.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, ancho: document.documentElement.scrollWidth, vista: window.innerWidth, alts: document.querySelectorAll(".cv-alt").length, descartadas: document.querySelectorAll(".cv-ruled li").length, nav: [...document.querySelectorAll("nav#principal a")].map(a => [a.textContent, a.getAttribute("href"), a.getAttribute("aria-current")]) }));
    console.log(w, nombre, JSON.stringify(resumen), "errores:", errores.slice(0, 4));
    if (resumen.ancho > resumen.vista) errores.push(`desborde horizontal: ${resumen.ancho} > ${resumen.vista}`);
    const enlaceConviene = resumen.nav.find(([texto]) => texto === "Lo que te conviene");
    if (!enlaceConviene) errores.push("falta el enlace «Lo que te conviene» en la navegación");
    else if (enlaceConviene[1] !== "/conviene") console.log("AVISO: «Lo que te conviene» enlaza a", enlaceConviene[1], "y no a /conviene; lo decide la navegación compartida.");
    if (w === 1440 && nombre === "general") {
      // «Elegir esta» sube la alternativa; «Sumar a mi plan» abre un borrador sin guardar nada.
      const antes = await p.locator(".cv-upgrade-title").textContent(), swapAntes = await p.locator(".cv-swap-side.is-new .cv-part-name").textContent();
      await p.locator(".cv-alt").nth(1).getByRole("button", { name: "Elegir esta" }).click();
      await p.waitForTimeout(500);
      console.log("elegir:", antes, "→", await p.locator(".cv-kind").textContent(), "|", swapAntes, "→", await p.locator(".cv-swap-side.is-new .cv-part-name").textContent());
      await p.getByRole("button", { name: "Sumar a mi plan" }).first().click();
      await p.waitForSelector("#borrador form", { timeout: 10000 });
      await p.waitForTimeout(500);
      console.log("borrador:", await p.locator("#borrador h2").textContent(), "| nombre:", await p.locator("#borrador input").first().inputValue());
      await p.screenshot({ path: path.join(salida, `${corrida}-${w}-general-borrador.png`) });
      // Autocompletado de modelo propio: se escribe, se espera la búsqueda y se captura la lista.
      const modelo = p.getByLabel("Modelo de la pieza");
      if (await modelo.count()) {
        await modelo.fill("RTX");
        await p.waitForTimeout(1400);
        await p.screenshot({ path: path.join(salida, `${corrida}-${w}-general-autocompletado.png`), fullPage: false });
        console.log("autocompletado:", await p.locator('[role="option"]').count(), "opciones;", await p.locator('[role="status"]').last().textContent().catch(() => ""));
      }
    }
    await p.close();
  }
  await ctx.close();
}
await browser.close();
