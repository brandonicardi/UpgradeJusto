"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createRoleProbe, sessionChangedEvent } from "../lib/session-role";
import { isCurrent, isSharedPath, mainRoutes, utilityRoutes } from "../lib/shell-nav";
import { AssistantProvider } from "./assistant-provider";
import AssistantPanel from "./assistant-panel";

export default function Shell({ children }: { children: React.ReactNode }) {
  return <AssistantProvider><ShellContent>{children}</ShellContent><AssistantPanel /></AssistantProvider>;
}
function ShellContent({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [admin, setAdmin] = useState<{ route: string; allowed: boolean } | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const catalogHeader = pathname === "/catalog" || pathname.startsWith("/catalog/");
  useEffect(() => {
    if (isSharedPath(pathname)) return;
    const probe = createRoleProbe(allowed => setAdmin({ route: pathname, allowed }));
    const changed = () => { probe.invalidate(); void probe.refresh(); };
    window.addEventListener(sessionChangedEvent, changed);
    void probe.refresh();
    return () => { window.removeEventListener(sessionChangedEvent, changed); probe.dispose(); };
  }, [pathname]);
  if (isSharedPath(pathname)) return <main id="contenido" tabIndex={-1}>{children}</main>;
  return <div className={pathname === "/" ? "app-shell v0-integrated entry-shell" : catalogHeader ? "app-shell v0-integrated catalog-shell" : "app-shell v0-integrated"}>
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    <header className="sidebar">
      <Link className="brand" href="/">UpgradeJusto</Link>
      <nav id="principal" aria-label="Principal" className={expanded ? "nav-links is-open" : "nav-links"} onKeyDown={event => { if (event.key === "Escape") { setExpanded(false); menuButton.current?.focus(); } }}>
        {(catalogHeader ? [["/pcs", "Mi PC"], ["/", "Lo que te conviene"], ["/tower-plans", "Mi plan"], ["/catalog", "Catálogo"]] : mainRoutes).map(([href, label]) => <Link key={href} href={href} aria-current={isCurrent(pathname, href) ? "page" : undefined}>{label}</Link>)}
      </nav>
      <button ref={menuButton} className="mobile-menu secondary" aria-label="Menú" aria-controls="secundaria" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} onKeyDown={event => { if (event.key === "Escape") setExpanded(false); }}>☰</button>
      <nav id="secundaria" aria-label="Tu espacio" className={expanded ? "v0-utility is-open" : "v0-utility"} onKeyDown={event => { if (event.key === "Escape") { setExpanded(false); menuButton.current?.focus(); } }}>{utilityRoutes(admin?.route === pathname && admin.allowed).map(([href, label]) => <Link key={href} href={href} aria-current={isCurrent(pathname, href) ? "page" : undefined} onClick={() => setExpanded(false)}>{label}</Link>)}</nav>
    </header>
    <div className="app-content"><main id="contenido" tabIndex={-1}>{!catalogHeader && (pathname === "/" || pathname === "/build" || pathname.startsWith("/pcs") || pathname.startsWith("/catalog") || pathname.startsWith("/tower-plans")) && <p className="v0-reference-banner"><span aria-hidden="true">◇</span><span>Precios guardados, no reservas. Comprobá compatibilidad y disponibilidad antes de comprar.</span></p>}{children}</main>{!catalogHeader && <footer>UpgradeJusto · Tu próxima mejora, con información clara.<br />Comprobaciones básicas y precios históricos; verificá montaje y disponibilidad antes de comprar.</footer>}</div>
  </div>;
}
