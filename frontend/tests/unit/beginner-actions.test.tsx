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
  it("sin catálogo muestra el estado sin datos con acceso al catálogo y deja los cuatro caminos", () => {
    const html = renderToStaticMarkup(<BeginnerEntry sample={null} />);
    expect(html).toContain("No se pudo cargar una pieza");
    expect(html).toContain("No mostramos fotos ni precios inventados.");
    expect(html).toContain('href="/catalog"');
    for (const href of ['href="#hardware-guide-title"', 'href="/pcs"', 'href="/pcs/import"', 'href="/build"']) expect(html).toContain(href);
    expect(html).not.toContain("Ver ficha y procedencia");
  });
  it("presenta la promesa sin ofrecer armado automático ni formularios que crean o envían", () => {
    const html = renderToStaticMarkup(<BeginnerEntry />);
    expect(html).toContain("<h1");
    expect(html).toContain("Quiero mejorar mi PC");
    expect(html).toContain("Tu PC puede dar");
    expect(html).toContain("De tu PC a un plan que entendés");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("type=\"submit\"");
  });
});
