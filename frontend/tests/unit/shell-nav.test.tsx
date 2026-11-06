import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { accountRoute, adminRoute, isCurrent, isSharedPath, mainRoutes, utilityRoutes } from "../../lib/shell-nav";

const ruta = vi.hoisted(() => ({ actual: "/pcs" }));
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }));
import Shell from "../../components/shell";

const html = (pathname: string) => { ruta.actual = pathname; return renderToStaticMarkup(<Shell><p>contenido</p></Shell>); };
const enlaces = (s: string) => [...s.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map(m => [m[1], m[2]]);

describe("navegación del encabezado", () => {
  it("lista los destinos en el orden pedido", () => {
    expect(mainRoutes.map(([href, label]) => [href, label])).toEqual([
      ["/pcs", "Mi PC"], ["/conviene", "Lo que te conviene"], ["/tower-plans", "Mi plan"], ["/catalog", "Catálogo"],
    ]);
    expect(accountRoute).toEqual(["/account", "Tu cuenta"]);
  });
  it("muestra Administración solo con rol permitido", () => {
    expect(utilityRoutes(false)).toEqual([accountRoute]);
    expect(utilityRoutes(true)).toEqual([accountRoute, adminRoute]);
    expect(adminRoute[0]).toBe("/admin");
  });
  it("marca la página actual, con los alias históricos", () => {
    expect(isCurrent("/pcs", "/pcs")).toBe(true);
    expect(isCurrent("/", "/pcs")).toBe(true);
    expect(isCurrent("/", "/conviene")).toBe(false);
    expect(isCurrent("/pcs", "/conviene")).toBe(false);
    expect(isCurrent("/conviene", "/conviene")).toBe(true);
    expect(isCurrent("/conviene/paso-2", "/conviene")).toBe(true);
    expect(isCurrent("/conviene", "/pcs")).toBe(false);
    expect(isCurrent("/build", "/pcs")).toBe(true);
    expect(isCurrent("/plans", "/tower-plans")).toBe(true);
    expect(isCurrent("/plans/3", "/tower-plans")).toBe(true);
    expect(isCurrent("/catalog/12", "/catalog")).toBe(true);
    expect(isCurrent("/catalogo", "/catalog")).toBe(false);
    expect(isCurrent("/chat", "/pcs")).toBe(false);
  });
  it("detecta los planes compartidos", () => {
    expect(isSharedPath("/shared-tower-plans/x")).toBe(true);
    expect(isSharedPath("/tower-plans")).toBe(false);
  });
});

describe("Shell", () => {
  it("renderiza logo, los destinos y el enlace activo", () => {
    const s = html("/catalog");
    expect(s).toContain("UpgradeJusto");
    expect(s).toContain('class="skip-link"');
    const hrefs = enlaces(s).map(e => e[0]);
    for (const h of ["/pcs", "/conviene", "/tower-plans", "/", "/catalog", "/account"]) expect(hrefs).toContain(h);
    expect(s).not.toContain('href="/admin"');
    expect(s).toMatch(/aria-current="page"[^>]*>Catálogo</);
    expect(s).toContain('aria-expanded="false"');
    expect(s).not.toContain("Precios guardados, no reservas");
    expect(s).not.toContain("v0-reference-banner");
    expect(s).not.toContain("<footer");
    const detail = html("/catalog/pieza");
    expect(detail).toContain("catalog-shell");
    expect(detail).not.toContain("<footer");
    expect(enlaces(detail).map(e => e[0])).toEqual(hrefs);
    expect(detail).toMatch(/aria-current="page"[^>]*>Catálogo</);
    expect(html("/catalogo")).not.toContain("catalog-shell");
  });
  it("usa el mismo encabezado en todas las pantallas, con «Tu cuenta» a mano", () => {
    const nav = (s: string) => enlaces(s).map(e => e[0]);
    const base = nav(html("/catalog"));
    for (const ruta of ["/pcs", "/tower-plans", "/chat", "/account", "/catalog/pieza"]) {
      const s = html(ruta);
      expect(nav(s)).toEqual(base);
      expect(s).toContain(">Lo que te conviene<");
      expect(s).toContain(">Tu cuenta<");
      expect(s).not.toContain("v0-reference-banner");
    }
  });
  it("trata / como Mi PC y marca «Lo que te conviene» en su propia ruta", () => {
    expect(html("/")).toMatch(/href="\/pcs"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/pcs"/);
    expect(html("/conviene")).toMatch(/href="\/conviene"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/conviene"/);
    expect(html("/conviene")).not.toMatch(/href="\/pcs"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/pcs"/);
  });
  it("no muestra navegación en un plan compartido", () => {
    const s = html("/shared-tower-plans/abc");
    expect(s).toContain('<main id="contenido"');
    expect(s).not.toContain("<nav");
    expect(s).not.toContain("<header");
    expect(s).not.toContain("skip-link");
  });
});
