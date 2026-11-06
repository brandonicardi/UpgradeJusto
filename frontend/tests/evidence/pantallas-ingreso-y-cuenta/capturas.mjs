// Capturas de evidencia visual de ingreso, registro y cuenta.
// Uso (desde frontend/): node tests/evidence/pantallas-ingreso-y-cuenta/capturas.mjs
// Requiere la app y la API corriendo. BASE_URL debe ser localhost (el backend valida el Origin).
// Las credenciales de la cuenta de prueba se generan en memoria y nunca se guardan ni se imprimen.
import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ANCHOS = [
  { ancho: 1440, alto: 900 },
  { ancho: 390, alto: 844 },
];
const SALIDA = dirname(fileURLToPath(import.meta.url));
const TIMEOUT = 15000;

// Se ejecuta dentro de la página.
function medir() {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const luma255 = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const fondoEfectivo = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a >= 0.99) return { c, el: n };
    }
    return { c: { r: 255, g: 255, b: 255, a: 1 }, el: null };
  };
  const desc = (el) =>
    el.tagName.toLowerCase() +
    (el.id ? "#" + el.id : "") +
    (typeof el.className === "string" && el.className
      ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
      : "");
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const oscuras = [];
  const contraste = [];
  const recortes = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH"].includes(el.tagName.toUpperCase())) continue;
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);

    if (r.width >= 40 && r.height >= 20) {
      const { c } = fondoEfectivo(el);
      if (luma255(c) < 140) oscuras.push(`${desc(el)} bg=rgb(${c.r},${c.g},${c.b})`);
    }

    const tieneTexto = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
    );
    if (tieneTexto) {
      const fg = parse(s.color);
      const { c: bg } = fondoEfectivo(el);
      if (fg) {
        const mezcla =
          fg.a < 1
            ? {
                r: fg.r * fg.a + bg.r * (1 - fg.a),
                g: fg.g * fg.a + bg.g * (1 - fg.a),
                b: fg.b * fg.a + bg.b * (1 - fg.a),
              }
            : fg;
        const px = parseFloat(s.fontSize);
        const peso = Number(s.fontWeight) || 400;
        const grande = px >= 24 || (px >= 18.66 && peso >= 700);
        const minimo = grande ? 3 : 4.5;
        const cr = ratio(mezcla, bg);
        if (cr < minimo)
          contraste.push(
            `${desc(el)} "${el.textContent.trim().slice(0, 30)}" ratio=${cr.toFixed(2)} min=${minimo}`,
          );
      }
    }

    if (
      el.scrollWidth > el.clientWidth + 2 &&
      (s.overflowX !== "visible" || s.overflow !== "visible") &&
      el.textContent.trim().length > 0
    )
      recortes.push(`${desc(el)} sw=${el.scrollWidth} cw=${el.clientWidth}`);
  }

  return {
    scrollHorizontal: document.documentElement.scrollWidth > window.innerWidth,
    oscuras,
    contraste,
    recortes,
  };
}

async function limpiarIndicadores(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll("nextjs-portal, [data-nextjs-dev-indicators], [data-next-badge-root]")
      .forEach((el) => el.remove());
  });
}

// La pestaña de acceso habilitada indica que terminó la consulta de sesión.
async function esperarAcceso(page) {
  await page.getByRole("tab", { name: "Entrar" }).waitFor({ state: "visible", timeout: TIMEOUT });
  await page.waitForFunction(
    () => {
      const t = [...document.querySelectorAll('[role="tab"]')];
      return t.length === 2 && t.every((b) => !b.disabled);
    },
    null,
    { timeout: TIMEOUT },
  );
}

async function esperarCuenta(page) {
  await page.getByRole("heading", { name: "Tus datos" }).waitFor({ state: "visible", timeout: TIMEOUT });
  await page.waitForFunction(() => document.querySelector("section[aria-busy]")?.getAttribute("aria-busy") === "false", null, {
    timeout: TIMEOUT,
  });
}

