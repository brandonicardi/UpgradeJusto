import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleHelp, ClipboardList, Cpu, Hammer } from "lucide-react";
import HardwareGuide from "./hardware-guide";
import type { TowerComponent } from "../lib/tower-catalog";
import { TowerProductPhoto } from "./tower-product-summary";
import { catalogBoundOffers } from "../lib/catalog-offers";
import { formatRetailARS, displayRetailDate, retailSourceURL } from "../lib/retail-presentation";

const PROMESAS = ["No hace falta saber de hardware.", "Si una pieza no encaja o falta un dato, te lo decimos antes de sugerir nada.", "Precios reales, con fecha y tienda."];
const PASOS: [string, string][] = [["Tu PC", "Lo que ya tenés, aunque esté incompleto."], ["Tu objetivo", "Qué querés lograr y cuánto podés gastar."], ["Lo que te conviene", "Cambios posibles, con precio, fecha y si encajan."], ["Tu plan", "Comprá por etapas, cuando puedas."]];
const ENLACE_PILDORA = "inline-flex min-h-10 items-center justify-center gap-space-2 justify-self-start rounded-pill border-[1.5px] border-solid border-linea-fuerte bg-papel-alto px-space-4 py-space-2 text-[14px] font-semibold leading-5 text-tinta no-underline hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
// Tarjeta de la pieza destacada: el tamaño de la foto y del dibujo de respaldo se resuelve acá, sin `!`
// (el tamaño base de `.tower-product-photo` vive en `@layer base`).
const FOTO_DESTACADA = "grid min-w-0 content-start gap-space-3 rounded-lg border border-solid border-linea bg-papel-alto p-space-5 shadow-[var(--sombra-2)] " +
  "[&_.tower-product-photo]:h-[150px] [&_.tower-product-photo]:w-full [&_.tower-product-photo_img]:h-[150px] [&_.tower-product-photo_img]:w-full [&_.tower-product-photo_img]:p-space-4 " +
  "[&_.photo-fallback_.hardware-art]:m-space-7 [&_.photo-fallback_.hardware-art]:scale-[2.2]";
// El enlace con nombre corto se estira sobre toda la tarjeta: el nombre accesible sigue siendo el título.
const ESTIRADO = "[&_.beginner-choice]:no-underline [&_.beginner-choice]:text-inherit [&_.beginner-choice]:after:absolute [&_.beginner-choice]:after:inset-0 [&_.beginner-choice]:after:content-[''] [&_.beginner-choice]:focus-visible:outline-none has-[.beginner-choice:focus-visible]:outline-[3px] has-[.beginner-choice:focus-visible]:outline-offset-4 has-[.beginner-choice:focus-visible]:outline-foco";

type CaminoProps = { href: string; titulo: string; texto: ReactNode; llamada: string; icono: ReactNode; textoId?: string; describedBy?: string; etiqueta?: { id: string; texto: string }; principal?: boolean; interno?: boolean };
function Camino({ href, titulo, texto, llamada, icono, textoId, describedBy, etiqueta, principal = false, interno = true }: CaminoProps) {
  const clase = principal ? "beginner-choice beginner-choice-primary" : "beginner-choice";
  const enlace = interno ? <Link className={clase} href={href} aria-describedby={describedBy}>{titulo}</Link> : <a className={clase} href={href} aria-describedby={describedBy}>{titulo}</a>;
  return <li className={`relative grid min-w-0 content-start gap-space-3 rounded-md border border-solid p-space-5 transition-colors ${ESTIRADO} ${principal ? "border-pino bg-pino text-sobre-pino shadow-[var(--sombra-1)]" : "border-linea bg-papel-alto text-tinta shadow-[var(--sombra-1)] hover:border-linea-fuerte"}`}>
    {etiqueta && <p id={etiqueta.id} className="m-0 justify-self-start rounded-pill bg-lima px-space-3 py-space-1 text-etiqueta text-sobre-lima beginner-recommendation">{etiqueta.texto}</p>}
    <span aria-hidden="true" className={`grid size-12 place-items-center rounded-md ${principal ? "bg-lima text-sobre-lima" : "bg-pino-suave text-pino"}`}>{icono}</span>
    <h3 className="m-0 font-display text-[20px] font-[650] leading-[26px]">{enlace}</h3>
    <p id={textoId} className={`m-0 text-cuerpo ${principal ? "text-sobre-pino" : "text-tinta-suave"}`}>{texto}</p>
    <span aria-hidden="true" className={`mt-space-2 inline-flex items-center gap-space-1 font-bold ${principal ? "text-sobre-pino" : "text-pino"}`}>{llamada}<ArrowRight className="size-4" /></span>
  </li>;
}

