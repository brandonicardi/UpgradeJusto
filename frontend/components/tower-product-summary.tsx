"use client";
import { useCallback, useEffect, useState } from "react";
import type { TowerComponent } from "../lib/tower-catalog";
import HardwareArt from "./hardware-art";
import { displayImage, displayRetailDate, offerDisplayStatus, referencePriceLabel, retailSourceURL, stockLabel } from "../lib/retail-presentation";

export function TowerProductPhoto({ part }: { part: TowerComponent }) {
  const [failedURL, setFailedURL] = useState<string | null>(null), [loadedURL, setLoadedURL] = useState<string | null>(null), url = displayImage(part, failedURL);
  const photoRef = useCallback((image: HTMLImageElement | null) => {
    // A cached image may finish before hydration installs onLoad. Read the real
    // element state; do not manufacture a loaded image or change its source.
    if (url && image?.complete) { if (image.naturalWidth > 0) setLoadedURL(url); else setFailedURL(url); }
  }, [url]);
  return <div className="tower-product-photo" data-photo-state={url ? loadedURL === url ? "loaded" : "loading" : "unavailable"}>
    {url && failedURL !== url ?
      // eslint-disable-next-line @next/next/no-img-element -- Closed vendor URL, direct browser image; no server download/optimizer.
      <img ref={photoRef} src={url} width={72} height={72} alt={part.image_evidence?.alt?.trim() || `Imagen de ${part.name} publicada por la tienda`} loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{ opacity: loadedURL === url ? 1 : 0 }} onLoad={event => { if (event.currentTarget.naturalWidth > 0) setLoadedURL(url); else setFailedURL(url); }} onError={() => setFailedURL(url)} />
      : <span className="photo-fallback" role="img" aria-label={`Sin foto disponible de ${part.name}`}><HardwareArt category={part.category} /><span>Sin foto · ilustración</span></span>}
    {url && loadedURL !== url && <span className="photo-status" role="img" aria-label={`Cargando foto de ${part.name}`}>Cargando foto…</span>}
  </div>;
}

export default function TowerProductSummary({ part, now }: { part: TowerComponent; now?: number }) {
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (now !== undefined || !part.offers?.some(offer => offer.status === "fresh")) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [now, part.offers]);
  const evidence = part.image_evidence, source = retailSourceURL(evidence?.source_url);
  const offers = part.offers?.filter(offer => offer.component_id === part.id) ?? [];
  return <div className="tower-product-summary stack-sm">
    <div className="row"><TowerProductPhoto key={part.id} part={part} /><div><p>{part.name}</p><small>{Object.keys(part.attributes).length ? "Atributos del catálogo; cobertura técnica no evaluada aquí" : "Identificación técnica y atributos pendientes de evidencia"}</small></div></div>
    <details><summary>Foto, procedencia y ofertas</summary><div className="stack-sm">
      <p>Una foto o publicación comercial no prueba atributos técnicos, reemplazabilidad ni compatibilidad.</p>
      {evidence ? <><p>Imagen: {displayImage(part) ? "URL asociada a la variante exacta por la fuente" : "No disponible para mostrar"}. {evidence.photo_bytes_verified === true ? "El servidor informa verificación de bytes; no certifica hardware." : "Bytes de la foto no verificados por el servidor."}</p><p>Consulta de imagen: {displayRetailDate(evidence.retrieved_at)}</p><p>Derechos/condiciones: {evidence.rights_note || "No informados"}</p>{source && <a href={source} target="_blank" rel="noopener noreferrer">Publicación de origen de la imagen (otra pestaña)</a>}</> : <p>Sin evidencia fotográfica publicada.</p>}
      {!offers.length && <p>No hay ofertas publicadas para esta referencia. Importe y stock desconocidos, no cero.</p>}
      {offers.map(offer => {
        const state = offerDisplayStatus(offer, now ?? clock), link = retailSourceURL(offer.source_url);
        return <section key={offer.offer_id} className="tower-offer"><h4>{offer.store === "compragamer" ? "Compra Gamer" : "Venex"} · {offer.condition === "cash" ? "Contado" : "Lista (no cuotas)"}</h4>
          <p>{referencePriceLabel(offer)} · {state === "fresh" ? "Dentro del plazo de consulta" : state === "stale" ? "Consulta vencida; no es precio vigente" : "Oferta no disponible para cotizar"}</p>
          <p>{stockLabel(offer)}. No garantiza stock futuro.</p><p>Observado: {displayRetailDate(offer.observed_at)} · Vence: {displayRetailDate(offer.expires_at)}</p>
          {link ? <a href={link} target="_blank" rel="noopener noreferrer">Ver publicación de la tienda (otra pestaña)</a> : <p>Enlace de procedencia no disponible para abrir.</p>}
        </section>;
      })}
      <p>Las ofertas no sustituyen los precios históricos ni constituyen un presupuesto completo. Envío, financiación y mano de obra excluidos. No se calculó compatibilidad.</p>
    </div></details>
  </div>;
}