mkdirSync(SALIDA, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const filas = [];

async function capturar(page, vista, ancho, archivo, resp) {
  try {
    await page.waitForTimeout(500);
    await limpiarIndicadores(page);
    await page.screenshot({ path: join(SALIDA, archivo), fullPage: true });
    const m = await page.evaluate(medir);
    filas.push({ vista, ancho, http: String(resp?.status() ?? ""), ...m });
  } catch (e) {
    filas.push({ vista, ancho, http: "ERROR " + e.message, scrollHorizontal: null, oscuras: [], contraste: [], recortes: [] });
  }
}

for (const { ancho, alto } of ANCHOS) {
  // Vistas sin sesión.
  const anon = await browser.newContext({ viewport: { width: ancho, height: alto } });
  for (const [vista, nombre] of [
    ["ingreso", "Entrar"],
    ["registro", "Crear cuenta"],
  ]) {
    const page = await anon.newPage();
    try {
      const resp = await page.goto(BASE_URL + "/account", { waitUntil: "domcontentloaded" });
      await esperarAcceso(page);
      if (vista === "registro") {
        await page.getByRole("tab", { name: nombre }).click();
        await page.getByText("12 caracteres o más", { exact: false }).first().waitFor({ state: "visible", timeout: TIMEOUT });
      }
      await capturar(page, vista, ancho, `${vista}-${ancho}.png`, resp);
    } catch (e) {
      filas.push({ vista, ancho, http: "ERROR " + e.message, scrollHorizontal: null, oscuras: [], contraste: [], recortes: [] });
    }
    await page.close();
  }
  await anon.close();

  // Vista con sesión: cuenta nueva con credenciales aleatorias solo en memoria.
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto } });
  const page = await ctx.newPage();
  try {
    const email = `evidencia-${randomUUID()}@example.test`;
    const clave = randomUUID();
    await page.goto(BASE_URL + "/account", { waitUntil: "domcontentloaded" });
    await esperarAcceso(page);
    await page.getByRole("tab", { name: "Crear cuenta" }).click();
    await page.getByLabel("Tu correo", { exact: true }).fill(email);
    await page.getByLabel("Elegí una contraseña", { exact: true }).fill(clave);
    await page.getByRole("button", { name: "Crear mi cuenta" }).click();
    // Tras registrar vuelve a la pestaña Entrar con aviso.
    await page.getByRole("tab", { name: "Entrar", selected: true }).waitFor({ timeout: TIMEOUT });
    await esperarAcceso(page);
    await page.getByLabel("Tu correo", { exact: true }).fill(email);
    await page.getByLabel("Tu contraseña", { exact: true }).fill(clave);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await esperarCuenta(page);
    const resp = await page.goto(BASE_URL + "/account", { waitUntil: "domcontentloaded" });
    await esperarCuenta(page);
    await capturar(page, "cuenta", ancho, `cuenta-${ancho}.png`, resp);
  } catch (e) {
    filas.push({ vista: "cuenta", ancho, http: "ERROR " + String(e.message).split("\n")[0], scrollHorizontal: null, oscuras: [], contraste: [], recortes: [] });
  }
  await ctx.close();
}
await browser.close();

console.log("vista | ancho | http | scrollHorizontal | oscuras | contraste | recortes");
for (const f of filas) {
  console.log(
    `${f.vista} | ${f.ancho} | ${f.http} | ${f.scrollHorizontal} | ${f.oscuras.length} | ${f.contraste.length} | ${f.recortes.length}`,
  );
}
console.log("\n--- Detalle ---");
for (const f of filas) {
  for (const [k, v] of [["oscuras", f.oscuras], ["contraste", f.contraste], ["recortes", f.recortes]]) {
    if (v.length) console.log(`[${f.vista} ${f.ancho}] ${k}:\n  ` + [...new Set(v)].slice(0, 12).join("\n  "));
  }
}
