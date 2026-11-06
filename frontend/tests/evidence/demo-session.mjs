// Sesión de demostración para capturar pantallas reales, siempre sin ventana (headless).
// Crea una cuenta nueva por la misma API que usa la interfaz, una PC «La de casa» con la primera pieza real
// de cada categoría del catálogo y, si se pide, un plan. No imprime correos, contraseñas ni enlaces.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(pathToFileURL(path.resolve(aqui, "../../node_modules/@playwright/test/index.mjs")).href);

export const base = process.env.UJ_URL ?? "http://localhost:3000";
export const lanzar = () => chromium.launch({ channel: "msedge" });

/** Cliente de la API con las cookies del contexto: lo que se crea acá lo ve la página después. */
export function clienteApi(contexto) {
  const http = contexto.request;
  const leer = async (r, url) => { if (!r.ok()) throw new Error(`${url} devolvió ${r.status()}`); return r.status() === 204 ? null : r.json(); };
  const obtener = async url => leer(await http.get(base + url), url);
  const enviar = async (url, cuerpo, metodo = "POST") => {
    const { csrf_token } = await obtener("/api/auth/csrf");
    return leer(await http.fetch(base + url, { method: metodo, headers: { "X-CSRF-Token": csrf_token, "Content-Type": "application/json", Origin: base }, data: JSON.stringify(cuerpo) }), url);
  };
  return { obtener, enviar };
}

export async function sesionDemo(browser, { ancho = 1440, alto = 900, plan = false } = {}) {
  const marca = `${Date.now()}`.slice(-9);
  const correo = `demo.${marca}@example.test`, clave = `Demo-clave-${marca}`;
  const contexto = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-AR" });
  const api = clienteApi(contexto);
  await api.enviar("/api/auth/register", { email: correo, password: clave });
  await api.enviar("/api/auth/login", { email: correo, password: clave });
  const categorias = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"];
  const presentes = {}, paginas = {};
  for (const category of categorias) {
    paginas[category] = await api.obtener(`/api/catalog/components?page=1&page_size=1&sort=retail_first&category=${category}`);
    const item = paginas[category].items?.[0]; if (item) presentes[category] = item.id;
  }
  const pc = await api.enviar("/api/towers", { schema_version: 2, name: "La de casa", category_status: Object.fromEntries(categorias.map(c => [c, c in presentes ? "present" : "unknown"])), lines: Object.entries(presentes).map(([category, component_id]) => ({ line_id: null, category, component_id, declared_model: null, quantity: 1 })), context: { bios_version: null, notes: null } });
  let planId = null;
  if (plan) {
    const gpu = paginas.gpu.items[0];
    const creado = await api.enviar("/api/tower-plans", { kind: "tower_plan", schema_version: 2, client_request_id: crypto.randomUUID(), name: "Plan de mejora de la de casa", pc_id: pc.id, expected_pc_revision: pc.revision, expected_catalog_version: paginas.gpu.dataset_version, objective: "gaming", workload: null, budget_ars: "500000.00", price_condition: "cash", stages: [{ name: "Primera etapa", budget_ars: "500000.00", materials: [], actions: [{ action: "replace_category", category: "gpu", line_id: null, candidates: [{ component_id: gpu.id, declared_model: null, quantity: 1 }] }] }] });
    planId = creado.id;
  }
  const page = await contexto.newPage();
  return { contexto, page, api, datos: { pcId: pc.id, pcRevision: pc.revision, planId } };
}
