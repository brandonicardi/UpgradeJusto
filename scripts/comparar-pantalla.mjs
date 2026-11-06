// Compara una pantalla real con su maqueta, lado a lado, a 1440 y 390 px.
// Uso, desde la raíz y con la app levantada:
//   node scripts/comparar-pantalla.mjs PantallaCatalogo /catalog
//   node scripts/comparar-pantalla.mjs PantallaIngreso /account --sin-sesion
//   node scripts/comparar-pantalla.mjs --todas [--reusar-sesion]
// --todas prepara una sesión fresca: cuenta nueva, PC "La de casa" (el primer
// componente real de cada categoría disponible en el catálogo), un plan real con
// una acción y dos conversaciones de chat; luego compara las 14 pantallas:
// Inicio, Ingreso (sin sesión), Cuenta, MiPC, AgregarPC, Armar, Conviene, MiPlan,
// Catalogo, Pieza, Compartir, PlanCompartido (anónimo), Admin y Asistente, a 1440
// y 390. Al final imprime una tabla con la ruta, el archivo y la diferencia de
// tamaño contra la maqueta. Con --reusar-sesion toma lo guardado
// en .local/ si ya existe (y purga cualquier shareToken que el archivo viejo
// todavía traiga). El enlace público se crea en memoria por corrida —el token no
// se guarda, no se loguea ni aparece en rótulos— y se revoca en el `finally`.
// El rol admin se concede solo por CLI explícito
// (scripts/bootstrap-admin.py), nunca por HTTP.
// PantallaAsistente se captura con datos de muestra locales (page.route sobre
// /api/conversations** + frontend/tests/fixtures/assistant-sample-messages.json):
// es una prueba de presentación; no prueba continuidad real; no llama a Groq.
// Las capturas, la sesión y los ids quedan en .local/, que Git ignora.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = await import(pathToFileURL(path.join(root, "frontend/node_modules/@playwright/test/index.mjs")).href);

const base = process.env.UJ_COMPARAR_URL ?? "http://localhost:3000";
const salida = path.join(root, ".local/capturas/comparacion");
const sesion = path.join(root, ".local/comparar-sesion.json");
const datosArchivo = path.join(root, ".local/comparar-sesion.datos.json");
const fixtureMensajesAsistente = path.join(root, "frontend/tests/fixtures/assistant-sample-messages.json");
const anchos = [[1440, 900], [390, 844]];

// El token del enlace vive solo en memoria de esta corrida. Ningún console.log
// ni rótulo de captura lo muestra: todo texto que pueda contenerlo pasa por
// ocultar(), que lo reemplaza por un marcador.
let tokenActivo = null;
const ocultar = texto =>
  tokenActivo ? String(texto).split(tokenActivo).join("«enlace»") : String(texto);

// Alto real del PNG (IHDR) y peso, para comparar el largo de la maqueta con el
// de la pantalla. El signo es siempre real menos maqueta.
function altoPng(imagen) {
  return imagen?.length > 24 && imagen.toString("ascii", 12, 16) === "IHDR" ? imagen.readUInt32BE(20) : null;
}

function diferenciaDeTamano(maqueta, real) {
  const signo = valor => (valor > 0 ? `+${valor}` : String(valor));
  const altoMaqueta = altoPng(maqueta), altoReal = altoPng(real);
  const alto = altoMaqueta !== null && altoReal !== null ? `alto ${signo(altoReal - altoMaqueta)} px` : "alto ?";
  return `${alto} · ${signo(Math.round((real.length - maqueta.length) / 1024))} KB`;
}

// Versiones viejas de .local/comparar-sesion.datos.json pueden traer shareToken:
// se borra del archivo al arrancar, siempre. Nunca se lo usa ni se lo reescribe.
function purgarTokenGuardado() {
  if (!fs.existsSync(datosArchivo)) return;
  try {
    const previo = JSON.parse(fs.readFileSync(datosArchivo, "utf8"));
    if ("shareToken" in previo || "shareId" in previo) {
      delete previo.shareToken;
      delete previo.shareId;
      fs.writeFileSync(datosArchivo, JSON.stringify(previo, null, 2));
    }
  } catch { /* archivo ilegible: la próxima preparación lo reescribe sin token */ }
}

