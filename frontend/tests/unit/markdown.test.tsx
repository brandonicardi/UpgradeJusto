import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "../../components/markdown";

describe("Markdown de las respuestas del asistente", () => {
  it("convierte negrita y listas con guiones", () => {
    const html = renderToStaticMarkup(<Markdown content={"Esta pieza **Encaja**.\n\n- Socket\n- BIOS"} />);
    expect(html).toContain("<strong>Encaja</strong>");
    expect(html).toContain("<ul>"); expect(html).toContain("<li>Socket</li>"); expect(html).toContain("<li>BIOS</li>");
    expect(html).not.toContain("**");
  });
  it("abre los enlaces con rel seguro", () => {
    const html = renderToStaticMarkup(<Markdown content="Mirá [la ficha](https://example.test/ficha)." />);
    expect(html).toContain('href="https://example.test/ficha"');
    expect(html).toContain('rel="noopener noreferrer"'); expect(html).toContain('target="_blank"');
  });
  it("escapa el HTML crudo y no ejecuta scripts", () => {
    const html = renderToStaticMarkup(<Markdown content={"<script>alert(1)</script>\n\nTexto"} />);
    expect(html).not.toContain("<script"); expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
  it("renderiza una tabla de dos columnas con scroll horizontal", () => {
    const html = renderToStaticMarkup(<Markdown content={"| Pieza | Estado |\n| --- | --- |\n| Socket | Encaja |"} />);
    expect(html).toContain('<div class="table-scroll"><table');
    expect(html).toContain("<th>Pieza</th>"); expect(html).toContain("<th>Estado</th>");
    expect(html).toContain("<td>Socket</td>"); expect(html).toContain("<td>Encaja</td>");
  });
  it("descarta enlaces javascript: e imágenes remotas", () => {
    const html = renderToStaticMarkup(<Markdown content={"[malo](javascript:alert(3)) ![foto](https://example.test/x.png)"} />);
    expect(html).not.toContain("javascript:"); expect(html).not.toContain("<img");
  });
});