export default function BeginnerEntry({ sample = null }: { sample?: TowerComponent | null }) {
  const offer = sample ? catalogBoundOffers(sample).find(offer => offer.amount !== null) : null;
  const source = offer ? retailSourceURL(offer.source_url) : null;
  return <div className="beginner-entry grid min-w-0 gap-space-6 font-sans-uj text-tinta">
    <header className="grid min-w-0 gap-space-4 pt-space-4">
      <h1 className="m-0 font-display text-titular-m tracking-normal text-tinta-suave">Quiero mejorar mi PC</h1>
      <p className="m-0 max-w-[14ch] font-display text-titular-l font-bold min-[641px]:text-titular-xl">Tu PC puede dar <mark className="rounded-sm bg-lima px-[.12em] text-sobre-lima">más</mark>.</p>
      <p className="m-0 max-w-[52ch] text-cuerpo-l text-tinta-suave">Cargá lo que sabés de tu PC o armá una desde cero. Después elegís qué querés lograr y cuánto gastar, y te mostramos qué conviene cambiar, cuánto cuesta y si encaja con lo que ya tenés.</p>
      <ul className="m-0 grid list-none gap-space-3 p-0">{PROMESAS.map(text => <li key={text} className="flex items-start gap-space-3"><Check aria-hidden="true" className="mt-[2px] size-5 flex-none text-pino" strokeWidth={2.25} /><span>{text}</span></li>)}</ul>
    </header>

    <section aria-labelledby="beginner-start-title" className="grid min-w-0 gap-space-5">
      <div className="grid max-w-[60ch] gap-space-2">
        <h2 id="beginner-start-title" tabIndex={-1} className="m-0 font-display text-titular-l tracking-[-0.015em]">¿Sabés qué tiene tu PC adentro?</h2>
        <p className="m-0 text-cuerpo-l text-tinta-suave">Con eso las sugerencias son exactas. Si no lo sabés, no pasa nada: te ayudamos a averiguarlo sin abrir la PC.</p>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-space-4 p-0 min-[1001px]:grid-cols-3">
        <Camino principal interno={false} href="#hardware-guide-title" titulo="Necesito ayuda" llamada="Ayudame a averiguarlo" icono={<CircleHelp className="size-6" />} textoId="beginner-help-text" describedBy="beginner-help-note beginner-help-text" etiqueta={{ id: "beginner-help-note", texto: "Recomendado si recién empezás" }} texto="Seguí la guía de Windows y anotá los datos que aparezcan, sin abrir la PC." />
        <Camino href="/pcs" titulo="Conozco mis componentes" llamada="Cargar mi PC" icono={<Cpu className="size-6" />} texto="Elegí tus piezas del catálogo o retomá una PC que ya guardaste. Podés dejar en blanco las que no sepas." />
        <Camino href="/pcs/import" titulo="Quiero pegar una lista" llamada="Pegar mi lista" icono={<ClipboardList className="size-6" />} textoId="beginner-paste-note" describedBy="beginner-paste-note" texto="Pegá sólo hardware, sin datos personales. Verás un ejemplo antes de escribir y revisarás la propuesta antes de guardar." />
      </ul>
      <ul className="m-0 grid list-none p-0">
        <Camino href="/build" titulo="Quiero armar una desde cero" llamada="Armar una configuración" icono={<Hammer className="size-6" />} texto="Elegí las piezas una por una, mirá qué falta y cuidá el presupuesto. Esta lista no representa una PC guardada: es lo que pensás comprar." />
      </ul>
    </section>

    <section aria-labelledby="inicio-pieza-title" className="grid min-w-0 items-start gap-space-5 min-[1001px]:grid-cols-[minmax(0,1fr)_minmax(0,420px)] min-[1001px]:items-center min-[1001px]:gap-space-7">
      <div className="grid content-start gap-space-4">
        <h2 id="inicio-pieza-title" className="m-0 font-display text-titular-l tracking-[-0.015em]">Explorá una pieza real</h2>
        <p className="m-0 max-w-[48ch] text-cuerpo-l text-tinta-suave">Así mostramos cada pieza del catálogo: con foto, precio con fecha y tienda, y de dónde sale cada dato.</p>
        <ul className="m-0 grid list-none gap-space-3 p-0">{["Foto de la pieza.", "Precio con fecha y tienda.", "Fuente de cada dato y ficha completa."].map(text => <li key={text} className="flex items-start gap-space-3"><Check aria-hidden="true" className="mt-[2px] size-5 flex-none text-pino" strokeWidth={2.25} /><span>{text}</span></li>)}</ul>
        <Link className={ENLACE_PILDORA} href="/catalog">Ver el catálogo</Link>
      </div>
      <div className={FOTO_DESTACADA}>
        {sample ? <>
          <TowerProductPhoto part={sample} />
          <p className="m-0 font-semibold">{sample.name}</p>
          {offer && <>
            <p className="home-sample-price m-0">{formatRetailARS(offer.amount)}</p>
            <small className="text-chico text-tinta-suave">{offer.store === "compragamer" ? "Compra Gamer" : "Venex"} · {offer.condition === "cash" ? "Contado" : "Lista (no cuotas)"}<br />Precio guardado el {displayRetailDate(offer.observed_at)}; verificá vigencia y stock.</small>
            {source && <a href={source} target="_blank" rel="noopener noreferrer">Fuente del precio</a>}
          </>}
          <Link href={`/catalog/${encodeURIComponent(sample.id)}`}>Ver ficha y procedencia</Link>
          <p className="m-0 text-chico text-tinta-suave">Muestra publicada, no una recomendación ni una PC de ejemplo.</p>
        </> : <>
          <p className="m-0">No se pudo cargar una pieza. No mostramos fotos ni precios inventados.</p>
          <Link className={ENLACE_PILDORA} href="/catalog">Ver catálogo real</Link>
        </>}
      </div>
    </section>

    <section aria-label="Recorrido de tu mejora" className="grid min-w-0 items-center gap-space-5 rounded-lg bg-papel-hundido p-space-5 min-[641px]:p-space-6 min-[1001px]:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] min-[1001px]:gap-space-7 min-[1001px]:p-space-7">
      <div className="grid gap-space-3">
        <h2 className="m-0 font-display text-titular-l tracking-[-0.015em]">De tu PC a un plan que entendés</h2>
        <p className="m-0 text-cuerpo-l text-tinta-suave">Sin tecnicismos. Podés empezar con información incompleta: si nos falta un dato, te lo decimos y no lo damos por compatible ni por gratis.</p>
      </div>
      <ol className="m-0 grid list-none grid-cols-1 gap-space-4 p-0 min-[641px]:grid-cols-2">{PASOS.map(([titulo, texto], index) => <li key={titulo} className="grid content-start gap-space-2 rounded-md bg-papel-alto p-space-5"><b aria-hidden="true" className="font-display text-[32px] leading-none text-pino">{index + 1}</b><strong>{titulo}</strong><span className="text-chico text-tinta-suave">{texto}</span></li>)}</ol>
    </section>

    <details className="entry-help">
      <summary>Guía para encontrar los datos de tu PC en Windows</summary>
      <HardwareGuide />
      <a className="beginner-back" href="#beginner-start-title">Volver a las opciones para empezar</a>
    </details>

    <div className="flex flex-wrap justify-between gap-space-4 border-t border-solid border-linea py-space-5 text-chico text-tinta-suave">
      <span>Los precios son de tiendas argentinas y muestran la fecha en que los vimos. Verificá stock antes de comprar.</span>
      <span>¿Sólo querés mirar piezas? <Link href="/catalog">Explorar el catálogo</Link></span>
    </div>
  </div>;
}
