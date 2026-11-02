import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogError } from "../../../lib/catalog";
import { catalogTowerComponent, catalogTowerPage } from "../../../lib/catalog-tower-consumer";
import { towerCategories } from "../../../lib/towers";
import type { TowerComponent } from "../../../lib/tower-catalog";
import { Evidence, Failure, DataWarnings } from "../presentation";
import { TowerProductPhoto } from "../../../components/tower-product-summary";
import CatalogRetailOffers from "../../../components/catalog-retail-offers";
import { displayImage, displayRetailDate, retailSourceURL } from "../../../lib/retail-presentation";

export const dynamic = "force-dynamic";

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let component: TowerComponent;
  try { component = await catalogTowerComponent(id); }
  catch (error) { if (error instanceof CatalogError && error.status === 404) notFound(); return <Failure />; }
  // Version metadata belongs to the list response, not the component contract.
  let datasetVersion: string | null = null;
  try { datasetVersion = (await catalogTowerPage("?page=1&page_size=1")).dataset_version; }
  catch { /* Keep component evidence available; never invent version metadata. */ }
  const image = component.image_evidence, imageSource = retailSourceURL(image?.source_url);
  return <>
    <Link href="/catalog">Volver al catálogo</Link>
    <header className="page-heading"><p className="eyebrow">{towerCategories[component.category]}</p><h1 aria-label={component.name}>{component.name}</h1></header>
    <div className="detail-grid">
      <section aria-label="Resumen del componente" data-component-id={component.id} className="surface product-overview"><TowerProductPhoto part={component} /><CatalogRetailOffers part={component} /><p className="compact-help">Foto y publicación comercial no prueban atributos técnicos ni compatibilidad. Envío, financiación y mano de obra excluidos.</p><Link className="plan-link" href="/pcs">Comprobar con mi PC →</Link><DataWarnings component={component} /><details><summary>Foto y procedencia de la imagen</summary><p>{displayImage(component) ? "Imagen asociada a variante exacta por la evidencia publicada" : "Sin foto verificada/disponible para esta referencia"}.</p><p>{image?.photo_bytes_verified === true ? "Bytes verificados según servidor; no certifica hardware" : "Bytes no verificados por el servidor"}.</p><p>Consultada: {displayRetailDate(image?.retrieved_at)} · Derechos/condiciones: {image?.rights_note ?? "No informados"}</p>{imageSource && <a href={imageSource} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Fuente de la imagen (otra pestaña)</a>}</details></section>
      <section className="surface stack"><h2>Información de la pieza</h2><p className="muted">Un dato por confirmar no equivale a cero ni confirma compatibilidad.</p>
        <Evidence component={component} />
        <details className="accordion"><summary>Atributos documentados completos</summary>{Object.keys(component.attributes).length ? <dl className="attribute-list">{Object.entries(component.attributes).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value === null ? "Desconocido (sin evidencia documentada)" : value}</dd></div>)}</dl> : <p>Atributos desconocidos: sin datos documentados.</p>}</details>
        <details className="accordion"><summary>Identificación y versión del catálogo</summary><p>Nombre completo: {component.name} · Referencia {component.id}</p><p>Versión técnica del dataset: {datasetVersion ?? "Desconocida: no se pudo consultar la versión del catálogo."}</p></details>
      </section>
    </div>
  </>;
}
