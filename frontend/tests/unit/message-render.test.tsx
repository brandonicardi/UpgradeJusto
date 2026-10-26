import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MessageRender from "../../components/message-render";
import { inlineParts, messageBlocks, messageTextFragments } from "../../lib/message-presentation";

describe("mensajes presentables sin HTML ni recursos del modelo", () => {
  it("convierte tabla con negritas en términos y descripciones sin barras crudas", () => {
    const content = "Antes de instalar:\n\n| Tema | Qué comprobar |\n| ---- | ---- |\n| **Soporte de RAM** | Capacidad y ranuras |\n| BIOS | Revisá la versión documentada |";
    const html = renderToStaticMarkup(<MessageRender content={content} />);
    expect(html).toContain("<p>Antes de instalar:</p>");
    expect(html).toContain("<dt>Tema</dt>"); expect(html).toContain("<dt>Qué comprobar</dt>");
    expect(html).toContain("<strong>Soporte de RAM</strong>"); expect(html).toContain("Capacidad y ranuras");
    expect(html.match(/<dl\b/g)).toHaveLength(2);
    expect(html).not.toContain("| Tema |"); expect(html).not.toContain("----"); expect(html).not.toContain("**");
    expect(messageTextFragments(content)).toEqual(["Antes de instalar:", "Tema", "Qué comprobar", "Soporte de RAM", "Capacidad y ranuras", "BIOS", "Revisá la versión documentada"]);
  });
  it("mantiene párrafos, listas y todos los datos incluso filas desiguales", () => {
    const html = renderToStaticMarkup(<MessageRender content={"Primer **párrafo**.\n\n- Socket\n- BIOS\n\n3. Confirmar\n4. Instalar\n\n| Dato | Valor |\n| --- | --- |\n| RAM | 32 GB | Otra condición |\n| Fuente |"} />);
    for (const text of ["<strong>párrafo</strong>", "<ul>", '<ol start="3">', "Socket", "BIOS", "Confirmar", "Instalar", "32 GB", "Otra condición", "Detalle 3", "Sin dato en esta fila"]) expect(html).toContain(text);
    expect(messageBlocks("Texto sin cambios")).toEqual([{ kind: "paragraph", text: "Texto sin cambios" }]);
  });
  it("escapa HTML/XSS y no crea autolinks ni imágenes remotas", () => {
    const content = '**<script>alert(1)</script>**\n\n<img src="https://example.test/x" onerror="alert(2)">\n\n[enlace](javascript:alert(3)) ![foto](https://example.test/image.png)';
    const html = renderToStaticMarkup(<MessageRender content={content} />);
    expect(html).toContain("&lt;script&gt;"); expect(html).toContain("&lt;img");
    for (const forbidden of ["<script", "<img", "<a ", "<iframe"]) expect(html).not.toContain(forbidden);
    expect(messageTextFragments(content).join(" ")).toContain("[enlace](javascript:alert(3))");
    expect(messageTextFragments(content).join(" ")).toContain("![foto](https://example.test/image.png)");
  });
  it("preserva marcado no soportado, cercas e información de streaming incompleta", () => {
    const content = "### Encabezado no interpretado\n\n```text\n**literal** <tag>\n```\n\n**";
    const html = renderToStaticMarkup(<MessageRender content={content} />);
    expect(html).toContain("### Encabezado no interpretado"); expect(html).toContain("```text");
    expect(html).toContain("**literal** &lt;tag&gt;"); expect(html).toContain("<p>**</p>");
    expect(inlineParts("**")).toEqual([{ text: "**", bold: false }]);
  });
});
