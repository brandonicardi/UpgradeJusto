"use client";
import { useEffect, useRef, useState } from "react";
import { createPreviewMetadataLoader, metadataKey, moreProposalCount, visibleMetadataQueries, visibleProposals, type MetadataSnapshot } from "../../lib/preview-metadata";
import { TowerProductPhoto } from "../../components/tower-product-summary";
import { towerCategories, type TowerCategory } from "../../lib/towers";
import { displayRetailDate, formatRetailARS, offerDisplayStatus, stockLabel } from "../../lib/retail-presentation";
import { publicEvidenceURL, recommendationStatus, type EvidenceRef, type MetricReference, type TowerRecommendationPreview, type TowerRecommendationItem } from "../../lib/tower-recommendations";
import TowerEvaluationView from "./tower-evaluation-view";
import { actionLabel } from "../../lib/central-presentation";
import { BenefitSummary, PendingFields } from "../../components/central-decision";

export function EvidenceLink({ url, children }: { url: string | null | undefined; children: React.ReactNode }) {
  const safe = publicEvidenceURL(url);
  return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (otra pestaña)</span></a> : <span>{children}: enlace no disponible</span>;
}
export function ReferenceView({ reference }: { reference: EvidenceRef | MetricReference }) {
  if ("score" in reference) return <div className="stack-sm"><p>{reference.model} · puntuación de referencia {reference.score} {reference.unit}</p><p>Trabajo: {reference.workload} · observado {reference.observed_on}</p><EvidenceLink url={reference.source_url}>Fuente de la referencia</EvidenceLink><p>{Array.isArray(reference.limitations) ? reference.limitations.join("; ") : reference.limitations}</p>
    <details><summary>Procedencia y asociación de identidad</summary><p>MPN asociado: {reference.matched_mpn ?? "No informado"} · tipo: {reference.identity_kind}</p><p>Asociación publicada; no prueba una revalidación técnica del MPN en esta consulta.</p><p>Versiones: {reference.version} / {reference.identity_version}</p><p>SHA256: {reference.raw_sha256}</p>{reference.samples !== undefined && <p>Muestras: {reference.samples}</p>}{reference.published_on && <p>Publicado: {reference.published_on}</p>}{reference.identity_source_url && <EvidenceLink url={reference.identity_source_url}>Fuente de identidad</EvidenceLink>}{reference.method_url && <EvidenceLink url={reference.method_url}>Método</EvidenceLink>}{reference.raw_url && <EvidenceLink url={reference.raw_url}>Datos de origen</EvidenceLink>}</details>
  </div>;
  return <p><EvidenceLink url={reference.url}>{reference.source_id}</EvidenceLink> · {reference.locator} · consultado {reference.consulted_on}</p>;
}
export function ProposalPart({ id, category, version, metadata }: { id: string; category: TowerCategory; version: string; metadata: MetadataSnapshot }) {
  const entry = metadata.entries.get(metadataKey(id, version));
  const part = metadata.status === "active" && entry?.status === "ready" && entry.part.category === category ? entry.part : null;
  const message = metadata.status === "catalog_changed" ? "Catálogo cambió; volvé a consultar" : metadata.status === "unavailable" ? "No se pudo verificar la versión del catálogo; referencia conservada" : entry ? "Nombre/foto no disponibles; referencia conservada" : "Consultando referencia y versión del catálogo…";
  return <div className="row central-proposal-part">{part ? <><TowerProductPhoto part={part} /><div><p>{part.name}</p>{!Object.keys(part.attributes).length && <small>Identificación técnica y atributos pendientes de evidencia</small>}</div></> : <p>{message} ({id})</p>}</div>;
}
export default function TowerRecommendationView({ result, now, onPreparePlan, planPreparationDisabled = false }: { result: TowerRecommendationPreview; now?: number; onPreparePlan?: (item: TowerRecommendationItem) => void; planPreparationDisabled?: boolean }) {
  const [clock, setClock] = useState(Date.now);
  const [page, setPage] = useState({ preview: result, count: 6 });
  const count = page.preview === result ? page.count : 6;
  const [loaded, setLoaded] = useState<{ preview: TowerRecommendationPreview; snapshot: MetadataSnapshot } | null>(null);
  const loaderRef = useRef<ReturnType<typeof createPreviewMetadataLoader> | null>(null);
  const metadata: MetadataSnapshot = loaded?.preview === result ? loaded.snapshot : { status: "active", entries: new Map() };
  const visible = visibleProposals(result.items, count);
  useEffect(() => {
    const loader = createPreviewMetadataLoader(); loaderRef.current = loader;
    const unsubscribe = loader.subscribe(snapshot => setLoaded({ preview: result, snapshot }));
    return () => { unsubscribe(); loader.dispose(); if (loaderRef.current === loader) loaderRef.current = null; };
  }, [result]);
  useEffect(() => { loaderRef.current?.load(visibleMetadataQueries(visibleProposals(result.items, count))); }, [result, count]);
  useEffect(() => {
    if (now !== undefined || !result.items.some(item => item.offers.some(offer => offer.status === "fresh"))) return;
    const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer);
  }, [now, result]);
  return <section aria-label="Propuestas de torre del servidor" className="tower-proposals stack">
    <h3>Propuestas para tu PC guardada</h3><p>{result.mode === "automatic" ? "Búsqueda automática del servidor" : "Comparación manual del servidor"} · revisión {result.pc_revision}. Consultar no modifica tu PC ni reserva stock.</p>
    <p role="status" aria-label="Cantidad de propuestas visibles">Mostrando {visible.length} de {result.items.length} propuestas, en el orden del servidor.</p>
    {result.missing_fields.includes("search:bounded_not_exhaustive") && <p>La búsqueda tuvo un límite: no demuestra haber evaluado todas las combinaciones.</p>}
    {!result.items.length && <p>No hay propuestas con estos criterios. Revisá faltantes y limitaciones antes de cambiar tu presupuesto.</p>}
    {visible.map((item, index) => <article key={item.key} className="tower-proposal stack" aria-label={`Propuesta ${index + 1}`}>
      <div className="tower-proposal-decision"><div className="stack-sm"><h5>Cambio propuesto</h5>{item.actions.map((action, actionIndex) => <section key={actionIndex}><p>{towerCategories[action.category]} · {actionLabel(action.action)}</p>{action.candidates.map((candidate, candidateIndex) => <div key={candidateIndex}>{candidate.component_id ? <ProposalPart id={candidate.component_id} category={action.category} version={item.versions.catalog} metadata={metadata} /> : <p>{candidate.declared_model ?? "Modelo por confirmar"} · declarado, sin atributos inferidos</p>}<p>{candidate.quantity} {action.category === "ram" ? "módulos" : "unidades"}</p></div>)}<details><summary>Acción técnica original</summary><p>{action.category} · {action.action}</p></details></section>)}
        <h5>Qué cambia según la evidencia</h5><p>Antes: {item.benefit.before ?? "Desconocido"} → Después: {item.benefit.after ?? "Desconocido"}</p><BenefitSummary benefit={item.benefit} /><p>Capacidad no equivale a rendimiento universal; una puntuación no son FPS garantizados.</p>
      </div><section className="tower-proposal-cost stack-sm" aria-label="Coste de la propuesta"><header><h4>{recommendationStatus(item)}</h4><p>{item.cost.within_budget === false ? "Presupuesto insuficiente para el coste informado." : item.cost.total_ars === null ? "Coste incompleto: no se puede confirmar la compra." : "Revisá los faltantes antes de comprar."}</p></header><h5>Coste de los cambios</h5><p className="tower-proposal-total">{item.cost.total_ars === null ? "Total incompleto / desconocido" : formatRetailARS(item.cost.total_ars)}</p><p>Subtotal conocido: {formatRetailARS(item.cost.known_subtotal_ars)}</p>{item.offers.some(offer => offerDisplayStatus(offer, now ?? clock) !== "fresh") && <p>Algún precio venció o no está disponible. Son precios guardados: verificá antes de comprar.</p>}<p>{item.cost.within_budget === true ? "Dentro del presupuesto según el servidor; no implica compatibilidad." : item.cost.within_budget === false ? "El coste informado supera el presupuesto." : "No se puede confirmar si alcanza el presupuesto."}</p><p>{item.benefit.status === "supported" ? "La referencia respalda una mejora, no garantiza el resultado de toda tu PC." : item.benefit.status === "not_an_improvement" ? "La referencia no respalda una mejora." : "Beneficio sin evidencia suficiente."}</p><p>Envío, financiación y mano de obra excluidos. Las dependencias sin confirmar siguen pendientes.</p>{item.offers.map(offer => <div key={offer.offer_id} className="proposal-price-source"><p>{offer.store === "compragamer" ? "Compra Gamer" : "Venex"} · {offer.condition === "cash" ? "Contado" : "Lista (no cuotas)"} · {formatRetailARS(offer.amount)}</p><p>Guardado: {displayRetailDate(offer.observed_at)} · vence: {displayRetailDate(offer.expires_at)}</p><EvidenceLink url={offer.source_url}>Fuente del precio</EvidenceLink></div>)}</section></div>
      {item.dependencies.length > 0 && <section aria-label="Dependencias de la propuesta"><h5>Qué más necesita este cambio</h5><ul>{item.dependencies.map((dep, depIndex) => <li key={depIndex}><p>{dep.kind === "thermal_compound" ? "Pasta térmica" : towerCategories[dep.kind] ?? dep.kind}: {dep.required ? "necesaria" : "según condiciones"} · {{ included: "Incluida según el servidor", available_confirmed: "Disponibilidad confirmada explícitamente", priced: "Con precio informado", missing: "Pendiente" }[dep.state] ?? "Estado no reconocido; por verificar"}</p><p>{dep.reason}</p><p>Importe: {formatRetailARS(dep.amount_ars)}</p><details><summary>Fuentes de la dependencia</summary>{dep.source_refs.map((source, sourceIndex) => typeof source === "string" ? <p key={sourceIndex}><EvidenceLink url={source}>Fuente</EvidenceLink></p> : <ReferenceView key={sourceIndex} reference={source} />)}</details></li>)}</ul></section>}
      <PendingFields fields={[...item.missing_fields, ...item.cost.missing_fields]} />
      <details><summary>Beneficio, fuentes y condiciones de medición</summary>{item.benefit.source.length ? item.benefit.source.map((reference, sourceIndex) => <ReferenceView key={sourceIndex} reference={reference} />) : <p>Sin fuentes de beneficio informadas.</p>}</details>
      <details><summary>Cotizaciones utilizadas y partidas</summary><p>Estas cotizaciones pertenecen a la propuesta recibida. No se sustituyen por precios históricos o por ofertas posteriores del catálogo. Stock no reservado.</p>{item.cost.lines.map((line, lineIndex) => <p key={lineIndex}>{line.component_id} · {line.quantity} unidades · unitario {formatRetailARS(line.unit_amount_ars)} · partida {formatRetailARS(line.amount_ars)} · oferta {line.offer_id}</p>)}{item.offers.map(offer => <section key={offer.offer_id} className="tower-offer"><p>{offer.store} · {offer.condition === "cash" ? "Contado" : "Lista (no cuotas)"} · {formatRetailARS(offer.amount)}</p><p>{offerDisplayStatus(offer, now ?? clock) === "fresh" ? "Dentro del plazo registrado de consulta" : offerDisplayStatus(offer, now ?? clock) === "stale" ? "Cotización vencida; no es precio vigente" : "Cotización no disponible"}. {stockLabel(offer)}.</p><p>Observado: {displayRetailDate(offer.observed_at)} · Vence: {displayRetailDate(offer.expires_at)}</p><EvidenceLink url={offer.source_url}>Publicación de la tienda</EvidenceLink></section>)}</details>
      <details><summary>Compatibilidad, cobertura y exclusiones</summary><TowerEvaluationView result={item.evaluation} /></details>
      <details><summary>Versiones técnicas de la propuesta</summary><p>Catálogo: {item.versions.catalog}</p><p>Reglas: {item.versions.rules}</p><p>Referencias: {item.versions.references}</p><p>Identidad: {item.versions.identity}</p><p>Búsqueda: {item.versions.search}</p><p>Estado técnico de propuesta: {item.status}</p></details>
      {onPreparePlan && <><button type="button" className="secondary" disabled={planPreparationDisabled} onClick={() => onPreparePlan(item)}>Preparar plan por etapas (no guardar)</button><p className="compact-help">Preparar no aprueba la compra. {item.cost.within_budget === false ? "El presupuesto no alcanza para el coste informado. " : ""}{!item.evaluation.coverage.complete ? "La cobertura sigue incompleta. " : ""}Los faltantes y fallos del servidor se conservan en el borrador evaluado.</p></>}
    </article>)}
    {visible.length < result.items.length && <button type="button" className="secondary" onClick={() => setPage({ preview: result, count: moreProposalCount(result.items.length, count) })}>Mostrar 6 más</button>}
    {(result.missing_fields.length > 0 || result.limitations.length > 0) && <details><summary>Faltantes y límites de esta búsqueda</summary><ul>{result.missing_fields.map((field, index) => <li key={`field-${index}`}>{field}</li>)}{result.limitations.map((text, index) => <li key={`limit-${index}`}>{text}</li>)}</ul></details>}
    <p>{onPreparePlan ? "Preparar abre un borrador revisable, incluso si la propuesta fue descartada o requiere verificación; no aprueba compras." : "Guardar o planificar esta propuesta todavía no está disponible aquí."} No se creó ningún plan automáticamente.</p>
  </section>;
}
