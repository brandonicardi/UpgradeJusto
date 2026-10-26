import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogError, catalogFetch, categories, type CatalogPage, type Component } from "../../../lib/catalog";
import { Evidence, Failure, DataWarnings } from "../presentation";
import ProductVisual from "../../../components/product-visual";
import { productName, historicalPrice, money, dateLabel } from "../../../lib/presentation";

export const dynamic = "force-dynamic";

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let component: Component;
  try { component = await catalogFetch<Component>(`/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof CatalogError && error.status === 404) notFound(); return <Failure />; }
  // Version metadata belongs to the list response, not the component contract.
  let datasetVersion: string | null = null;
  try { datasetVersion = (await catalogFetch<CatalogPage>("?page=1&page_size=1")).dataset_version; }
  catch { /* Keep component evidence available; never invent version metadata. */ }
  const name = productName(component.name), price = historicalPrice(component);
  return <>
    <Link href="/catalog">Volver al catálogo</Link>
    <header className="page-heading"><p className="eyebrow">{categories[component.category]}</p><h1 aria-label={component.name}>{name.title}</h1>{name.sku && <p className="muted">Variante {name.sku}</p>}</header>
    <div className="detail-grid">
      <section aria-label="Resumen del componente" className="surface product-overview"><ProductVisual category={component.category} componentId={component.id} /><p className="compact-help">Ilustración de categoría, no foto del producto.</p><p className="result-price">{price ? money(price.amount, price.currency) : "Precio por confirmar"}</p><p className="muted">{price ? `Histórico · ${dateLabel(price.date)} · ${price.currency}` : "Precio desconocido: sin precio documentado."}</p><p className="muted">No garantiza disponibilidad ni compatibilidad con tu PC.</p><Link className="plan-link" href="/pcs">Comprobar con mi PC →</Link><DataWarnings component={component} /></section>
      <section className="surface stack"><h2>Información de la pieza</h2><p className="muted">Un dato por confirmar no equivale a cero ni confirma compatibilidad.</p>
        <Evidence component={component} />
        <details className="accordion"><summary>Atributos documentados completos</summary>{Object.keys(component.attributes).length ? <dl className="attribute-list">{Object.entries(component.attributes).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value === null ? "Desconocido (sin evidencia documentada)" : value}</dd></div>)}</dl> : <p>Atributos desconocidos: sin datos documentados.</p>}</details>
        <details className="accordion"><summary>Identificación y versión del catálogo</summary><p>Nombre completo: {component.name} · Referencia {component.id}</p><p>Versión técnica del dataset: {datasetVersion ?? "Desconocida: no se pudo consultar la versión del catálogo."}</p></details>
      </section>
    </div>
  </>;
}
