import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BeginnerEntry from "../../components/beginner-entry";

describe("acciones de entrada38, sin contrato backend nuevo", () => {
  it("presenta ayuda como acción primaria y mantiene las otras dos rutas", () => {
    const html = renderToStaticMarkup(<BeginnerEntry />);
    expect(html).toContain('class="beginner-choice beginner-choice-primary"');
    expect(html).toContain('href="#hardware-guide-title"');
    expect(html).toContain("Recomendado si recién empezás");
    for (const text of ["Necesito ayuda", "Conozco mis componentes", "Quiero pegar una lista"]) expect(html).toContain(text);
    expect(html).toContain('href="/pcs"'); expect(html).toContain('href="/pcs/import"');
    expect(html.indexOf("Necesito ayuda")).toBeLessThan(html.indexOf("Conozco mis componentes"));
  });
  it("asocia privacidad a pegar y anclas a destinos enfocables", () => {
    const html = renderToStaticMarkup(<BeginnerEntry />);
    expect(html).toContain('aria-describedby="beginner-paste-note"');
    expect(html).toContain('id="beginner-paste-note"');
    expect(html).toContain("Pegá sólo hardware, sin datos personales.");
    expect(html).toContain('id="hardware-guide-title" tabindex="-1"');
    expect(html).toContain('id="beginner-start-title" tabindex="-1"');
    expect(html).toContain("Volver a las opciones para empezar");
  });
});