// Las 14 pantallas del sistema de diseño, en el orden del índice. La ruta puede
// ser null si falta el dato real (plan o pieza): se informa como omitida, nunca
// se inventa un id. El 4º elemento es el rótulo seguro para la captura y la tabla.
const ROTULO_ENLACE = "/shared-tower-plans/… (enlace temporal)";
const ROTULO_ASISTENTE = "/chat · mensajes de muestra (fixture local, no es continuidad real)";

const pantallas = (datos, enlace) => [
  ["PantallaInicio", "/", true],
  ["PantallaIngreso", "/account", true],
  ["PantallaCuenta", "/account", false],
  ["PantallaMiPC", "/pcs", false],
  ["PantallaAgregarPC", "/pcs/import", false],
  ["PantallaArmar", "/build", false],
  ["PantallaConviene", "/pcs", false],
  ["PantallaMiPlan", datos?.planId ? `/tower-plans/${datos.planId}` : null, false],
  ["PantallaCatalogo", "/catalog", false],
  ["PantallaPieza", datos?.partId ? `/catalog/${datos.partId}` : null, false],
  ["PantallaCompartir", datos?.planId ? `/tower-plans/${datos.planId}/shares` : null, false],
  ["PantallaPlanCompartido", enlace ? `/shared-tower-plans/${enlace.token}` : null, true, ROTULO_ENLACE],
  ["PantallaAdmin", "/admin", false],
  ["PantallaAsistente", "/chat", false, ROTULO_ASISTENTE],
];

// El email generado no es un secreto, pero no se imprime completo: solo "admin sí/no".
function concederAdmin(email) {
  const comando = `. ./scripts/local-env.ps1; & 'backend/.venv/Scripts/python.exe' 'scripts/bootstrap-admin.py' --email '${email}' --confirm-project-test-account`;
  try {
    execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", comando],
      { cwd: root, stdio: "ignore", timeout: 180000 });
    return true;
  } catch {
    return false;
  }
}

