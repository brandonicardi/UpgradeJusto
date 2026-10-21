import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Catálogo | UpgradeJusto", description: "Componentes documentados para explorar tu próxima mejora." };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>
    <a href="#contenido" className="sr-only focus:not-sr-only">Saltar al contenido</a>
    <header className="border-b border-slate-300 bg-white px-6 py-5"><div className="mx-auto max-w-6xl"><Link href="/catalog" className="text-xl font-bold">UpgradeJusto</Link><p className="mt-1 text-sm">Explorá componentes con evidencia, sin suposiciones.</p></div></header>
    <main id="contenido" className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    <footer className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-600">Catálogo de consulta. No evalúa compatibilidad ni garantiza disponibilidad.</footer>
  </body></html>;
}
