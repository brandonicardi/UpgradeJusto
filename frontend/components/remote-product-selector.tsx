"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { remoteCatalog, type TowerCatalogPage, type TowerComponent } from "../lib/tower-catalog";
import { towerCategories, type TowerCategory } from "../lib/towers";
import TowerProductSummary, { TowerProductPhoto, TowerProductProvenance } from "./tower-product-summary";
import { cardPrice } from "../lib/catalog-offers";
import { displayRetailDate, formatRetailARS } from "../lib/retail-presentation";

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

function PriceLine({ part }: { part: TowerComponent }) {
  const price = cardPrice(part);
  if (!price.monto) return <small className="remote-pick-price">Sin precio por ahora</small>;
  return <small className="remote-pick-price"><strong>{formatRetailARS(price.monto)}</strong>{price.tienda ? ` · ${price.tienda}` : ""} · {displayRetailDate(price.fecha)}</small>;
}

function ChosenProduct({ id, category, known, onClear }: { id: string; category: TowerCategory; known: TowerComponent | null; onClear: () => void }) {
  const [fetched, setFetched] = useState<TowerComponent | null>(null), [failed, setFailed] = useState(false), [clock] = useState(Date.now);
  const part = known?.id === id ? known : fetched?.id === id ? fetched : null;
  useEffect(() => {
    if (known?.id === id) return;
    const controller = new AbortController();
    remoteCatalog<TowerComponent>(`/${encodeURIComponent(id)}`, controller.signal).then(value => { if (controller.signal.aborted) return; if (value.category !== category) throw new Error("Category mismatch"); setFetched(value); setFailed(false); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [id, category, known]);
  const name = part?.name ?? (failed ? "este componente" : "componente elegido");
  return <div className="remote-chosen">
    <div className="remote-pick remote-pick-chosen">
      {part ? <TowerProductPhoto key={part.id} part={part} /> : <span className="tower-product-photo" aria-hidden="true" />}
      <span className="remote-pick-text"><span className="remote-pick-name">{part ? part.name : failed ? "No se pudo cargar este componente" : "Cargando componente…"}</span>{part && <PriceLine part={part} />}</span>
      <button type="button" className="remote-clear" aria-label={`Quitar ${name}`} onClick={onClear}><X aria-hidden="true" size={20} /></button>
    </div>
    {part && <TowerProductProvenance part={part} clock={clock} />}
  </div>;
}

export default function RemoteProductSelector({ category, value, onChange, onClear }: { category: TowerCategory; value: string | null; onChange: (id: string) => void; onClear?: () => void }) {
  const uid = useId(), [query, setQuery] = useState(""), [search, setSearch] = useState(""), [page, setPage] = useState(1);
  const [result, setResult] = useState<TowerCatalogPage | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(true);
  const [known, setKnown] = useState<TowerComponent | null>(null), [reopened, setReopened] = useState(false);
  const input = useRef<HTMLInputElement>(null), focusSearch = useRef(false);
  const collapsed = !!value && !reopened;
  useEffect(() => {
    const controller = new AbortController();
    remoteCatalog<TowerCatalogPage>(`?${new URLSearchParams({ category, q: search, page: String(page), page_size: "12", sort: "retail_first" })}`, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setResult(data); setError(""); } })
      .catch(() => { if (!controller.signal.aborted) { setResult(null); setError("No se pudo buscar en el catálogo. No se cambió la selección."); } })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [category, search, page]);
  useEffect(() => { if (!collapsed && focusSearch.current) { focusSearch.current = false; input.current?.focus(); } }, [collapsed]);
  function navigate(next: number) { setBusy(true); setPage(next); }
  function runSearch() { setBusy(true); setPage(1); setSearch(query.trim()); if (page === 1 && search === query.trim()) setBusy(false); }
  function pick(part: TowerComponent) { setKnown(part); setReopened(false); onChange(part.id); }
  function clear() { focusSearch.current = true; setKnown(null); if (onClear) onClear(); else setReopened(true); }
  const label = towerCategories[category];
  return <section aria-label={`Selector de ${label}`} aria-busy={busy} className="stack-sm remote-selector">
    {value && collapsed ? <ChosenProduct id={value} category={category} known={known} onClear={clear} /> : <>
      <label htmlFor={uid}>Buscar {label} en el catálogo</label>
      <div className="row wrap"><input ref={input} id={uid} maxLength={100} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); runSearch(); } }} /><button type="button" onClick={runSearch}>Buscar</button></div>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Buscando…</p>}
      {result && !busy && <><p>{result.total} resultados</p>
        <ul className="tower-product-results remote-results">{result.items.map(part => <li key={part.id}><button type="button" className="remote-pick" aria-pressed={value === part.id} onClick={() => pick(part)}>
          <TowerProductPhoto part={part} /><span className="remote-pick-text"><span className="remote-pick-name">{part.name}</span><PriceLine part={part} /></span></button></li>)}</ul>
        {!result.items.length && <p>No hay coincidencias. Podés declarar el modelo sin inventar atributos.</p>}
        <div className="row wrap"><button type="button" disabled={page <= 1} onClick={() => navigate(page - 1)}>Página anterior de productos</button><button type="button" disabled={page * result.page_size >= result.total} onClick={() => navigate(page + 1)}>Página siguiente de productos</button></div>
      </>}
    </>}
  </section>;
}
