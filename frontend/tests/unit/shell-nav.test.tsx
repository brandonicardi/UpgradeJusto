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
      ["/pcs", "Mi PC"], ["/tower-plans", "Mi plan"], ["/chat", "Asistente"], ["/catalog", "Catálogo"],
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
    for (const h of ["/pcs", "/tower-plans", "/chat", "/catalog", "/account"]) expect(hrefs).toContain(h);
    expect(s).not.toContain('href="/admin"');
    expect(s).toMatch(/aria-current="page"[^>]*>Catálogo</);
    expect(s).toContain('aria-expanded="false"');
    expect(s).toContain("Precios guardados, no reservas");
    expect(s).toContain("<footer>");
  });
  it("trata / como Mi PC", () => {
    expect(html("/")).toMatch(/href="\/pcs"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/pcs"/);
  });
  it("no muestra navegación en un plan compartido", () => {
    const s = html("/shared-tower-plans/abc");
    expect(s).toContain('<main id="contenido"');
    expect(s).not.toContain("<nav");
    expect(s).not.toContain("<header");
    expect(s).not.toContain("skip-link");
  });
});
