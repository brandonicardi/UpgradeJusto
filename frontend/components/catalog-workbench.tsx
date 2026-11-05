"use client";
import { useState } from "react";
import Link from "next/link";
import type { TowerCatalogPage } from "../lib/tower-catalog";
import { towerCategories } from "../lib/towers";
import { cardPrice } from "../lib/catalog-offers";
import { displayImage } from "../lib/retail-presentation";
import { DataWarnings } from "../app/catalog/presentation";
import { PartCard } from "./uj";
import { TowerProductPhoto } from "./tower-product-summary";
import CatalogRetailOffers from "./catalog-retail-offers";

export default function CatalogWorkbench({ data }: { data: TowerCatalogPage }) {
  // La selección vale solo para la página que la originó: al cambiar de página o de filtros se descarta.
  const [selection, setSelection] = useState<{ source: TowerCatalogPage; id: string } | null>(null);
  const selected = selection?.source === data ? data.items.find(item => item.id === selection.id) ?? data.items[0] : data.items[0];
  return <div className="v0-catalog-workbench"><div className="catalog-grid">{data.items.map(component => <article key={component.id} className="grid gap-space-2" data-component-id={component.id} data-selected={selected?.id === component.id ? "true" : undefined}>
    <PartCard anchoCompleto categoria={towerCategories[component.category]} beneficio={component.name} modelo="" foto={displayImage(component)} precio={cardPrice(component)} href={`/catalog/${encodeURIComponent(component.id)}`} />
    <button type="button" className="text-button" aria-pressed={selected?.id === component.id} onClick={() => setSelection({ source: data, id: component.id })}>Ver al lado<span className="sr-only">: {component.name}</span></button>
  </article>)}</div>{selected && <aside className="surface product-overview v0-context-detail" aria-label="Ficha de la pieza seleccionada"><TowerProductPhoto part={selected} /><p className="eyebrow">{towerCategories[selected.category]}</p><h2>{selected.name}</h2><CatalogRetailOffers part={selected} /><DataWarnings component={selected} /><p className="compact-help">La foto no comprueba compatibilidad. Envío, financiación y mano de obra excluidos.</p><Link href={`/catalog/${encodeURIComponent(selected.id)}`}>Ver ficha completa y fuentes</Link><Link className="plan-link" href="/pcs">Comprobar con mi PC</Link></aside>}</div>;
}
