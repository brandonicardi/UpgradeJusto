// Capturas de /sistema-diseno a 1440 y 390 px, y copia de las maquetas para comparar.
// Uso, desde frontend/:  node tests/evidence/componentes-base/capturas.mjs
// Levanta la web en un puerto libre, saca las capturas y cierra el servidor al terminar (o si algo falla).
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(aqui, "../../..");
const maquetas = path.resolve(frontend, "../docs/sistema-diseno/componentes");
const componentes = ["Verdict", "PriceTag", "PartCard", "Button", "Field", "Notice", "ChatBubble"];
const tamanios = [
  { ancho: 1440, alto: 1000 },
  { ancho: 390, alto: 844 },
];

function puertoLibre() {
  return new Promise((resolve, reject) => {
    const servidor = net.createServer();
    servidor.once("error", reject);
    servidor.listen(0, "127.0.0.1", () => {
      const { port } = servidor.address();
      servidor.close(() => resolve(port));
    });
  });
}

async function esperarRespuesta(url, proceso, limiteMs = 180_000) {
  const fin = Date.now() + limiteMs;
  while (Date.now() < fin) {
    if (proceso.exitCode !== null) throw new Error(`El servidor se cerró solo (código ${proceso.exitCode}).`);
    try {
      const respuesta = await fetch(url);
      if (respuesta.ok) return;
    } catch {
      // todavía no responde
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${url} no respondió en ${limiteMs / 1000} s.`);
}

function cerrar(proceso) {
  if (!proceso?.pid) return;
  // /T mata también a los procesos hijos de next.
  spawnSync("taskkill", ["/pid", String(proceso.pid), "/T", "/F"], { stdio: "ignore" });
}

const puerto = await puertoLibre();
const base = `http://127.0.0.1:${puerto}`;
console.log(`Puerto elegido: ${puerto}`);

const servidor = spawn(process.execPath, [path.join(frontend, "node_modules/next/dist/bin/next"), "dev", "-p", String(puerto)], {
  cwd: frontend,
  stdio: ["ignore", "pipe", "pipe"],
});
let registro = "";
servidor.stdout.on("data", (d) => (registro += d));
servidor.stderr.on("data", (d) => (registro += d));

let navegador;
let fallo = false;
try {
  await esperarRespuesta(`${base}/sistema-diseno`, servidor);
  console.log("La vitrina respondió.");

  navegador = await chromium.launch({ channel: "msedge" });
  for (const { ancho, alto } of tamanios) {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
    await pagina.goto(`${base}/sistema-diseno`, { waitUntil: "load" });
    await pagina.locator("h1").waitFor({ state: "visible" });
    await pagina.evaluate(() => document.fonts.ready);

    const desborde = await pagina.evaluate((limite) => {
      const raiz = document.documentElement;
      const culpables = [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > limite + 0.5)
        .slice(0, 15)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} (derecha ${Math.round(el.getBoundingClientRect().right)})`);
      return { scrollWidth: raiz.scrollWidth, culpables };
    }, ancho);
    console.log(`${ancho} px: scrollWidth=${desborde.scrollWidth}`);
    if (desborde.scrollWidth > ancho) {
      fallo = true;
      console.log(`Desborde horizontal a ${ancho} px. Elementos que se pasan:`);
      desborde.culpables.forEach((c) => console.log(`  - ${c}`));
    }

    const archivo = path.join(aqui, `sistema-diseno-${ancho}.png`);
    await pagina.screenshot({ path: archivo, fullPage: true, animations: "disabled" });
    console.log(`Captura: ${archivo} (${(statSync(archivo).size / 1024).toFixed(1)} KB)`);
    await pagina.close();
  }

  for (const nombre of componentes) {
    const destino = path.join(aqui, `preview-${nombre.toLowerCase()}.html`);
    // Las hojas de estilo de la maqueta se buscan en docs/, así que se corrige la ruta relativa.
    const html = readFileSync(path.join(maquetas, nombre, "preview.html"), "utf8").replaceAll(
      'href="../../estilos/',
      'href="../../../../docs/sistema-diseno/estilos/',
    );
    writeFileSync(destino, html);
    console.log(`Maqueta copiada: ${path.basename(destino)}`);
  }
} catch (error) {
  fallo = true;
  console.error(String(error));
  console.error("--- salida del servidor ---");
  console.error(registro.slice(-3000));
} finally {
  await navegador?.close();
  cerrar(servidor);
  console.log(`Servidor cerrado (puerto ${puerto}).`);
}
process.exit(fallo ? 1 : 0);
