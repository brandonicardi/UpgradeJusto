// Capturas de /sistema-diseno a 1440 y 390 px, un recorte por sección nueva y comprobaciones de uso.
// Uso, desde frontend/:  node tests/evidence/componentes-pc-y-plan/capturas.mjs
// Usa el servidor que ya está levantado en el puerto 3000: no levanta ni cierra ninguno.
import { chromium } from "@playwright/test";
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const url = "http://localhost:3000/sistema-diseno";
const secciones = ["mi-pc", "objetivo", "presupuesto", "mejoras", "plan"];
const tamanios = [
  { ancho: 1440, alto: 1000 },
  { ancho: 390, alto: 844 },
];

// Cada sección es un <section aria-labelledby="id">; el id está en su título.
const sec = (id) => `section[aria-labelledby="${id}"]`;

// El indicador de desarrollo de Next (la «N») no es parte de la vitrina: se oculta para las capturas.
const ocultarIndicadorDeNext = (pagina) => pagina.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

let fallo = false;
function comprobar(nombre, cumple, detalle = "") {
  console.log(`${cumple ? "OK   " : "FALLA"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  if (!cumple) fallo = true;
}

let navegador;
try {
  navegador = await chromium.launch({ channel: "msedge" });
  for (const { ancho, alto } of tamanios) {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
    const errores = [];
    pagina.on("pageerror", (e) => errores.push(String(e)));
    await pagina.goto(url, { waitUntil: "load" });
    await pagina.locator("h1").waitFor({ state: "visible" });
    await pagina.evaluate(() => document.fonts.ready);
    await ocultarIndicadorDeNext(pagina);
    // Las partes interactivas se hidratan después de la carga.
    await pagina.locator(`${sec("objetivo")} button`).first().waitFor({ state: "visible" });
    await pagina.waitForTimeout(500);

    // 1. Sin desborde horizontal.
    const medidas = await pagina.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    comprobar(`${ancho} px: sin desborde horizontal`, medidas.scrollWidth <= medidas.clientWidth, `scrollWidth=${medidas.scrollWidth}, clientWidth=${medidas.clientWidth}`);

    if (ancho === 1440) {
      // 2. Clic en un objetivo cambia aria-pressed.
      const unica = pagina.locator(sec("objetivo")).getByRole("button", { name: "Trabajar más rápido" }).first();
      const antes = await unica.getAttribute("aria-pressed");
      await unica.click();
      const despues = await unica.getAttribute("aria-pressed");
      comprobar("Clic en un objetivo cambia aria-pressed", antes === "false" && despues === "true", `${antes} → ${despues}`);
      const jugar = pagina.locator(sec("objetivo")).getByRole("button", { name: "Jugar mejor" }).first();
      comprobar("En la elección única, la anterior se desmarca", (await jugar.getAttribute("aria-pressed")) === "false");

      // 3. Monto válido escrito se refleja en el monto grande.
      const campo = pagina.locator(sec("presupuesto")).getByLabel("Escribí el monto");
      const grande = pagina.locator(sec("presupuesto")).locator('[class*="text-titular-l"]');
      await campo.fill("650000");
      const textoGrande = (await grande.textContent()) ?? "";
      comprobar("Monto válido se refleja en el monto grande", /650\.000/.test(textoGrande), textoGrande.trim());

      // 4. Monto fuera de rango: mensaje del rango, el monto grande no cambia y nada se rompe.
      await campo.fill("99999999");
      const mensaje = (await pagina.locator(sec("presupuesto")).locator("p[aria-live]").textContent()) ?? "";
      const grandeDespues = (await grande.textContent()) ?? "";
      comprobar("Monto fuera de rango explica el rango válido", /Escribí un monto entre \$\s?100\.000 y \$\s?1\.500\.000\./.test(mensaje), mensaje);
      comprobar("Monto fuera de rango no cambia el monto grande", /650\.000/.test(grandeDespues), grandeDespues.trim());
      comprobar("Monto fuera de rango marca el campo como inválido", (await campo.getAttribute("aria-invalid")) === "true");
      await campo.fill("abc");
      comprobar("Texto no numérico tampoco cambia el monto", /650\.000/.test((await grande.textContent()) ?? ""));

      // 5. «Sumar a mi plan» muestra la confirmación.
      const sumar = pagina.locator(sec("mejoras")).getByRole("button", { name: "Sumar a mi plan" }).first();
      await sumar.click();
      const confirmacion = pagina.locator(sec("mejoras")).getByText("Lo sumaste a tu plan");
      comprobar("«Sumar a mi plan» muestra la confirmación visible", await confirmacion.isVisible());

      // Todas las tarjetas de mejora tienen el mismo ancho.
      const anchos = [];
      for (const tarjeta of await pagina.locator(`${sec("mejoras")} article`).all()) anchos.push((await tarjeta.boundingBox())?.width ?? 0);
      comprobar(
        "1440 px: las tarjetas de mejora tienen el mismo ancho",
        anchos.length === 3 && anchos.every((a) => a > 0 && Math.abs(a - anchos[0]) < 0.5),
        anchos.map((a) => Math.round(a)).join(", "),
      );

      // Sin precio en una etapa, el plan no muestra total; con todos los precios, sí.
      const sinPrecio = pagina.locator(sec("plan")).getByText("Con una etapa sin precio").locator("xpath=..");
      const conPrecios = pagina.locator(sec("plan")).getByText("Con todos los precios").locator("xpath=..");
      comprobar("El plan con todos los precios muestra «Total del plan»", ((await conPrecios.textContent()) ?? "").includes("Total del plan"));
      comprobar("El plan con una etapa sin precio no muestra «Total del plan»", !((await sinPrecio.textContent()) ?? "").includes("Total del plan"));

      // El veredicto es acumulado: después de un «Falta un dato» no puede aparecer un «Encaja».
      const textoSinPrecio = (await sinPrecio.textContent()) ?? "";
      const primeraDuda = textoSinPrecio.indexOf("Falta un dato");
      comprobar(
        "Plan sin precio: no hay «Encaja» después de un «Falta un dato»",
        primeraDuda >= 0 && !textoSinPrecio.slice(primeraDuda).includes("Encaja"),
        primeraDuda < 0 ? "no aparece ningún «Falta un dato»" : "",
      );

      // El botón «Ver otras opciones» existe solo en dos de las tres tarjetas.
      const otras = await pagina.locator(sec("mejoras")).getByRole("button", { name: "Ver otras opciones" }).count();
      comprobar("«Ver otras opciones» aparece solo en las tarjetas que lo piden", otras === 2, `${otras} de 3`);
    }

    if (ancho === 390) {
      // 6. UpgradeCard en una columna y botones enteros.
      const tarjeta = pagina.locator(`${sec("mejoras")} article`).first();
      const hoy = await tarjeta.getByText("Hoy tenés").boundingBox();
      const pasas = await tarjeta.getByText("Pasás a").boundingBox();
      const unaColumna = hoy && pasas && Math.abs(hoy.x - pasas.x) < 2 && pasas.y > hoy.y;
      comprobar("390 px: la tarjeta de mejora queda en una columna", Boolean(unaColumna));
      for (const nombre of ["Ver otras opciones", "Sumar a mi plan"]) {
        const caja = await tarjeta.getByRole("button", { name: nombre }).boundingBox();
        const entero = Boolean(caja) && caja.x >= 0 && caja.x + caja.width <= ancho && caja.width > 0 && caja.height > 0;
        comprobar(`390 px: el botón «${nombre}» se ve entero`, entero, caja ? `x=${Math.round(caja.x)}, ancho=${Math.round(caja.width)}` : "sin caja");
      }
    }

    comprobar(`${ancho} px: sin errores en la página`, errores.length === 0, errores.join(" | "));

    // Las capturas se sacan recargando, para dejar la vitrina en su estado inicial.
    await pagina.reload({ waitUntil: "load" });
    await pagina.locator("h1").waitFor({ state: "visible" });
    await pagina.evaluate(() => document.fonts.ready);
    await ocultarIndicadorDeNext(pagina);
    await pagina.locator(`${sec("objetivo")} button`).first().waitFor({ state: "visible" });
    await pagina.waitForTimeout(500);
    const archivo = path.join(aqui, `sistema-diseno-${ancho}.png`);
    await pagina.screenshot({ path: archivo, fullPage: true, animations: "disabled" });
    console.log(`Captura: ${archivo} (${(statSync(archivo).size / 1024).toFixed(1)} KB)`);
    for (const id of secciones) {
      const recorte = path.join(aqui, `seccion-${id}-${ancho}.png`);
      await pagina.locator(sec(id)).screenshot({ path: recorte, animations: "disabled" });
      console.log(`Recorte: ${path.basename(recorte)} (${(statSync(recorte).size / 1024).toFixed(1)} KB)`);
    }
    await pagina.close();
  }
} catch (error) {
  fallo = true;
  console.error(String(error));
} finally {
  await navegador?.close();
}
console.log(fallo ? "RESULTADO: hubo fallas." : "RESULTADO: todo en orden.");
process.exit(fallo ? 1 : 0);
