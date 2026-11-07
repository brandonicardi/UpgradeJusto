"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { TowerCatalogPage } from "../lib/tower-catalog";
import type { Tower } from "../lib/towers";
import { cardPrice } from "../lib/catalog-offers";
import { displayImage } from "../lib/retail-presentation";
import { towerQueryString, type TowerCatalogQuery } from "../lib/catalog-tower-consumer";
import { catalogCategories, catalogTechnicalText, loadCatalogPCs, simulateCatalogPage } from "../lib/catalog-simulation";
import { IconoDeCategoria } from "./uj/part-card";
import { PriceTag, Verdict } from "./uj";
import { EmptyResults } from "../app/catalog/presentation";
export default function CatalogWorkbench({ data, query = { q: "", category: "", sort: "retail_first", page: 1, page_size: 12 } }: { data: TowerCatalogPage; query?: TowerCatalogQuery }) {
  const router = useRouter();
  const [pcs, setPCs] = useState<Tower[]>([]), [access, setAccess] = useState<"loading" | "guest" | "ready" | "error">("loading");
  const [selected, setSelected] = useState("");
  const [results, setResults] = useState<{ source: TowerCatalogPage; pc: string; values: Record<string, string> } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void loadCatalogPCs(controller.signal).then(result => { if (!controller.signal.aborted) { setPCs(result.pcs); setAccess(result.access); } });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController(), pc = pcs.find(pc => pc.id === selected);
    if (pc) void simulateCatalogPage(pc, data.items, controller.signal, values => setResults({ source: data, pc: selected, values }));
    return () => controller.abort();
  }, [selected, pcs, data]);
  const visible = results?.source === data && results.pc === selected ? results.values : {};
  return <>
    <section className="catalog-tools" aria-label="Buscar y filtrar">
      <form action="/catalog" method="get" className="catalog-search" role="search">
        <Search aria-hidden="true" size={20} /><input type="search" name="q" aria-label="Buscar componentes" maxLength={100} defaultValue={query.q} placeholder="Por ejemplo: memoria, 4060, disco de 1 TB" />
        {query.category && <input type="hidden" name="category" value={query.category} />}<input type="hidden" name="sort" value={query.sort} /><input type="hidden" name="page" value="1" /><input type="hidden" name="page_size" value={query.page_size} />
      </form>
      <nav className="catalog-chips" aria-label="Tipo de componente">{[["", "Todas"], ...Object.entries(catalogCategories)].map(([category, label]) => <Link key={category} href={`/catalog?${towerQueryString({ ...query, category }, 1)}`} aria-current={query.category === category ? "page" : undefined}>{label}</Link>)}</nav>
      <div className="catalog-bar">
        <label>¿Encaja en…? <select value={selected} onChange={event => setSelected(event.target.value)}><option value="">No mostrar</option>{pcs.map(pc => <option key={pc.id} value={pc.id}>{pc.name}</option>)}</select></label>
        <span className="results-count" role="status">{data.total} {data.total === 1 ? "componente" : "componentes"}</span>
        <label>Ordenar <select value={query.sort} onChange={event => router.push(`/catalog?${towerQueryString({ ...query, sort: event.target.value as TowerCatalogQuery["sort"] }, 1)}`)}><option value="retail_first">Con fotos y precios primero</option><option value="id">Orden habitual</option><option value="price_asc">Más baratas primero</option><option value="price_desc">Más caras primero</option></select></label>
      </div>
      {access === "guest" && <Link className="catalog-session-help" href="/account">Entrá para ver si los componentes encajan en tu PC</Link>}
      {access === "ready" && pcs.length === 0 && <Link className="catalog-session-help" href="/pcs">Agregá una PC para ver si los componentes encajan</Link>}
      {access === "error" && <Link className="catalog-session-help" href="/pcs">No pudimos cargar tus PCs. Revisá tus PCs para volver a intentar.</Link>}
    </section>
    {data.items.length ? <section className="catalog-piece-grid" aria-label="Resultados">{data.items.map(part => {
      const photo = displayImage(part), category = catalogCategories[part.category];
      return <article key={part.id} className="catalog-piece" data-component-id={part.id}><Link href={`/catalog/${encodeURIComponent(part.id)}`}>
        <div className="catalog-piece-photo">{photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : <IconoDeCategoria categoria={category} tamano="size-11" />}</div>
        <div><div className="catalog-piece-kind">{category}</div><h2>{part.name}</h2><p className="catalog-piece-tech">{catalogTechnicalText(part)}</p></div>
        <div className="catalog-piece-foot"><PriceTag {...cardPrice(part)} compacto catalogo />{visible[part.id] && <Verdict estado={visible[part.id]} />}</div>
      </Link></article>;
    })}</section> : <EmptyResults filtered={Boolean(query.q || query.category) && data.total === 0} firstPageHref={`/catalog?${towerQueryString(query, 1)}`} />}
  </>;
}
