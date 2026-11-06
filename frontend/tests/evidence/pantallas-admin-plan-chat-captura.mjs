// Capturas reales de /admin, del plan compartido y del asistente (/chat y panel flotante)
// junto a sus maquetas, a 1440 y 390. Siempre sin ventana y sin tocar demo-session.mjs.
// Uso (desde frontend/): node tests/evidence/pantallas-admin-plan-chat-captura.mjs
// Requiere la app y la API corriendo. No borra capturas previas ni resetea la base.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lanzar, clienteApi, base, sesionDemo } from "./demo-session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const salida = path.join(root, ".local/capturas/admin-plan-chat");
fs.mkdirSync(salida, { recursive: true });
const maqueta = (nombre) => pathToFileURL(path.join(root, `docs/sistema-diseno/componentes/${nombre}/preview.html`)).href;
const tamanos = [[1440, 900], [390, 844]];
const errores = [];

function leerCredencialesAdmin() {
  for (const db of ["upgradejusto_dev", "upgradejusto_test"]) {
    const archivo = path.join(root, `.local/postgresql/admin-demo-${db}.json`);
    if (fs.existsSync(archivo)) return JSON.parse(fs.readFileSync(archivo, "utf8"));
  }
  return null;
}

async function medir(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
    filas: document.querySelectorAll(".admin-table tbody tr").length,
    conversaciones: document.querySelectorAll(".assistant-conversations li").length,
    etapas: document.querySelectorAll(".share-stage").length,
    avisos: [...document.querySelectorAll(".share-note")].map((item) => item.textContent),
  }));
}

async function capturar(page, archivo) {
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelectorAll("nextjs-portal, [data-nextjs-dev-indicators], [data-next-badge-root]").forEach((el) => el.remove()));
  await page.screenshot({ path: path.join(salida, archivo), fullPage: true });
}

