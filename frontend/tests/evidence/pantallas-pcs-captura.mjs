// Captura Mi PC (/pcs), Agregar PC (/pcs/import) y Armar (/build) a 1440x900 y 390x844,
// junto con su maqueta, siempre sin ventana. Uso (desde frontend/):
//   node tests/evidence/pantallas-pcs-captura.mjs
// Crea una cuenta nueva por corrida y no toca cuentas ni datos existentes.
// Si el registro está limitado por IP, UJ_STORAGE=ruta/estado.json reutiliza una sesión de prueba guardada.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lanzar, clienteApi, base } from "./demo-session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
// Cada corrida va a su propia carpeta: no se pisan las capturas anteriores.
const corrida = new Date().toISOString().replace(/[:.]/g, "-");
const salida = path.join(root, ".local/capturas/pantallas-pcs", `corrida-${corrida}`);
fs.mkdirSync(salida, { recursive: true });
const maquetas = {
  "mi-pc": pathToFileURL(path.join(root, "docs/sistema-diseno/componentes/PantallaMiPC/preview.html")).href,
  "agregar-pc": pathToFileURL(path.join(root, "docs/sistema-diseno/componentes/PantallaAgregarPC/preview.html")).href,
  armar: pathToFileURL(path.join(root, "docs/sistema-diseno/componentes/PantallaArmar/preview.html")).href,
};

const browser = await lanzar();
// Si el registro está limitado por IP, se puede reutilizar una sesión de prueba guardada con UJ_STORAGE.
const ctx0 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-AR", storageState: process.env.UJ_STORAGE });
const api = clienteApi(ctx0);
if (!process.env.UJ_STORAGE) {
  const marca = `${Date.now()}`.slice(-9), correo = `pantallas.${marca}@example.test`, clave = `Pantallas-clave-${marca}`;
  await api.enviar("/api/auth/register", { email: correo, password: clave });
  await api.enviar("/api/auth/login", { email: correo, password: clave });
}

const categorias = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"];
// La PC diagnosticada en el servidor. Todas existen en catálogo, pero el catálogo no publica sus datos técnicos.
const piezas = { cpu: "cg-12369", motherboard: "cg-10422", ram: "cg-13664", gpu: "cg-11871", psu: "cg-11736", case: null, storage: "cg-13867", cooler: "cg-16487", fan: null };
const lineas = Object.entries(piezas).filter(([, id]) => id).map(([category, component_id]) => ({ line_id: null, category, component_id, declared_model: null, quantity: category === "ram" ? 2 : 1 }));
const estado = Object.fromEntries(categorias.map(category => [category, piezas[category] ? "present" : "unknown"]));
const cuerpo = { schema_version: 2, name: "Mi primer pc gamer", category_status: estado, lines: lineas, context: { bios_version: null, notes: null, assembly_state: null } };
// Reutiliza la PC si ya existe en la sesión guardada; así no se acumulan duplicados.
const existentes = process.env.UJ_STORAGE ? await api.obtener("/api/towers?page=1&page_size=50") : null;
if (!existentes?.items?.some(pc => pc.name === cuerpo.name)) {
  // El estado de armado se elige y guarda después desde la interfaz, para probar el PUT real.
  await api.enviar("/api/towers", cuerpo);
}
const sesion = await ctx0.storageState();
await ctx0.close();

const rutas = [
  { clave: "mi-pc", url: "/pcs", listo: "article.pcs-part, section[aria-label]", carpeta: "mi-pc" },
  { clave: "agregar-pc", url: "/pcs/import", listo: ".imp-screen", carpeta: "agregar-pc" },
  { clave: "armar", url: "/build", listo: ".purchase-workbench, .build-screen", carpeta: "armar" },
];

