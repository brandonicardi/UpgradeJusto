import Link from "next/link";
import { catalogTowerPage, parseTowerCatalogQuery, towerQueryString, type TowerCatalogQuery } from "../../lib/catalog-tower-consumer";
import type { TowerCatalogPage } from "../../lib/tower-catalog";
import { Failure } from "./presentation";
import CatalogWorkbench from "../../components/catalog-workbench";
import "./catalog.css";
export const dynamic = "force-dynamic";
export default async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  let query: TowerCatalogQuery;
  try { query = parseTowerCatalogQuery(await searchParams); } catch { return <><h1>Todos los componentes</h1><Failure invalid /></>; }
  let data: TowerCatalogPage | null = null;
  try { data = await catalogTowerPage(`?${towerQueryString(query)}`); } catch { /* Sin datos de ejemplo. */ }
  return <div className="catalog-screen">
    <header className="catalog-head"><h1>Todos los componentes</h1><p>Buscá por lo que necesitás o por el nombre. Si elegís tu PC, te mostramos al lado de cada una si encaja.</p></header>
    {data ? <CatalogWorkbench key={towerQueryString(query)} data={data} query={query} /> : <Failure retryHref={`/catalog?${towerQueryString(query)}`} />}
    {data && <nav aria-label="Paginación" className="catalog-pagination">
      {data.page > 1 && <Link href={`/catalog?${towerQueryString(query, data.page - 1)}`}>Página anterior</Link>}
      <span>Página {data.page}</span>
      {data.page < 10000 && data.page * data.page_size < data.total && <Link href={`/catalog?${towerQueryString(query, data.page + 1)}`}>Página siguiente</Link>}
    </nav>}
    <footer className="catalog-foot"><span>Precios en pesos de tiendas argentinas, con la fecha en que los vimos. Los componentes sin precio reciente quedan al final con el orden de fotos y precios. Precios guardados, no reservas: comprobá disponibilidad antes de comprar.</span><Link href="/">¿No sabés qué buscar? Mirá lo que te conviene</Link></footer>
  </div>;
}
