"use client";
import { useEffect, useState } from "react";
import type { TowerComponent } from "../lib/tower-catalog";
import { catalogBoundOffers } from "../lib/catalog-offers";
import { displayRetailDate, formatRetailARS, offerDisplayStatus, retailSourceURL, stockLabel } from "../lib/retail-presentation";

export default function CatalogRetailOffers({ part, now }: { part: TowerComponent; now?: number }) {
  const [clock, setClock] = useState(Date.now), offers = catalogBoundOffers(part);
  useEffect(() => { if (now !== undefined || !part.offers?.some(offer => offer.status === "fresh")) return; const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, [now, part.offers]);
  if (!offers.length) return <p className="catalog-card-price">Precio por confirmar: sin oferta ARS publicada para esta pieza. No equivale a cero.</p>;
  return <div aria-label="Ofertas publicadas de la pieza">{offers.map(offer => {
    const state = offerDisplayStatus(offer, now ?? clock), url = retailSourceURL(offer.source_url);
    return <section key={offer.offer_id} className="tower-offer" data-retail-offer data-offer-id={offer.offer_id}><h3>{offer.store === "compragamer" ? "Compra Gamer" : "Venex"} · {offer.condition === "cash" ? "Contado" : "Lista (no cuotas)"}</h3><p className="catalog-card-price">{offer.amount === null ? "Importe desconocido" : formatRetailARS(offer.amount)}</p><p>{state === "fresh" ? "Dentro del plazo registrado; verificá precio y stock antes de comprar" : state === "stale" ? "Oferta histórica: plazo vencido; no es precio vigente" : "Oferta no disponible para cotizar; importe guardado si está informado"}</p><p>Precio guardado el {displayRetailDate(offer.observed_at)} · vence {displayRetailDate(offer.expires_at)}</p><p>Al consultar: {stockLabel(offer)}. No garantiza disponibilidad actual.</p>{url ? <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Publicación de origen (otra pestaña)</a> : <p>Fuente sin enlace válido para abrir.</p>}</section>;
  })}</div>;
}