for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const ruta of rutas) {
    const carpeta = path.join(salida, ruta.carpeta);
    fs.mkdirSync(carpeta, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "es-AR", storageState: sesion });
    const maqueta = await ctx.newPage();
    await maqueta.goto(maquetas[ruta.clave]); await maqueta.waitForTimeout(500);
    await maqueta.screenshot({ path: path.join(carpeta, `${w}-maqueta.png`), fullPage: true });
    await maqueta.close();

    const errores = [], p = await ctx.newPage();
    p.on("pageerror", e => errores.push(e.message));
    p.on("console", msg => { if (msg.type() === "error") errores.push(msg.text()); });
    await p.goto(`${base}${ruta.url}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await p.waitForSelector(ruta.listo, { timeout: 120000 }).catch(() => {});
    await p.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
    if (ruta.clave === "mi-pc") {
      await p.getByRole("button", { name: "Mi primer pc gamer" }).last().click().catch(() => {});
      await p.waitForTimeout(800);
      // Elige «Sí, ya funciona» desde la interfaz y guarda con el botón real.
      const selector = p.getByLabel("¿Esta PC ya está armada y funcionando?");
      await selector.selectOption("assembled").catch(() => {});
      const guardar = p.getByRole("button", { name: "Guardar estado" });
      if (await guardar.isEnabled().catch(() => false)) await guardar.click();
      await p.waitForTimeout(1200);
      const leido = await (await ctx.request.get(`${base}/api/towers?page=1&page_size=50`)).json();
      const pcLeida = leido.items.find(pc => pc.name === cuerpo.name);
      console.log("assembly GET", w, pcLeida?.context?.assembly_state, "selector", await selector.inputValue().catch(() => null));
      await p.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
      await p.getByRole("button", { name: "Mi primer pc gamer" }).last().click().catch(() => {});
      await p.waitForTimeout(900);
      const leidoOtraVez = await (await ctx.request.get(`${base}/api/towers?page=1&page_size=50`)).json();
      const pcOtraVez = leidoOtraVez.items.find(pc => pc.name === cuerpo.name);
      console.log("assembly tras recargar", w, pcOtraVez?.context?.assembly_state, "selector", await p.getByLabel("¿Esta PC ya está armada y funcionando?").inputValue().catch(() => null));
    }
    await p.waitForTimeout(1200);
    await p.screenshot({ path: path.join(carpeta, `${w}-real.png`), fullPage: true });
    if (ruta.clave === "mi-pc") {
      await p.getByRole("button", { name: /Ver por qué placa madre|Completar placa madre/ }).click().catch(() => {});
      await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(carpeta, `${w}-editor.png`), fullPage: true });
    }
    const medidas = await p.evaluate(() => ({
      ancho: document.documentElement.scrollWidth, vista: window.innerWidth,
      biosVisible: /\bBIOS\b/i.test(document.body.innerText),
      esenciales: /de 7 piezas esenciales/.test(document.body.innerText),
      t11: document.body.innerText.includes("Identificación y presencia"),
      sinDatos: document.body.innerText.includes("El catálogo todavía no tiene los datos técnicos de esta pieza"),
    }));
    console.log(ruta.clave, w, JSON.stringify(medidas), "errores:", errores.slice(0, 4));
    await p.close(); await ctx.close();
  }
}
// Comprobación real del ancla: desde el inicio, el camino «No sé qué tengo» tiene que abrir la ayuda.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-AR", storageState: sesion });
  const p = await ctx.newPage();
  await p.goto(`${base}/`, { waitUntil: "networkidle" });
  await p.getByRole("link", { name: "No sé qué tengo" }).click();
  await p.waitForURL(/\/pcs\/import#ayuda$/, { timeout: 15000 });
  await p.waitForTimeout(800);
  const ancla = await p.evaluate(() => {
    const details = document.querySelector("details#ayuda");
    const caja = details?.getBoundingClientRect();
    return { url: location.hash, abierta: details instanceof HTMLDetailsElement && details.open, visible: !!caja && caja.top < innerHeight && caja.bottom > 0, scrollY: Math.round(scrollY) };
  });
  console.log("ancla /pcs/import#ayuda", JSON.stringify(ancla));
  await p.screenshot({ path: path.join(salida, "agregar-pc", "1440-ayuda.png"), fullPage: true });
  await p.close(); await ctx.close();
}
await browser.close();
console.log(`capturas: ${path.relative(root, salida)}`);
