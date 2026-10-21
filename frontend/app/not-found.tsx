import Link from "next/link";
export default function NotFound() { return <section><h1 className="text-3xl font-bold">Componente no encontrado</h1><p className="my-4">No existe un componente con ese identificador.</p><Link href="/catalog">Volver al catálogo</Link></section>; }
