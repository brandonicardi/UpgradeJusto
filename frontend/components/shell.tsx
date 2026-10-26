"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createRoleProbe, sessionChangedEvent } from "../lib/session-role";

const routes = [["/pcs", "Tu próxima mejora", "↗"], ["/catalog", "Catálogo", "▦"], ["/plans", "Mis planes", "≡"], ["/chat", "Asistente", "◇"], ["/account", "Tu cuenta", "○"]] as const;
export default function Shell({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [admin, setAdmin] = useState<{ route: string; allowed: boolean } | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const probe = createRoleProbe(allowed => setAdmin({ route: pathname, allowed }));
    const changed = () => { probe.invalidate(); void probe.refresh(); };
    window.addEventListener(sessionChangedEvent, changed);
    void probe.refresh();
    return () => { window.removeEventListener(sessionChangedEvent, changed); probe.dispose(); };
  }, [pathname]);
  return <div className="app-shell">
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    <aside className="sidebar">
      <Link className="brand" href="/pcs"><span className="brand-mark" aria-hidden="true">U<span>↗</span></span>UpgradeJusto</Link>
      <button ref={menuButton} className="mobile-menu secondary" aria-controls="principal" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} onKeyDown={event => { if (event.key === "Escape") setExpanded(false); }}>Menú <span aria-hidden="true">☰</span></button>
      <nav id="principal" aria-label="Principal" className={expanded ? "nav-links is-open" : "nav-links"} onKeyDown={event => { if (event.key === "Escape") { setExpanded(false); menuButton.current?.focus(); } }}>
        {routes.map(([href, label, icon]) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} onClick={() => setExpanded(false)}><span aria-hidden="true">{icon}</span>{label}</Link>)}
        {admin?.route === pathname && admin.allowed && <Link href="/admin" onClick={() => setExpanded(false)} aria-current={pathname.startsWith("/admin") ? "page" : undefined}>Administrar catálogo</Link>}
      </nav>
      <p className="sidebar-note">Decidí con evidencia.<br />Mejorá lo que ya tenés.</p>
    </aside>
    <div className="app-content"><main id="contenido">{children}</main><footer>UpgradeJusto · Tu próxima mejora, con información clara.<br />Comprobaciones básicas y precios históricos; verificá montaje y disponibilidad antes de comprar.</footer></div>
  </div>;
}