async function prepararSesion(browser) {
  const marca = Date.now().toString().slice(-8);
  const email = `comparador.${marca}@example.test`;
  const clave = `Comparador-${marca}`;
  const contexto = await browser.newContext({ locale: "es-AR" });
  const page = await contexto.newPage();
  await page.goto(`${base}/account`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Crear cuenta" }).click({ timeout: 30000 });
  await page.getByLabel("Tu correo", { exact: true }).fill(email);
  await page.getByLabel("Elegí una contraseña", { exact: true }).fill(clave);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await page.getByText("Cuenta creada", { exact: false }).first().waitFor({ timeout: 25000 });
  await page.getByLabel("Tu correo", { exact: true }).fill(email);
  await page.getByLabel("Tu contraseña", { exact: true }).fill(clave);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("heading", { name: "Tu cuenta", exact: true }).waitFor({ timeout: 25000 });
  console.log(`admin: ${concederAdmin(email) ? "sí" : "no (PantallaAdmin puede rechazar)"}`);
  // Todo lo que se lanza aquí es lo que tiran las propias pantallas; los errores
  // llevan solo el status HTTP, nunca cuerpos ni tokens.
  const datos = await page.evaluate(async () => {
    const consultar = async url => {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`${url} devolvió ${r.status}`);
      return r.json();
    };
    const { csrf_token } = await consultar("/api/auth/csrf");
    const publicar = async (url, body, esperado) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "X-CSRF-Token": csrf_token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.status !== esperado) throw new Error(`${url} devolvió ${r.status}`);
      return r.json();
    };
    const categorias = ["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"];
    // Primer componente real de cada categoría; la que no devuelve items queda
    // "unknown" en la PC, nunca se inventa.
    const paginas = {};
    const presentes = {};
    for (const category of categorias) {
      paginas[category] = await consultar(`/api/catalog/components?page=1&page_size=1&sort=retail_first&category=${category}`);
      const item = paginas[category].items?.[0];
      if (item) presentes[category] = item.id;
    }
    const gpu = paginas.gpu.items?.[0], cpu = paginas.cpu.items?.[0];
    if (!gpu || !cpu) throw new Error("El catálogo no tiene gpu ni cpu de ejemplo");
    const datasetVersion = paginas.gpu.dataset_version;
    const pc = await publicar("/api/towers", {
      schema_version: 2,
      name: "La de casa",
      category_status: Object.fromEntries(categorias.map(c => [c, c in presentes ? "present" : "unknown"])),
      lines: Object.entries(presentes).map(([category, component_id]) => ({ line_id: null, category, component_id, declared_model: null, quantity: 1 })),
      context: { bios_version: null, notes: null },
    }, 201);
    const plan = await publicar("/api/tower-plans", {
      kind: "tower_plan",
      schema_version: 2,
      client_request_id: crypto.randomUUID(),
      name: "Plan de mejora de la de casa",
      pc_id: pc.id,
      expected_pc_revision: pc.revision,
      expected_catalog_version: datasetVersion,
      objective: "gaming",
      workload: null,
      budget_ars: "500000.00",
      price_condition: "cash",
      stages: [{
        name: "Primera etapa",
        budget_ars: "500000.00",
        materials: [],
        actions: [{ action: "replace_category", category: "gpu", line_id: null, candidates: [{ component_id: gpu.id, declared_model: null, quantity: 1 }] }],
      }],
    }, 201);
    let conversaciones = 0;
    for (const titulo of ["Más memoria para trabajar", "Qué placa me conviene"]) {
      try {
        await publicar("/api/conversations", { title: titulo }, 201);
        conversaciones += 1;
      } catch { /* /chat sale más vacío; no aborta la preparación */ }
    }
    // El enlace público NO se crea ni se guarda acá: se arma en memoria por
    // corrida en crearEnlace() y se revoca en el finally del main.
    return { pcId: pc.id, partId: gpu.id, planId: plan.id, datasetVersion, conversaciones };
  });
  await contexto.storageState({ path: sesion });
  fs.writeFileSync(datosArchivo, JSON.stringify(datos, null, 2));
  await contexto.close();
  console.log(`Sesión de prueba lista: PC ${datos.pcId.slice(0, 8)}…, plan ${datos.planId.slice(0, 8)}…, conversaciones ${datos.conversaciones}/2`);
  return datos;
}

// Crea el enlace de compartir en memoria (mismo endpoint de alta que usaba la
// preparación). Devuelve { token, shareId, revision } solo para esta corrida;
// el token nunca se escribe en disco. Reutiliza la sesión guardada, así que
// también funciona con --reusar-sesion (el archivo ya no contiene token).
async function crearEnlace(browser, planId) {
  const contexto = await browser.newContext({ locale: "es-AR", storageState: sesion });
  try {
    const page = await contexto.newPage();
    await page.goto(`${base}/account`, { waitUntil: "domcontentloaded" });
    return await page.evaluate(async id => {
      const consultar = async url => {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(`${url} devolvió ${r.status}`);
        return r.json();
      };
      const plan = await consultar(`/api/tower-plans/${id}`);
      const { csrf_token } = await consultar("/api/auth/csrf");
      const r = await fetch(`/api/tower-plans/${id}/shares`, {
        method: "POST",
        headers: { "X-CSRF-Token": csrf_token, "Content-Type": "application/json" },
        body: JSON.stringify({
          expected_plan_revision: plan.revision,
          title: "Plan de mejora de torre",
          public_projection_confirmed: true,
        }),
      });
      if (r.status !== 201) throw new Error(`alta de enlace devolvió ${r.status}`);
      const share = await r.json();
      return { token: share.token, shareId: share.id, revision: plan.revision };
    }, planId);
  } finally {
    await contexto.close();
  }
}

