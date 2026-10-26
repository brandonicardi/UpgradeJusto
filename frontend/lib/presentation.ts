import type { Component } from "./catalog";
export function productName(name: string): { title: string; sku: string | null } {
  const match = /\s+\(?(100-\d+[A-Z]*)\)?$/i.exec(name);
  return match ? { title: name.slice(0, match.index), sku: match[1] } : { title: name, sku: null };
}
export function historicalPrice(component: Component) {
  const prices = component.prices.some(price => price.currency === "ARS") ? component.prices.filter(price => price.currency === "ARS") : component.prices;
  return [...prices].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}
export function money(amount: string, currency: string): string {
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || !/^[A-Z]{3}$/.test(currency)) return `${amount} ${currency}`;
  try { return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(Number(amount)); } catch { return `${amount} ${currency}`; }
}
export function dateLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parsed) : "Fecha por confirmar";
}
