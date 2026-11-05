// Capturas de evidencia visual de la pantalla de inicio y de /build.
// Uso (desde frontend/): node tests/evidence/pantallas-inicio-y-armar/capturas.mjs
// Requiere la app y la API corriendo. BASE_URL debe ser localhost (el backend valida el Origin).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ANCHOS = [
  { ancho: 1440, alto: 900 },
  { ancho: 390, alto: 844 },
];
const VISTAS = [
  { vista: "inicio", ruta: "/", espera: (page) => page.getByRole("heading", { name: "Explorá una pieza real" }) },
  { vista: "build", ruta: "/build", espera: (page) => page.getByRole("heading", { name: "Armá tu PC pieza por pieza" }) },
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

mkdirSync(SALIDA, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const filas = [];
const vacia = { scrollHorizontal: null, oscuras: [], contraste: [], recortes: [] };

for (const { ancho, alto } of ANCHOS) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: alto } });
  for (const { vista, ruta, espera } of VISTAS) {
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(BASE_URL + ruta, { waitUntil: "domcontentloaded" });
      await espera(page).waitFor({ state: "visible", timeout: TIMEOUT });
      // Recorre la página para que carguen las fotos diferidas y espera a que terminen.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      // Solo cuentan las fotos visibles (las de selectores plegados no se piden). Si alguna no termina, se avisa.
      const visibles = () => [...document.images].filter((i) => i.getBoundingClientRect().width > 0);
      await page
        .waitForFunction((f) => eval(`(${f})`)().every((i) => i.complete), visibles.toString(), { timeout: 6000 })
        .catch(async () => {
          const pend = await page.evaluate((f) => eval(`(${f})`)().filter((i) => !i.complete).map((i) => i.currentSrc || i.src), visibles.toString());
          console.warn(`AVISO [${vista} ${ancho}] fotos sin terminar de cargar: ${pend.join(", ")}`);
        });
      await page.waitForTimeout(500);
      await limpiarIndicadores(page);
      await page.screenshot({ path: join(SALIDA, `${vista}-${ancho}.png`), fullPage: true });
      const m = await page.evaluate(medir);
      filas.push({ vista, ancho, http: String(resp?.status() ?? ""), ...m });
    } catch (e) {
      filas.push({ vista, ancho, http: "ERROR " + String(e.message).split("\n")[0], ...vacia });
    }
    await page.close();
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
