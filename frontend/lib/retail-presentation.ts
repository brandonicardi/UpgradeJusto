import type { RetailOffer, TowerComponent } from "./tower-catalog";

// Closed vendor raster paths only. No optimizer, downloader or user-provided URL.
export function vendorImageURL(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return null;
    const path = decodeURIComponent(url.pathname);
    const allowed = (url.hostname === "imagenes.compragamer.com" && path.startsWith("/productos/")) || (["venex.com.ar", "www.venex.com.ar"].includes(url.hostname) && path.startsWith("/products_images/"));
    if (!allowed || !/\.(?:jpe?g|png|webp|avif)$/i.test(path) || /[\\\x00-\x1f]/.test(path)) return null;
    return url.href;
  } catch { return null; }
}
export function displayImage(part: TowerComponent, failedURL: string | null = null): string | null {
  const evidence = part.image_evidence;
  if (!evidence || evidence.status !== "verified" || evidence.exact_variant !== true || part.image !== evidence.url) return null;
  const url = vendorImageURL(evidence.url);
  return url === failedURL ? null : url;
}
export function retailSourceURL(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !["compragamer.com", "venex.com.ar", "www.venex.com.ar"].includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}
// Do not round/coerce decimal strings through Number or turn unknown into zero.
export function formatRetailARS(amount: string | null | undefined): string {
  if (typeof amount !== "string" || !/^(?:0|[1-9]\d*)\.\d{2}$/.test(amount)) return "Importe no disponible";
  const [integer, decimal] = amount.split(".");
  return `ARS ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimal}`;
}
export function offerDisplayStatus(offer: RetailOffer, now: number): RetailOffer["status"] {
  if (offer.status !== "fresh") return offer.status;
  const observed = Date.parse(offer.observed_at), expires = Date.parse(offer.expires_at);
  if (!Number.isFinite(now) || !Number.isFinite(observed) || !Number.isFinite(expires) || expires <= observed || observed > now) return "unavailable";
  return now >= expires ? "stale" : "fresh";
}
export function displayRetailDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Fecha no disponible";
  const date = new Date(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", ...(dateOnly ? {} : { timeStyle: "short" as const }), timeZone: dateOnly ? "UTC" : "America/Argentina/Buenos_Aires" }).format(date);
}
export const NO_PRICE_LABEL = "Sin precio";
// Precio de referencia solo con importe ARS, fecha y tienda; si falta algo, "Sin precio" (nunca cero).
export function referencePriceLabel(offer: Pick<RetailOffer, "amount" | "currency" | "observed_at" | "store">): string {
  const store = offer.store === "compragamer" ? "Compra Gamer" : offer.store === "venex" ? "Venex" : null;
  const complete = offer.currency === "ARS" && store !== null && Number.isFinite(Date.parse(offer.observed_at ?? ""))
    && typeof offer.amount === "string" && /^(?:0|[1-9]\d*)\.\d{2}$/.test(offer.amount);
  return complete ? `Precio de referencia: ${formatRetailARS(offer.amount)} · ${displayRetailDate(offer.observed_at)} · ${store}` : NO_PRICE_LABEL;
}
export function stockLabel(offer: RetailOffer): string {
  if (offer.availability === "unknown") return "Stock por confirmar";
  if (offer.availability === "out_of_stock") return "Sin stock informado por la tienda";
  return offer.stock_quantity === null || !Number.isInteger(offer.stock_quantity) || offer.stock_quantity < 0
    ? "En stock según la consulta; cantidad desconocida"
    : `En stock según la consulta · cantidad informada: ${offer.stock_quantity}`;
}
