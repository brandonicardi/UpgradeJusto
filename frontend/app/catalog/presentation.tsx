import Link from "next/link";
import { categories, safeSource, datasetSource, type Component } from "../../lib/catalog";
import ProductVisual from "../../components/product-visual";
import { historicalPrice, money, dateLabel, productName } from "../../lib/presentation";
import { hasDocumentedConflict } from "../../lib/catalog-evidence";

export function Evidence({ component }: { component: Component }) {
  return <div className="stack">
    <details className="accordion"><summary>Precios históricos y procedencia</summary><section aria-label="Precios históricos"><p className="muted">Referencias documentadas; no son ofertas actuales ni garantizan disponibilidad.</p>{component.prices.length ? <ul className="stack-sm">{component.prices.map((price, i) => <li key={i}><strong>{money(price.amount, price.currency)}</strong><p>Importe original: <span>{price.amount} {price.currency}</span> · <time dateTime={price.date}>{price.date}</time></p><p className="break-words">Procedencia: {safeSource(price.source) ? <a href={safeSource(price.source)!} rel="noreferrer">{price.source}</a> : price.source}</p></li>)}</ul> : <p>Precio desconocido: sin precio documentado.</p>}</section></details>
    <details className="accordion"><summary>Fuentes, licencias y revisiones</summary><section aria-label="Fuentes"><h3>Fuentes documentadas</h3>{component.sources.length ? <ul className="stack-sm">{component.sources.map((source, i) => { const dataset = datasetSource(source.url); return <li key={`${source.id}-${i}`} className="break-words">{dataset && <p>{dataset.label} · Licencia {dataset.license} · Revisión {dataset.revision ?? "no identificada en URL"}</p>}{safeSource(source.url) ? <a href={safeSource(source.url)!} target="_blank" rel="noopener noreferrer">{source.id} — {source.url}<span className="sr-only"> (abre en otra pestaña)</span></a> : <span>{source.id} — URL no disponible</span>}</li>; })}</ul> : <p>Sin fuentes documentadas.</p>}</section></details>
  </div>;
}
export function DataWarnings({ component }: { component: Component }) {
  const conflict = hasDocumentedConflict(component.attributes);
  const warning = Object.entries(component.attributes).some(([key, value]) => /warning/i.test(key) && value !== null && !["", "false", "0", "[]", "{}"].includes(value));
  return conflict || warning ? <div className="notice"><p>{conflict ? "Hay datos contradictorios: revisá el detalle." : "Hay advertencias documentadas: revisá el detalle."}</p><details><summary>Revisar advertencias documentadas</summary><pre className="technical-json">{JSON.stringify(component.attributes, null, 2)}</pre></details></div> : null;
}
export function Card({ component }: { component: Component }) {
  const price = historicalPrice(component), name = productName(component.name);
  const datasets = [...new Set(component.sources.map(source => datasetSource(source.url)?.label).filter(Boolean))];
  return <article className="surface catalog-card">
    <div className="row"><ProductVisual category={component.category} componentId={component.id} /><p className="muted">{categories[component.category]}</p></div>
    <h2><Link href={`/catalog/${encodeURIComponent(component.id)}`} aria-label={component.name}>{name.title}</Link></h2>
    {name.sku && <p className="muted">Variante {name.sku}</p>}
    <div className="catalog-card-price">{price ? money(price.amount, price.currency) : "Precio por confirmar"}</div>
    <p className="muted">{price ? `Histórico · ${dateLabel(price.date)} · ${price.currency}` : "Sin precio documentado"}</p>
    {price && price.currency !== "ARS" && <p className="compact-help">Referencia en {price.currency}; no es un precio ARS vigente.</p>}
    {datasets.length > 0 && <p className="compact-help">Datos: {datasets.join(" · ")}</p>}
    <DataWarnings component={component} />
    <Link className="card-detail-link" href={`/catalog/${encodeURIComponent(component.id)}`}>Ver ficha y fuentes <span className="sr-only">de {component.name}</span> →</Link>
  </article>;
}
export function Failure({ invalid = false }: { invalid?: boolean }) {
  return <section role="alert" className="surface empty-state"><span className="badge badge-warning">!</span><h2>{invalid ? "Revisá los filtros" : "No se pudo cargar el catálogo"}</h2><p className="muted">{invalid ? "Usá una categoría válida y revisá el nombre o la página solicitada." : "El servicio no está disponible. No sustituimos los datos por ejemplos."}</p><Link href="/catalog">Volver al catálogo e intentar nuevamente</Link></section>;
}
