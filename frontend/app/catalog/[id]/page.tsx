import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogError, safeSource } from "../../../lib/catalog";
import { catalogTowerComponent, catalogTowerPage } from "../../../lib/catalog-tower-consumer";
import type { TowerComponent } from "../../../lib/tower-catalog";
import { Failure, DataWarnings } from "../presentation";
import { TowerProductPhoto } from "../../../components/tower-product-summary";
import PiecePrices from "../../../components/catalog-piece-prices";
import PieceFit from "../../../components/catalog-piece-fit";
import { displayRetailDate, retailSourceURL } from "../../../lib/retail-presentation";
import { catalogCategories, catalogTechnicalText } from "../../../lib/catalog-simulation";
import { pieceCategories, pieceFacts } from "../../../lib/catalog-piece";
import "./piece.css";
export const dynamic = "force-dynamic";
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let component: TowerComponent;
  try { component = await catalogTowerComponent(id); } catch (error) { if (error instanceof CatalogError && error.status === 404) notFound(); return <Failure />; }
  let version: string | null = null;
  try { version = (await catalogTowerPage("?page=1&page_size=1")).dataset_version; } catch { /* No invented version. */ }
  const image = component.image_evidence, imageSource = retailSourceURL(image?.source_url);
  return <div className="piece-page"><nav className="piece-crumbs" aria-label="Estás en"><Link href="/catalog">Catálogo</Link><span>›</span><Link href={`/catalog?category=${component.category}`}>{pieceCategories[component.category]}</Link><span>›</span><span>{component.name}</span></nav>
    <div className="piece-body"><div><section className="piece-hero"><div className="piece-photo"><TowerProductPhoto part={component} /></div><div><span>{catalogCategories[component.category]}</span><h1>{component.name}</h1><p>{catalogTechnicalText(component)}</p></div></section>
      <section className="piece-block"><h2>Lo que conviene saber</h2><ul className="piece-facts">{pieceFacts(component).map(fact => <li key={fact.label}><strong>{fact.label}</strong><span>{fact.value}</span></li>)}</ul><p className="piece-source">Datos de las fuentes documentadas. No tenemos la fecha de carga de estos atributos. Si algo no te cierra, avisanos.</p><DataWarnings component={component} /></section>
      <section className="piece-block"><h2>Dónde la vimos y a cuánto</h2><PiecePrices part={component} /></section>
      <section className="piece-block" aria-label="Más información"><details><summary>Procedencia y fuentes</summary>{component.sources.length ? <ul>{component.sources.map((source, index) => <li key={index}>{safeSource(source.url) ? <a href={safeSource(source.url)!} target="_blank" rel="noopener noreferrer">{source.id}</a> : source.id}</li>)}</ul> : <p>Sin fuentes documentadas.</p>}<p>Foto consultada: {displayRetailDate(image?.retrieved_at)}. {image?.rights_note ?? "Condiciones de uso no informadas."}</p>{imageSource && <a href={imageSource} target="_blank" rel="noopener noreferrer">Fuente de la imagen</a>}</details><details><summary>Atributos completos</summary><dl>{Object.entries(component.attributes).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || "Falta un dato"}</dd></div>)}</dl></details><details><summary>Versión del catálogo</summary><p>{version ?? "No pudimos consultar la versión del catálogo."}</p></details></section>
    </div><PieceFit part={component} catalogVersion={version} /></div><footer className="piece-footer"><span>Revisamos con reglas fijas, no con suposiciones: si nos falta un dato, te lo decimos.</span><Link href="/chat">Preguntale al asistente sobre esta pieza</Link></footer></div>;
}