// Revoca el enlace de esta corrida (DELETE /api/tower-plans/{plan}/shares/{share},
// con expected_plan_revision y CSRF, estado 204). Se llama en el `finally` del
// main: corre aunque la comparación previa haya lanzado. El shareId no porta el
// token; ante error se loguea solo el status, nunca el enlace.
async function revocarEnlace(browser, planId, enlace) {
  if (!enlace) return;
  const contexto = await browser.newContext({ locale: "es-AR", storageState: sesion });
  try {
    const page = await contexto.newPage();
    await page.goto(`${base}/account`, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      async ([id, shareId, revision]) => {
        const { csrf_token } = await (await fetch("/api/auth/csrf", { cache: "no-store" })).json();
        const r = await fetch(`/api/tower-plans/${id}/shares/${shareId}`, {
          method: "DELETE",
          headers: { "X-CSRF-Token": csrf_token, "Content-Type": "application/json" },
          body: JSON.stringify({ expected_plan_revision: revision }),
        });
        if (r.status !== 204) throw new Error(`revocación devolvió ${r.status}`);
      },
      [planId, enlace.shareId, enlace.revision],
    );
  } finally {
    await contexto.close();
  }
}

// PantallaAsistente: la lista, el detalle y el historial se sirven desde el
// fixture local ANTES de navegar (se registra en foto() previo al goto).
// Es una prueba de presentación; no prueba continuidad real; no llama a Groq.
// El glob usa "**" al final porque "*" simple no cruza barras en Playwright
// (globToRegexPattern → "([^/]*)") y el historial vive en
// /api/conversations/{id}/messages. Solo se interceptan GET: ningún GET de
// conversaciones llega a la red; los demás métodos caen al backend real, y la
// preparación nunca dispara el POST del turno, así que no hay llamada al modelo.
async function interceptarAsistente(page) {
  let mensajes;
  try {
    mensajes = JSON.parse(fs.readFileSync(fixtureMensajesAsistente, "utf8"));
  } catch {
    mensajes = { items: [], total: 0, page: 1, page_size: 20 };
    console.log("PantallaAsistente: no se pudo leer el fixture; el historial saldrá vacío");
  }
  // Conversation de muestra: { id, title, created_at, updated_at } (lib/assistant.ts).
  const conversacion = {
    id: "00000000-0000-4000-8000-000000000099",
    title: "Charla de muestra",
    created_at: "2026-01-01T12:00:00Z",
    updated_at: "2026-01-01T12:00:05Z",
  };
  await page.route("**/api/conversations**", async route => {
    if (route.request().method() !== "GET") { await route.fallback(); return; }
    const ruta = new URL(route.request().url()).pathname;
    const json = ruta.endsWith("/messages")
      ? mensajes
      : /^\/api\/conversations\/[^/]+$/.test(ruta)
        ? conversacion
        : { items: [conversacion], total: 1, page: 1, page_size: 20 };
    await route.fulfill({ status: 200, json });
  });
}

// Elige la option cuyo texto contiene el rótulo dado (sirve tanto para
// "La de casa" como para "La de casa · revisión N") seleccionando por su value.
// Devuelve false si la option no existe; nunca lanza por eso.
async function elegirOpcion(select, texto) {
  const opcion = select.locator("option", { hasText: texto }).first();
  if (!(await opcion.count())) return false;
  const value = await opcion.getAttribute("value");
  if (value === null || value === "") return false;
  await select.selectOption({ value });
  return true;
}

// Abre la PC de prueba en /pcs y espera la torre. Devuelve false si la pestaña
// no existe: la captura sigue y lo informa la preparación.
async function abrirPcDePrueba(page) {
  const pestana = page.locator(".pcs-tab", { hasText: "La de casa" }).first();
  if (!(await pestana.count())) return false;
  await pestana.click({ timeout: 10000 });
  await page.waitForTimeout(1500);
  return true;
}

