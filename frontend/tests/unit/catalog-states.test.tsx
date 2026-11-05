import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmptyResults, Failure } from "../../app/catalog/presentation";

describe("estados del catálogo", () => {
  it("la consulta vacía con filtros ofrece limpiar y no muestra tarjetas", () => {
    const html = renderToStaticMarkup(<EmptyResults filtered firstPageHref="/catalog?page=1" />);
    expect(html).toContain("No encontramos piezas con esos filtros");
    expect(html).toContain('href="/catalog"');
    expect(html).toContain("Limpiar filtros");
    expect(html).not.toContain("<article");
  });
  it("una página vacía sin filtros vuelve a la primera", () => {
    const html = renderToStaticMarkup(<EmptyResults filtered={false} firstPageHref="/catalog?q=x&amp;page=1" />);
    expect(html).toContain("Ir a la primera página");
  });
  it("la consulta fallida ofrece reintentar con los mismos filtros y no inventa datos", () => {
    const html = renderToStaticMarkup(<Failure retryHref="/catalog?category=fan&amp;page=2" />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Probar de nuevo");
    expect(html).toContain('href="/catalog?category=fan&amp;page=2"');
    expect(html).toContain('href="/catalog"');
    expect(html).not.toContain("<article");
  });
});