const browser = await lanzar();
try {
  for (const [w, h] of tamanos) {
    for (const nombre of ["PantallaAdmin", "PantallaPlanCompartido", "PantallaAsistente", "AsistenteFlotante"]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: "es-AR" });
      const page = await ctx.newPage();
      await page.goto(maqueta(nombre));
      await page.waitForTimeout(400);
      await capturar(page, `${w}-${nombre}-maqueta.png`);
      await ctx.close();
    }
  }

  // Administración: cuenta de proyecto ya autorizada; las credenciales nunca se imprimen.
  let estadoAdmin = null;
  const credenciales = leerCredencialesAdmin();
  if (!credenciales) {
    console.log("admin | sin credenciales locales: no se capturó /admin");
  } else {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-AR" });
    const api = clienteApi(ctx);
    try {
      await api.enviar("/api/auth/login", credenciales);
      estadoAdmin = await ctx.storageState();
    } catch (error) {
      console.log("admin | login no disponible en esta corrida; se conservan las capturas previas");
      await ctx.close();
      estadoAdmin = null;
    }
    if (estadoAdmin) await ctx.close();
    const estado = estadoAdmin;
    if (!estado) {
      // Sin sesión nueva, no se reintenta /admin: las capturas válidas ya están en disco.
    } else for (const [w, h] of tamanos) {
      const c = await browser.newContext({ viewport: { width: w, height: h }, locale: "es-AR", storageState: estado });
      const page = await c.newPage();
      page.on("pageerror", (e) => errores.push(`admin ${w}: ${e.message}`));
      const resp = await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".admin-stats", { timeout: 20000 }).catch(() => {});
      await capturar(page, `${w}-admin-real.png`);
      console.log("admin", w, resp?.status(), JSON.stringify(await medir(page)));
      if (w === 1440) {
        const completar = page.getByRole("button", { name: "Completar" }).first();
        if (await completar.count()) {
          await completar.click();
          await page.waitForTimeout(600);
          await capturar(page, `${w}-admin-seleccion.png`);
          console.log("admin 1440 seleccion", JSON.stringify(await page.evaluate(() => ({
            seleccionadas: document.querySelectorAll(".admin-table tr.is-selected").length,
            aria: document.querySelector(".admin-table tr[aria-selected='true']")?.textContent?.slice(0, 80) ?? null,
            editor: document.body.textContent.includes("Administrar el catálogo"),
          }))));
        }
        const siguiente = page.getByRole("button", { name: "Siguientes" }).first();
        if (await siguiente.count() && await siguiente.isEnabled()) {
          await siguiente.click();
          await page.waitForTimeout(800);
          await capturar(page, `${w}-admin-pagina-2.png`);
          console.log("admin 1440 pagina 2", JSON.stringify(await medir(page)));
        }
      }
      await c.close();
    }
  }

  // Plan compartido y asistente: una cuenta nueva por corrida, armada por la API pública.
  // Si el registro está limitado, se sigue con la sesión de administración ya abierta.
  async function demoConSesionExistente(estado) {
    const contexto = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-AR", storageState: estado });
    const api = clienteApi(contexto);
    const categorias = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"];
    const paginas = {};
    for (const category of categorias) paginas[category] = await api.obtener(`/api/catalog/components?page=1&page_size=1&sort=retail_first&category=${category}`);
    const pc = await api.enviar("/api/towers", { schema_version: 2, name: "La de casa", category_status: Object.fromEntries(categorias.map(c => [c, paginas[c].items?.[0] ? "present" : "unknown"])), lines: categorias.flatMap(c => paginas[c].items?.[0] ? [{ line_id: null, category: c, component_id: paginas[c].items[0].id, declared_model: null, quantity: 1 }] : []), context: { bios_version: null, notes: null } });
    const gpu = paginas.gpu.items[0];
    const creado = await api.enviar("/api/tower-plans", { kind: "tower_plan", schema_version: 2, client_request_id: crypto.randomUUID(), name: "Plan de mejora de torre", pc_id: pc.id, expected_pc_revision: pc.revision, expected_catalog_version: paginas.gpu.dataset_version, objective: "gaming", workload: null, budget_ars: "500000.00", price_condition: "cash", stages: [{ name: "Primera etapa", budget_ars: "500000.00", materials: [], actions: [{ action: "replace_category", category: "gpu", line_id: null, candidates: [{ component_id: gpu.id, declared_model: null, quantity: 1 }] }] }] });
    return { contexto, api, datos: { planId: creado.id }, page: await contexto.newPage() };
  }
  const estadoPrevio = path.join(root, ".local/capturas/mi-plan/estado.json");
  const estadoBase = estadoAdmin ?? (fs.existsSync(estadoPrevio) ? JSON.parse(fs.readFileSync(estadoPrevio, "utf8")) : null);
  let demo;
  try {
    demo = await sesionDemo(browser, { ancho: 1440, alto: 900, plan: true });
  } catch (error) {
    if (!estadoBase) throw error;
    console.log("plan y chat | registro limitado; se usa una sesión local ya abierta");
    demo = await demoConSesionExistente(estadoBase);
  }
  const plan = await demo.api.obtener(`/api/tower-plans/${demo.datos.planId}`);
  const share = await demo.api.enviar(`/api/tower-plans/${demo.datos.planId}/shares`, {
    expected_plan_revision: plan.revision,
    title: "Plan de mejora de torre",
    public_projection_confirmed: true,
  });
  await demo.api.enviar("/api/conversations", { title: "¿Procesador o placa de video?" });
  await demo.api.enviar("/api/conversations", { title: "Cuánta memoria necesito para editar" });
  const estado = await demo.contexto.storageState();
  await demo.page.close();
  await demo.contexto.close();

  for (const [w, h] of tamanos) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, locale: "es-AR", storageState: estado });
    const page = await c.newPage();
    page.on("pageerror", (e) => errores.push(`compartido ${w}: ${e.message}`));
    const resp = await page.goto(`${base}/shared-tower-plans/${share.token}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".share-stage", { timeout: 20000 }).catch(() => {});
    await capturar(page, `${w}-plan-compartido-real.png`);
    console.log("compartido", w, resp?.status(), JSON.stringify(await medir(page)));

    await page.goto(`${base}/chat`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".assistant-thread", { timeout: 20000 }).catch(() => {});
    const primeraCharla = page.locator(".assistant-conversations li button").first();
    if (await primeraCharla.count()) {
      await primeraCharla.click();
      await page.waitForTimeout(700);
    }
    await capturar(page, `${w}-chat-real.png`);
    console.log("chat", w, JSON.stringify(await medir(page)));

    await page.goto(`${base}/pcs`, { waitUntil: "domcontentloaded" });
    const disparador = page.getByRole("button", { name: "¿Dudas?" }).first();
    await disparador.waitFor({ timeout: 20000 }).catch(() => {});
    if (await disparador.count()) {
      await disparador.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => {});
      await capturar(page, `${w}-asistente-flotante-real.png`);
      console.log("panel", w, JSON.stringify(await page.evaluate(() => ({
        abierto: Boolean(document.querySelector('[role="dialog"]')),
        anchoPanel: document.querySelector(".assistant-panel")?.getBoundingClientRect().width ?? null,
        desborde: document.documentElement.scrollWidth > window.innerWidth + 1,
      }))));
    }
    await c.close();
  }
} finally {
  await browser.close();
}
if (errores.length) console.log("errores de página:", [...new Set(errores)].slice(0, 8));
