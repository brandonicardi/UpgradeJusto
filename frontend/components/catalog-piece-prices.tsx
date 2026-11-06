"use client";
import { useEffect, useState } from "react";
import type { TowerComponent } from "../lib/tower-catalog";
import { catalogBoundOffers } from "../lib/catalog-offers";
import { displayRetailDate, formatRetailARS, offerDisplayStatus, retailSourceURL } from "../lib/retail-presentation";
export default function PiecePrices({ part, compact = false }: { part: TowerComponent; compact?: boolean }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const offers = catalogBoundOffers(part), usable = offers.filter(offer => offerDisplayStatus(offer, now) === "fresh" && formatRetailARS(offer.amount) !== "Importe no disponible");
  const store = (value: string) => value === "compragamer" ? "Compra Gamer" : "Venex";
  if (compact) { const offer = (part.lowest_offer_id ? usable.find(item => item.offer_id === part.lowest_offer_id) : undefined) ?? usable[0]; return <div className="piece-price">{offer ? <><strong>{formatRetailARS(offer.amount)}</strong><small>{offer.condition === "cash" ? "Contado" : "Lista"} · visto el {displayRetailDate(offer.observed_at)} en {store(offer.store)}</small></> : <strong>Sin precio</strong>}</div>; }
  return <><div className="piece-prices"><table><thead><tr><th>Tienda</th><th>Precio</th><th>Visto el</th></tr></thead><tbody>{offers.map(offer => { const url = retailSourceURL(offer.source_url); const best = !!part.lowest_offer_id && offer.offer_id === part.lowest_offer_id; return <tr key={offer.offer_id} className={best ? "best" : usable.includes(offer) ? undefined : "old"}><td>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{store(offer.store)}</a> : store(offer.store)}{best && <span className="tag">El más bajo</span>}<small>{offer.condition === "cash" ? "Contado" : "Lista"}</small></td><td>{formatRetailARS(offer.amount)}</td><td>{displayRetailDate(offer.observed_at)}{!usable.includes(offer) && <small>puede estar viejo · no es precio vigente</small>}</td></tr>; })}</tbody></table>{!offers.length && <p>Sin precio. No tenemos ofertas publicadas todavía.</p>}</div><p className="piece-source">Precios de contado. Los de más de 7 días no cuentan para “el más bajo”. Verificá stock antes de comprar.</p></>;
}