// Debe correr dentro del contexto real ya cargado; nunca aborta la captura.
async function prepararPagina(page, nombre) {
  try {
    if (nombre === "PantallaMiPC") {
      await abrirPcDePrueba(page);
    } else if (nombre === "PantallaConviene") {
      // Mismos datos reales que MiPC, más un pedido real de propuestas. Si el
      // servidor no devuelve ninguna, se informa: no se inventan propuestas.
      await abrirPcDePrueba(page);
      const formulario = page.locator('form[aria-label="Objetivo y presupuesto de torre"]');
      await formulario.waitFor({ timeout: 20000 });
      await formulario.getByLabel("Objetivo de mejora").selectOption("gaming");
      await formulario.getByLabel("Presupuesto ARS (punto decimal, sin miles)").fill("500000.00");
      await formulario.getByRole("button", { name: "Buscar propuestas para mi torre" }).click({ timeout: 15000 });
      try {
        await page.locator('section[aria-label="Propuestas de torre del servidor"]').waitFor({ timeout: 90000 });
        console.log("PantallaConviene: propuestas reales del servidor");
      } catch {
        const aviso = await page.locator('[role="alert"]').first().textContent({ timeout: 3000 }).catch(() => "");
        console.log(`PantallaConviene: el servidor no devolvió propuestas${aviso ? ` (${aviso.trim().slice(0, 160)})` : ""}; no se inventan datos`);
      }
    } else if (nombre === "PantallaMiPlan") {
      await page.locator('section[aria-label="Detalle de plan de torre"]').waitFor({ timeout: 30000 });
    } else if (nombre === "PantallaCatalogo") {
      const selector = page.locator(".catalog-bar select").first();
      if (await selector.count() && await elegirOpcion(selector, "La de casa")) {
        await page.waitForTimeout(2500); // deja terminar los /simulate que dispara la selección
      }
    } else if (nombre === "PantallaPieza") {
      await page.waitForSelector("#piece-pc", { timeout: 15000 });
      await page.locator("#piece-pc").selectOption({ label: "La de casa" });
      await page.waitForTimeout(1500); // deja terminar el /simulate real que dispara el cambio
    } else if (nombre === "PantallaAsistente") {
      // Todo lo de aquí abajo es presentación con datos de muestra interceptados
      // (ver interceptarAsistente): es una prueba de presentación; no prueba
      // continuidad real; no llama a Groq.
      const primera = page.locator(".assistant-conversations li button").first();
      await primera.waitFor({ timeout: 10000 }).catch(() => {});
      if (await primera.count()) await primera.click({ timeout: 8000 });
      // La charla de muestra carga el historial al abrirse; igual se pulsa la
      // recuperación si está habilitada (GET interceptado, nunca un POST de turno).
      const recuperar = page.getByRole("button", { name: "Recuperar historial sin reenviar", exact: true });
      if (await recuperar.count()) await recuperar.click({ timeout: 8000 }).catch(() => {});
      await page.locator(".assistant-message-list li").first().waitFor({ timeout: 15000 }).catch(() => {});
      console.log("PantallaAsistente: Mensajes de muestra (fixture local, no es continuidad real)");
      // #chat-tower recién se monta al abrir la conversación y sus options llegan por fetch.
      await page.waitForSelector("#chat-tower", { timeout: 10000 });
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll("#chat-tower option")).some(o => o.textContent?.includes("La de casa")),
        undefined,
        { timeout: 10000 },
      );
      const torre = page.locator("#chat-tower");
      if (await torre.count() && await elegirOpcion(torre, "La de casa")) {
        await page.waitForTimeout(1500); // deja aplicar el contexto de torre por turno
      }
    } else if (nombre === "PantallaCompartir") {
      // Marca el consentimiento para que el botón se vea habilitado, sin enviar el form.
      const consentimiento = page.locator('form[aria-label="Publicar copia de torre"] input[type="checkbox"]').first();
      if (await consentimiento.count()) await consentimiento.check({ timeout: 8000 });
      await page.waitForTimeout(300);
    } else if (nombre === "PantallaAdmin") {
      await page.getByRole("button", { name: "Consultar borradores y publicaciones" }).click({ timeout: 15000 });
      await page.waitForTimeout(1500);
      const revision = page.locator(".revision-list button").first();
      if (await revision.count()) await revision.click({ timeout: 8000 });
    } else {
      return;
    }
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  } catch {
    console.log(`Preparación de ${nombre} incompleta`);
  }
}

