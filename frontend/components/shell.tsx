"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createRoleProbe, sessionChangedEvent } from "../lib/session-role";

const routes = [["/pcs", "1 · Mi PC"], ["/catalog", "2 · Catálogo"], ["/tower-plans", "3 · Propuesta"]] as const;
export default function Shell({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [admin, setAdmin] = useState<{ route: string; allowed: boolean } | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/shared-tower-plans/")) return;
    const probe = createRoleProbe(allowed => setAdmin({ route: pathname, allowed }));
    const changed = () => { probe.invalidate(); void probe.refresh(); };
    window.addEventListener(sessionChangedEvent, changed);
    void probe.refresh();
    return () => { window.removeEventListener(sessionChangedEvent, changed); probe.dispose(); };
  }, [pathname]);
  if (pathname.startsWith("/shared-tower-plans/")) return <main id="contenido" tabIndex={-1}>{children}</main>;
  return <div className={pathname === "/" ? "app-shell v0-integrated entry-shell" : "app-shell v0-integrated"}>
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    <header className="sidebar">
      <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Upgrade<span className="brand-accent">Justo</span></span></Link>
      <nav id="principal" aria-label="Principal" className={expanded ? "nav-links is-open" : "nav-links"} onKeyDown={event => { if (event.key === "Escape") { setExpanded(false); menuButton.current?.focus(); } }}>
        {routes.map(([href, label]) => <Link key={href} href={href} aria-current={(pathname === href || pathname.startsWith(`${href}/`) || (href === "/pcs" && (pathname === "/" || pathname === "/build")) || (href === "/tower-plans" && (pathname === "/plans" || pathname.startsWith("/plans/")))) ? "page" : undefined}>{label}</Link>)}
      </nav>
      <button ref={menuButton} className="mobile-menu secondary" aria-label="Menú" aria-controls="secundaria" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} onKeyDown={event => { if (event.key === "Escape") setExpanded(false); }}>☰</button>
      <nav id="secundaria" aria-label="Tu espacio" className={expanded ? "v0-utility is-open" : "v0-utility"} onKeyDown={event => { if (event.key === "Escape") { setExpanded(false); menuButton.current?.focus(); } }}><Link href="/chat" onClick={() => setExpanded(false)}>Asistente</Link><Link href="/account" onClick={() => setExpanded(false)}>Tu cuenta</Link>{admin?.route === pathname && admin.allowed && <Link href="/admin" onClick={() => setExpanded(false)}>Administrar catálogo</Link>}</nav>
    </header>
    <div className="app-content"><main id="contenido" tabIndex={-1}>{(pathname === "/" || pathname === "/build" || pathname.startsWith("/pcs") || pathname.startsWith("/catalog") || pathname.startsWith("/tower-plans")) && <p className="v0-reference-banner"><span aria-hidden="true">◇</span><span>Precios guardados, no reservas. Comprobá compatibilidad y disponibilidad antes de comprar.</span></p>}{children}</main><footer>UpgradeJusto · Tu próxima mejora, con información clara.<br />Comprobaciones básicas y precios históricos; verificá montaje y disponibilidad antes de comprar.</footer></div>
  </div>;
}
