"use client";
import { useEffect, useId, useState } from "react";
import { remoteCatalog, type TowerCatalogPage, type TowerComponent } from "../lib/tower-catalog";
import { towerCategories, type TowerCategory } from "../lib/towers";
import TowerProductSummary from "./tower-product-summary";
import { TowerProductPhoto } from "./tower-product-summary";

export function RemoteProductName({ id, category, summary = false, compact = false }: { id: string; category: TowerCategory; summary?: boolean; compact?: boolean }) {
  const [part, setPart] = useState<TowerComponent | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    remoteCatalog<TowerComponent>(`/${encodeURIComponent(id)}`, controller.signal).then(value => { if (controller.signal.aborted) return; if (value.category !== category) throw new Error("Category mismatch"); setPart(value); setFailed(false); }).catch(() => { if (!controller.signal.aborted) { setPart(null); setFailed(true); } });
    return () => controller.abort();
  }, [id, category]);
  if (compact && part?.id === id) return <div className="inventory-product-identity"><TowerProductPhoto part={part} /><div><p>{part.name}</p><details><summary>Ficha y evidencia</summary><TowerProductSummary part={part} /></details></div></div>;
  if (summary && part?.id === id) return <TowerProductSummary part={part} />;
  return <span>{part?.id === id ? part.name : failed ? "No se pudo cargar el nombre de este componente" : "Consultando referencia…"}{failed && <details><summary>Referencia técnica</summary><code>{id}</code></details>}</span>;
}

export default function RemoteProductSelector({ category, value, onChange }: { category: TowerCategory; value: string | null; onChange: (id: string) => void }) {
  const uid = useId(), [query, setQuery] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [result, setResult] = useState<TowerCatalogPage | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    remoteCatalog<TowerCatalogPage>(`?${new URLSearchParams({ category, q: search, page: String(page), page_size: "12", sort: "retail_first" })}`, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setResult(data); setError(""); } })
      .catch(() => { if (!controller.signal.aborted) { setResult(null); setError("No se pudo buscar en el catálogo. No se cambió la selección."); } })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [category, search, page]);
  function navigate(next: number) { setBusy(true); setPage(next); }
  return <section aria-label={`Selector de ${towerCategories[category]}`} aria-busy={busy} className="stack-sm">
    <div>Selección actual: {value ? <RemoteProductName key={value} id={value} category={category} summary /> : "Ninguna"}</div>
    <label htmlFor={uid}>Buscar {towerCategories[category]} en el catálogo</label>
    <div className="row wrap"><input id={uid} maxLength={100} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); setBusy(true); setPage(1); setSearch(query.trim()); if (page === 1 && search === query.trim()) setBusy(false); } }} /><button type="button" onClick={() => { setBusy(true); setPage(1); setSearch(query.trim()); if (page === 1 && search === query.trim()) setBusy(false); }}>Buscar</button></div>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Buscando referencias…</p>}
    {result && !busy && <><p>{result.total} resultados · página {result.page}. Datos del catálogo; no es una comprobación de compatibilidad.</p>
      <ul className="tower-product-results">{result.items.map(part => <li key={part.id}><button type="button" className="secondary" aria-pressed={value === part.id} onClick={() => onChange(part.id)}>{part.name}</button><TowerProductSummary part={part} /></li>)}</ul>
      {!result.items.length && <p>No hay coincidencias. Podés declarar el modelo sin inventar atributos.</p>}
      <div className="row wrap"><button type="button" disabled={page <= 1} onClick={() => navigate(page - 1)}>Página anterior de productos</button><button type="button" disabled={page * result.page_size >= result.total} onClick={() => navigate(page + 1)}>Página siguiente de productos</button></div>
    </>}
  </section>;
}