async function foto(browser, url, ancho, alto, storageState, nombre) {
  const contexto = await browser.newContext({ viewport: { width: ancho, height: alto }, locale: "es-AR", storageState });
  const page = await contexto.newPage();
  const errores = [];
  // Se sanitiza cada mensaje antes de guardarlo: el pathname de la página
  // compartida y sus llamados traen el token en la URL, y estos errores se
  // imprimen en el resumen de cada captura.
  page.on("pageerror", error => errores.push(ocultar(error.message)));
  page.on("console", mensaje => { if (mensaje.type() === "error") errores.push(ocultar(mensaje.text())); });
  page.on("response", respuesta => {
    if (respuesta.status() >= 400) {
      try { errores.push(ocultar(`${respuesta.status()} ${new URL(respuesta.url()).pathname}`)); } catch { /* URL opaca */ }
    }
  });
  // En PantallaAsistente las rutas se registran antes de la navegación para que
  // ningún GET de conversaciones salga a la red (prueba de presentación, sin Groq).
  if (nombre === "PantallaAsistente") await interceptarAsistente(page);
  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  if (nombre) await prepararPagina(page, nombre);
  await page.waitForTimeout(800);
  const imagen = await page.screenshot({ fullPage: true });
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await contexto.close();
  return { imagen, desborde, errores };
}

