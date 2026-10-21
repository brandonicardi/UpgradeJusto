import Link from "next/link";
import { catalogFetch, categories, parseQuery, queryString, type CatalogPage, type Query } from "../../lib/catalog";
import { Card, Failure } from "./presentation";

export const dynamic = "force-dynamic";

export default async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  let query: Query;
  try { query = parseQuery(await searchParams); } catch { return <><h1 className="text-3xl font-bold">Catálogo de componentes</h1><Failure invalid /></>; }
  let data: CatalogPage | null = null;
  try { data = await catalogFetch<CatalogPage>(`?${queryString(query)}`); } catch { /* Accessible failure, no fallback dataset. */ }
  return <>
    <h1 className="text-3xl font-bold">Catálogo de componentes</h1>
    <p className="mt-3 mb-6">Datos curados para explorar. Los atributos desconocidos no confirman compatibilidad.</p>
    <form action="/catalog" method="get" className="panel mb-6 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros del catálogo">
      <label className="space-y-2"><span className="block font-bold">Nombre</span><input name="q" maxLength={100} defaultValue={query.q} placeholder="Buscar por nombre" /></label>
      <div className="space-y-2"><label htmlFor="category" className="block font-bold">Categoría</label><select id="category" name="category" defaultValue={query.category}><option value="">Todas las categorías</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <label className="space-y-2"><span className="block font-bold">Por página</span><select name="page_size" defaultValue={String(query.page_size)}>{[...new Set([6, 12, 24, 50, query.page_size])].sort((a,b) => a-b).map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <div className="flex flex-wrap items-center gap-4"><button type="submit">Aplicar filtros</button><Link href="/catalog">Limpiar</Link></div>
    </form>
    {!data ? <Failure /> : <>
      <p role="status" className="mb-5">{data.total} componentes · Página {data.page} · Dataset: {data.dataset_version}</p>
      {data.items.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{data.items.map(component => <Card key={component.id} component={component} />)}</div> : <section className="panel"><h2 className="text-xl font-bold">No hay componentes en esta página</h2><p className="mt-2">Cambiá los filtros o volvé a la primera página.</p><Link href={`/catalog?${queryString(query, 1)}`}>Ir a la primera página</Link></section>}
      <nav aria-label="Paginación" className="mt-6 flex gap-6">
        {data.page > 1 && <Link href={`/catalog?${queryString(query, data.page - 1)}`}>Página anterior</Link>}
        {data.page < 10000 && data.page * data.page_size < data.total && <Link href={`/catalog?${queryString(query, data.page + 1)}`}>Página siguiente</Link>}
      </nav>
    </>}
  </>;
}
