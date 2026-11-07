import type { Component } from "./catalog";
import type { TowerCategory } from "./towers";
export type ImageEvidence = {
  url: string | null; alt: string | null; source_url: string | null;
  retrieved_at: string | null; rights_note: string | null; exact_variant: boolean;
  status: "verified" | "unavailable" | "quarantined"; photo_bytes_verified?: boolean;
};
export type RetailOffer = {
  offer_id: string; store: "compragamer" | "venex"; product_id: string;
  component_id: string; variant_key: string; amount: string | null; currency: "ARS";
  condition: "cash" | "list"; availability: "in_stock" | "out_of_stock" | "unknown";
  stock_quantity: number | null; source_url: string; observed_at: string; expires_at: string;
  status: "fresh" | "stale" | "unavailable";
};
export type TowerComponent = Omit<Component, "category" | "image"> & {
  category: TowerCategory; image?: string | null;
  image_evidence?: ImageEvidence | null; offers?: RetailOffer[];
  /** Oferta marcada «El más bajo» por el servidor; el cliente no la calcula. */
  lowest_offer_id?: string | null;
};
export type TowerCatalogPage = { items: TowerComponent[]; total: number; page: number; page_size: number; dataset_version: string };
export async function remoteCatalog<T>(suffix: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/catalog/components${suffix}`, { cache: "no-store", credentials: "same-origin", signal });
  if (!response.ok) throw new Error("Catálogo no disponible. La referencia guardada se conserva; no se sustituye por otro componente.");
  return response.json() as Promise<T>;
}