async function unir(browser, nombre, ancho, maqueta, real, etiqueta) {
  const page = await browser.newPage({ viewport: { width: ancho < 500 ? 900 : 2000, height: 900 } });
  const columna = (titulo, imagen) => `<section><h2>${titulo}</h2><img src="data:image/png;base64,${imagen.toString("base64")}"></section>`;
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#333;font:600 18px system-ui;color:#fff}
    h2{margin:0 0 8px;font-size:18px} img{display:block;width:100%;height:auto;background:#fff}
  </style>${columna("Maqueta", maqueta)}${columna(`Real ${etiqueta}`, real)}`, { waitUntil: "load" });
  const archivo = path.join(salida, `${nombre}-${ancho}.png`);
  await page.screenshot({ path: archivo, fullPage: true });
  await page.close();
  return archivo;
}

async function comparar(browser, nombre, ruta, sinSesion, etiqueta) {
  const maqueta = path.join(root, "docs/sistema-diseno/componentes", nombre, "preview.html");
  if (!fs.existsSync(maqueta)) throw new Error(ocultar(`No existe la maqueta ${nombre}`));
  const estado = !sinSesion && fs.existsSync(sesion) ? sesion : undefined;
  const capturas = [];
  for (const [ancho, alto] of anchos) {
    const izquierda = await foto(browser, pathToFileURL(maqueta).href, ancho, alto);
    const derecha = await foto(browser, base + ruta, ancho, alto, estado, nombre);
    // En el rótulo va solo la etiqueta segura (sin token); la ruta real se usa
    // únicamente para navegar. Las capturas viejas con token se sobrescriben.
    const archivo = await unir(browser, nombre, ancho, izquierda.imagen, derecha.imagen, ocultar(etiqueta ?? ruta));
    const errores = [...new Set(derecha.errores)].slice(0, 5);
    console.log(ocultar(`${nombre} ${ancho}: ${path.relative(root, archivo)} | desborde ${derecha.desborde}px | errores ${errores.length ? errores.join(" / ").slice(0, 300) : "ninguno"}`));
    capturas.push({
      ancho,
      archivo: path.basename(archivo),
      diferencia: diferenciaDeTamano(izquierda.imagen, derecha.imagen),
    });
  }
  return capturas;
}

// Tabla final de --todas: una fila por pantalla y una celda por ancho.
function imprimirResumen(filas) {
  const comparadas = filas.filter(fila => fila.ok).length;
  console.log(`\nResumen: ${comparadas} de ${filas.length} pantallas comparadas a 1440 y 390.`);
  console.table(filas, ["pantalla", "ruta", "archivo", "diferencia de tamaño"]);
}

fs.mkdirSync(salida, { recursive: true });
purgarTokenGuardado();
const argumentos = process.argv.slice(2);
const browser = await chromium.launch({ channel: "msedge" });
let enlace = null;
let planDelEnlace = null;
try {
  const reutilizable = fs.existsSync(sesion) && fs.existsSync(datosArchivo);
  if (argumentos.includes("--todas")) {
    let datos;
    if (argumentos.includes("--reusar-sesion") && reutilizable) {
      // El archivo ya fue purgado al arrancar; el enlace de esta corrida se
      // crea en memoria más abajo, nunca se toma del disco.
      datos = JSON.parse(fs.readFileSync(datosArchivo, "utf8"));
    } else {
      datos = await prepararSesion(browser);
    }
    try {
      enlace = await crearEnlace(browser, datos.planId);
      tokenActivo = enlace.token; // única copia: memoria de esta corrida
      planDelEnlace = datos.planId;
    } catch {
      console.log("Enlace temporal no disponible: se omite PantallaPlanCompartido");
    }
    imprimirResumen(await compararTodas(browser, datos, enlace));
  } else {
    const [nombre, ruta] = argumentos;
    if (!nombre || !ruta) throw new Error("Uso: node scripts/comparar-pantalla.mjs PantallaX /ruta [--sin-sesion] | --todas [--reusar-sesion]");
    if (!reutilizable) await prepararSesion(browser);
    await comparar(browser, nombre, ruta, argumentos.includes("--sin-sesion"));
  }
} finally {
  // Se revoca aunque la comparación haya lanzado; cualquier fallo de la
  // revocación se reporta sin exponer el enlace.
  try {
    await revocarEnlace(browser, planDelEnlace, enlace);
    if (enlace) console.log("Enlace temporal revocado");
  } catch {
    console.log("No se pudo revocar el enlace temporal: revocalo a mano o da de baja la cuenta de prueba");
  }
  await browser.close();
}

// Recorre las 14 pantallas sin abortar por una sola: lo que falta se informa en
// la tabla final, nunca se rellena con datos inventados.
async function compararTodas(browser, datos, enlace) {
  const filas = [];
  for (const [nombre, ruta, sinSesion, etiqueta] of pantallas(datos, enlace)) {
    const rotulo = ocultar(etiqueta ?? ruta ?? "(sin ruta)");
    if (!ruta) {
      filas.push({ pantalla: nombre, ruta: rotulo, archivo: "-", "diferencia de tamaño": "no disponible: falta el dato real", ok: false });
      console.log(ocultar(`${nombre}: sin ruta real; se omite`));
      continue;
    }
    try {
      const capturas = await comparar(browser, nombre, ruta, sinSesion, etiqueta);
      filas.push({
        pantalla: nombre,
        ruta: rotulo,
        archivo: capturas.map(captura => captura.archivo).join(", "),
        "diferencia de tamaño": capturas.map(captura => `${captura.ancho}px: ${captura.diferencia}`).join(" · "),
        ok: true,
      });
    } catch (fallo) {
      const mensaje = ocultar(fallo instanceof Error ? fallo.message : String(fallo));
      filas.push({ pantalla: nombre, ruta: rotulo, archivo: "-", "diferencia de tamaño": `error: ${mensaje}`, ok: false });
      console.log(ocultar(`${nombre}: no se pudo comparar (${mensaje})`));
    }
  }
  return filas;
}
