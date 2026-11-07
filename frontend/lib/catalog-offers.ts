import type { TowerComponent } from "./tower-catalog";
import { offerDisplayStatus, retailSourceURL } from "./retail-presentation";
export function catalogBoundOffers(part: TowerComponent) { return part.offers?.filter(item => item.component_id === part.id && item.currency === "ARS") ?? []; }

/**
 * Datos del precio que muestra la tarjeta: solo lo que informa la API, sin recalcular.
 * Si el importe no se puede mostrar sin perder precisión, devuelve `{}` y la tarjeta dice «Sin precio».
 */
export function cardPrice(part: TowerComponent, now: number = Date.now()) {
  // Si el servidor marcó una oferta, esa es la que se muestra; si no, se mantiene el comportamiento anterior.
  const bound = catalogBoundOffers(part), marked = part.lowest_offer_id ? bound.find(item => item.offer_id === part.lowest_offer_id) : undefined;
  const offer = marked ?? bound.find(item => offerDisplayStatus(item, now) === "fresh");
  if (!offer || typeof offer.amount !== "string" || !/^(?:0|[1-9]\d{0,11})\.\d{2}$/.test(offer.amount)) return {};
  const tienda = offer.store === "compragamer" ? "Compra Gamer" : offer.store === "venex" ? "Venex" : null;
  return { monto: offer.amount, moneda: offer.currency, fecha: offer.observed_at, tienda, enlace: retailSourceURL(offer.source_url) ?? undefined, condicion: offer.condition === "cash" ? "Contado" : "Lista" };
}

/** Categorías que admiten una sola unidad (espejo de SINGLE_CATEGORIES del backend): cantidad fija en 1, sin campo. */
export const SINGLE_UNIT_CATEGORIES: readonly string[] = ["cpu", "motherboard", "gpu", "psu", "case", "cooler"];
export const isSingleUnitCategory = (category: string) => SINGLE_UNIT_CATEGORIES.includes(category);
export const quantityLimit = (category: string) => category === "fan" ? 32 : category === "ram" || category === "storage" ? 16 : 1;

/** Mejor oferta vigente para una condición: la que marca la API y, si no sirve, la primera vigente en el orden recibido. */
export function bestOffer(part: TowerComponent, condition: "cash" | "list", now: number = Date.now()) {
  const bound = catalogBoundOffers(part).filter(item => item.condition === condition);
  return bound.find(item => item.offer_id === part.lowest_offer_id) ?? bound.find(item => offerDisplayStatus(item, now) === "fresh") ?? null;
}
