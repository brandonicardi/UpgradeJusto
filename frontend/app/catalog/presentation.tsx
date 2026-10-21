import Link from "next/link";
import { categories, safeSource, type Component } from "../../lib/catalog";

export function Evidence({ component }: { component: Component }) {
  return <div className="mt-5 space-y-5">
    <section aria-label="Precios históricos"><h3 className="font-bold">Precios históricos</h3>
      <p className="text-sm text-slate-600">Referencias documentadas; no son ofertas actuales ni garantizan disponibilidad.</p>
      {component.prices.length ? <ul className="mt-2 space-y-2">{component.prices.map((price, i) => <li key={i} className="break-words"><strong>{price.amount} {price.currency}</strong> · Fecha: <time dateTime={price.date}>{price.date}</time><br /><span className="text-sm">Procedencia: {price.source}</span></li>)}</ul> : <p className="mt-2">Precio desconocido: sin precio documentado.</p>}
    </section>
    <section aria-label="Fuentes"><h3 className="font-bold">Fuentes documentadas</h3>
      {component.sources.length ? <ul className="mt-2 space-y-1">{component.sources.map((source, i) => <li key={`${source.id}-${i}`} className="break-words">{safeSource(source.url) ? <a href={safeSource(source.url)!} target="_blank" rel="noopener noreferrer">{source.id} — {source.url}<span className="sr-only"> (abre en otra pestaña)</span></a> : <span>{source.id} — URL no disponible</span>}</li>)}</ul> : <p>Sin fuentes documentadas.</p>}
    </section>
  </div>;
}

export function Card({ component }: { component: Component }) {
  return <article className="panel flex flex-col gap-3">
    <div className="placeholder">Imagen no disponible</div>
    <p className="text-sm text-slate-600">{categories[component.category]} · {component.id}</p>
    <h2 className="text-lg font-bold"><Link href={`/catalog/${encodeURIComponent(component.id)}`}>{component.name}</Link></h2>
    <Evidence component={component} />
  </article>;
}

export function Failure({ invalid = false }: { invalid?: boolean }) {
  return <section role="alert" className="panel mt-6"><h2 className="text-xl font-bold">{invalid ? "Revisá los filtros" : "No se pudo cargar el catálogo"}</h2><p className="my-3">{invalid ? "Usá una categoría válida, hasta 100 caracteres y páginas entre 1 y 10000 (tamaño entre 1 y 50)." : "El servicio no está disponible o rechazó la consulta. No mostramos datos de ejemplo."}</p><Link href="/catalog">Volver al catálogo e intentar nuevamente</Link></section>;
}
