import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogError, catalogFetch, categories, type Component } from "../../../lib/catalog";
import { Evidence, Failure } from "../presentation";

export const dynamic = "force-dynamic";

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let component: Component;
  try { component = await catalogFetch<Component>(`/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof CatalogError && error.status === 404) notFound(); return <Failure />; }
  return <>
    <Link href="/catalog">Volver al catálogo</Link>
    <p className="mt-6 text-sm">{categories[component.category]} · {component.id}</p>
    <h1 className="mt-2 text-3xl font-bold">{component.name}</h1>
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <div className="panel"><div className="placeholder">Imagen no disponible</div><Evidence component={component} /></div>
      <section className="panel"><h2 className="text-xl font-bold">Atributos documentados</h2><p className="my-3 text-sm">Desconocido no significa cero, falso ni compatible. No se realiza una evaluación de compatibilidad.</p>
        {Object.keys(component.attributes).length ? <dl className="divide-y divide-slate-200">{Object.entries(component.attributes).map(([key, value]) => <div key={key} className="py-3"><dt className="break-words font-bold">{key}</dt><dd className="break-words">{value === null ? "Desconocido (sin evidencia documentada)" : value}</dd></div>)}</dl> : <p>Atributos desconocidos: sin datos documentados.</p>}
      </section>
    </div>
  </>;
}
