import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleHelp, ClipboardList, PcCase } from "lucide-react";
import HomeStart from "./home-start";

const PROMESAS = ["No hace falta saber de hardware.", "Revisamos que cada pieza encaje antes de sugerirla.", "Precios reales, con fecha y tienda."];
const PASOS: [string, string][] = [["Tu PC", "Lo que ya tenés, aunque esté incompleto."], ["Tu objetivo", "Qué querés lograr y cuánto podés gastar."], ["Lo que te conviene", "El cambio que más rinde, con precio y si encaja."], ["Tu plan", "Comprá por etapas, cuando puedas."]];
// El enlace con el nombre de la tarjeta se estira sobre toda ella: el nombre accesible sigue siendo el título.
const ESTIRADO = "[&_.beginner-choice]:no-underline [&_.beginner-choice]:text-inherit [&_.beginner-choice]:after:absolute [&_.beginner-choice]:after:inset-0 [&_.beginner-choice]:after:content-[''] [&_.beginner-choice]:focus-visible:outline-none has-[.beginner-choice:focus-visible]:outline-[3px] has-[.beginner-choice:focus-visible]:outline-offset-4 has-[.beginner-choice:focus-visible]:outline-foco";

type CaminoProps = { href: string; titulo: string; texto: ReactNode; llamada: string; icono: ReactNode; textoId?: string; describedBy?: string; etiqueta?: { id: string; texto: string }; principal?: boolean };
function Camino({ href, titulo, texto, llamada, icono, textoId, describedBy, etiqueta, principal = false }: CaminoProps) {
  return <li className={`relative grid min-w-0 content-start gap-space-3 rounded-md border border-solid p-space-5 transition-colors ${ESTIRADO} ${principal ? "border-pino bg-pino text-sobre-pino shadow-[var(--sombra-1)]" : "border-linea bg-papel-alto text-tinta shadow-[var(--sombra-1)] hover:border-linea-fuerte"}`}>
    {etiqueta && <p id={etiqueta.id} className="m-0 justify-self-start rounded-pill bg-lima px-space-3 py-space-1 text-etiqueta text-sobre-lima beginner-recommendation">{etiqueta.texto}</p>}
    <span aria-hidden="true" className={`grid size-12 place-items-center rounded-md ${principal ? "bg-lima text-sobre-lima" : "bg-pino-suave text-pino"}`}>{icono}</span>
    <h3 className="m-0 font-display text-[20px] font-[650] leading-[26px]"><Link className={principal ? "beginner-choice beginner-choice-primary" : "beginner-choice"} href={href} aria-describedby={describedBy}>{titulo}</Link></h3>
    <p id={textoId} className={`m-0 text-cuerpo ${principal ? "text-sobre-pino" : "text-tinta-suave"}`}>{texto}</p>
    <span aria-hidden="true" className={`mt-space-2 inline-flex items-center gap-space-1 font-bold ${principal ? "text-sobre-pino" : "text-pino"}`}>{llamada}<ArrowRight className="size-4" /></span>
  </li>;
}

