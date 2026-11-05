// Compara una pantalla real con su maqueta, lado a lado, a 1440 y 390 px.
// Uso, desde la raíz y con la app levantada:
//   node scripts/comparar-pantalla.mjs PantallaCatalogo /catalog
//   node scripts/comparar-pantalla.mjs PantallaIngreso /account --sin-sesion
//   node scripts/comparar-pantalla.mjs --todas
// La primera vez crea una cuenta y una PC de prueba en la base de desarrollo.
// Las capturas y la sesión quedan en .local/, que Git ignora.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = await import(pathToFileURL(path.join(root, "frontend/node_modules/@playwright/test/index.mjs")).href);

const base = process.env.UJ_COMPARAR_URL ?? "http://localhost:3000";
const salida = path.join(root, ".local/capturas/comparacion");
const sesion = path.join(root, ".local/comparar-sesion.json");
const anchos = [[1440, 900], [390, 844]];
const pantallas = [
  ["PantallaInicio", "/", true],
  ["PantallaIngreso", "/account", true],
  ["PantallaCuenta", "/account"],
  ["PantallaMiPC", "/pcs"],
  ["PantallaAgregarPC", "/pcs/import"],
  ["PantallaArmar", "/build"],
  ["PantallaCatalogo", "/catalog"],
  ["PantallaMiPlan", "/tower-plans"],
  ["PantallaAsistente", "/chat"],
  ["PantallaAdmin", "/admin"],
];

async function prepararSesion(browser) {
  const marca = Date.now().toString().slice(-8);
  const email = `comparador.${marca}@example.test`;
  const clave = `Comparador-${marca}`;
  const contexto = await browser.newContext({ locale: "es-AR" });
  const page = await contexto.newPage();
  await page.goto(`${base}/account`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Crear cuenta" }).click({ timeout: 30000 });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(clave);
  await page.getByRole("button", { name: "Registrar cuenta" }).click();
  await page.getByText("Cuenta creada", { exact: false }).first().waitFor({ timeout: 25000 });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(clave);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("heading", { name: "Tu cuenta", exact: true }).waitFor({ timeout: 25000 });
  const creada = await page.evaluate(async () => {
    const pieza = async category => (await (await fetch(`/api/catalog/components?page=1&page_size=1&sort=retail_first&category=${category}`, { cache: "no-store" })).json()).items[0].id;
    const { csrf_token } = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
    const categorias = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"];
    const presentes = { cpu: await pieza("cpu"), gpu: await pieza("gpu") };
    const respuesta = await fetch("/api/towers", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf_token, "Content-Type": "application/json" },
      body: JSON.stringify({
        schema_version: 2,
        name: "La de casa",
        category_status: Object.fromEntries(categorias.map(categoria => [categoria, categoria in presentes ? "present" : "unknown"])),
        lines: Object.entries(presentes).map(([category, component_id]) => ({ line_id: null, category, component_id, declared_model: null, quantity: 1 })),
        context: { bios_version: null, notes: null },
      }),
    });
    return respuesta.status;
  });
  if (creada !== 201) throw new Error(`No se pudo crear la PC de prueba: ${creada}`);
  await contexto.storageState({ path: sesion });
  await contexto.close();
  console.log(`Sesión de prueba creada: ${email}`);
}

async function foto(browser, url, ancho, alto, storageState) {
  const contexto = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-AR", storageState });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", error => errores.push(error.message));
  page.on("console", mensaje => { if (mensaje.type() === "error") errores.push(mensaje.text()); });
  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const imagen = await page.screenshot({ fullPage: true });
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await contexto.close();
  return { imagen, desborde, errores };
}

async function unir(browser, nombre, ancho, maqueta, real, ruta) {
  const page = await browser.newPage({ viewport: { width: ancho < 500 ? 900 : 2000, height: 900 } });
  const columna = (titulo, imagen) => `<section><h2>${titulo}</h2><img src="data:image/png;base64,${imagen.toString("base64")}"></section>`;
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#333;font:600 18px system-ui;color:#fff}
    h2{margin:0 0 8px;font-size:18px} img{display:block;width:100%;height:auto;background:#fff}
  </style>${columna("Maqueta", maqueta)}${columna(`Real ${ruta}`, real)}`, { waitUntil: "load" });
  const archivo = path.join(salida, `${nombre}-${ancho}.png`);
  await page.screenshot({ path: archivo, fullPage: true });
  await page.close();
  return archivo;
}

async function comparar(browser, nombre, ruta, sinSesion) {
  const maqueta = path.join(root, "docs/sistema-diseno/componentes", nombre, "preview.html");
  if (!fs.existsSync(maqueta)) throw new Error(`No existe la maqueta ${nombre}`);
  const estado = !sinSesion && fs.existsSync(sesion) ? sesion : undefined;
  for (const [ancho, alto] of anchos) {
    const izquierda = await foto(browser, pathToFileURL(maqueta).href, ancho, alto);
    const derecha = await foto(browser, base + ruta, ancho, alto, estado);
    const archivo = await unir(browser, nombre, ancho, izquierda.imagen, derecha.imagen, ruta);
    const errores = [...new Set(derecha.errores)].slice(0, 3);
    console.log(`${nombre} ${ancho}: ${path.relative(root, archivo)} | desborde ${derecha.desborde}px | errores ${errores.length ? errores.join(" / ").slice(0, 300) : "ninguno"}`);
  }
}

fs.mkdirSync(salida, { recursive: true });
const argumentos = process.argv.slice(2);
const browser = await chromium.launch({ channel: "msedge" });
try {
  if (!fs.existsSync(sesion)) await prepararSesion(browser);
  if (argumentos.includes("--todas")) {
    for (const [nombre, ruta, sinSesion] of pantallas) await comparar(browser, nombre, ruta, sinSesion);
  } else {
    const [nombre, ruta] = argumentos;
    if (!nombre || !ruta) throw new Error("Uso: node scripts/comparar-pantalla.mjs PantallaX /ruta [--sin-sesion] | --todas");
    await comparar(browser, nombre, ruta, argumentos.includes("--sin-sesion"));
  }
} finally {
  await browser.close();
}