export default function BeginnerEntry() {
  return <div className="beginner-entry grid min-w-0 font-sans-uj text-tinta">
    <section aria-label="Tu PC puede dar más" className="grid min-w-0 items-start gap-space-6 pb-space-7 pt-space-6 min-[1001px]:grid-cols-[minmax(0,1fr)_minmax(0,560px)] min-[1001px]:gap-space-7 min-[1001px]:pt-space-8">
      <div>
        <h1 className="m-0 max-w-[12ch] font-display text-[36px] font-bold leading-10 tracking-[-0.03em] min-[641px]:text-[48px] min-[641px]:leading-[52px] min-[1001px]:text-[64px] min-[1001px]:leading-[66px]">Tu PC puede dar <mark className="rounded-sm bg-lima px-[.12em] text-sobre-lima">más</mark>.</h1>
        <p className="m-0 mt-space-5 max-w-[34ch] text-cuerpo-l text-tinta-suave min-[641px]:text-[20px] min-[641px]:leading-[30px]">Contanos qué querés hacer y cuánto querés gastar. Te decimos qué conviene cambiar, cuánto cuesta y si encaja con lo que ya tenés.</p>
        <ul className="m-0 mt-space-6 grid list-none gap-space-3 p-0">{PROMESAS.map(text => <li key={text} className="flex items-start gap-space-3"><Check aria-hidden="true" className="mt-[2px] size-6 flex-none text-pino" strokeWidth={2.25} /><span>{text}</span></li>)}</ul>
      </div>
      <HomeStart />
    </section>

    <section aria-labelledby="beginner-start-title" className="grid min-w-0 py-space-7">
      <div className="mb-space-6 grid max-w-[60ch] gap-space-2">
        <h2 id="beginner-start-title" tabIndex={-1} className="m-0 font-display text-[28px] font-bold leading-[34px] tracking-[-0.015em] min-[641px]:text-titular-l">¿Sabés qué tiene tu PC adentro?</h2>
        <p className="m-0 text-cuerpo-l text-tinta-suave">Con eso las sugerencias son exactas. Si no lo sabés, no pasa nada: te ayudamos a averiguarlo sin abrir la PC.</p>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-space-4 p-0 min-[1001px]:grid-cols-3">
        <Camino principal href="/pcs/import#ayuda" titulo="No sé qué tengo" llamada="Ayudame a averiguarlo" icono={<CircleHelp className="size-6" />} textoId="beginner-help-text" describedBy="beginner-help-note beginner-help-text" etiqueta={{ id: "beginner-help-note", texto: "Si recién empezás" }} texto="Te guiamos paso a paso para encontrar los datos en Windows. Tarda unos 5 minutos." />
        <Camino href="/pcs" titulo="Sé qué piezas tiene" llamada="Cargar mi PC" icono={<PcCase className="size-6" />} texto="Elegilas de nuestra lista, una por una. Podés dejar en blanco las que no sepas." />
        <Camino href="/pcs/import" titulo="Tengo una lista" llamada="Pegar mi lista" icono={<ClipboardList className="size-6" />} textoId="beginner-paste-note" describedBy="beginner-paste-note" texto="Pegá lo que te pasó el vendedor o un programa. Te mostramos lo que entendimos y lo corregís antes de guardar." />
      </ul>
    </section>

    <section aria-label="Recorrido de tu mejora" className="grid min-w-0 py-space-7">
      <div className="grid min-w-0 items-center gap-space-5 rounded-lg bg-papel-hundido p-space-5 min-[641px]:p-space-6 min-[1001px]:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] min-[1001px]:gap-space-7 min-[1001px]:p-space-7">
        <div className="grid gap-space-3">
          <h2 className="m-0 font-display text-[28px] font-bold leading-[34px] tracking-[-0.015em] min-[641px]:text-titular-l">De tu PC a un plan que entendés</h2>
          <p className="m-0 text-cuerpo-l text-tinta-suave">Sin tecnicismos. Si nos falta un dato, te lo decimos y te mostramos cómo conseguirlo.</p>
        </div>
        <ol className="m-0 grid list-none grid-cols-1 gap-space-4 p-0 min-[641px]:grid-cols-2">{PASOS.map(([titulo, texto], index) => <li key={titulo} className="grid content-start gap-space-2 rounded-md bg-papel-alto p-space-5"><b aria-hidden="true" className="font-display text-[32px] leading-none text-pino">{index + 1}</b><strong>{titulo}</strong><span className="text-chico text-tinta-suave">{texto}</span></li>)}</ol>
      </div>
    </section>

    <div className="flex flex-wrap justify-between gap-space-4 border-t border-solid border-linea py-space-6 text-chico text-tinta-suave">
      <span>Los precios son de tiendas argentinas y muestran la fecha en que los vimos. Verificá stock antes de comprar.</span>
      <span>¿Sólo querés mirar? <Link href="/catalog" className="text-pino">Explorar el catálogo</Link> · ¿No tenés una PC? <Link href="/build" className="text-pino">Armá una desde cero</Link></span>
    </div>
  </div>;
}
