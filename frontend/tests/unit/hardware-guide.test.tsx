import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HardwareGuide, { HardwareExample } from "../../components/hardware-guide";
import { hardwareGuideSources, hardwareTextExample } from "../../lib/hardware-guide";

describe("ayuda inicial independiente de contratos nuevos", () => {
  it("usa referencias oficiales estáticas sin ejecutar detección ni abrir programas", () => {
    const html = renderToStaticMarkup(<HardwareGuide />);
    for (const source of Object.values(hardwareGuideSources)) expect(html).toContain(source);
    expect(html).toContain("Configuración"); expect(html).toContain("Administrador de tareas");
    expect(html).toContain("msinfo32"); expect(html).toContain("No deduzcas esa cantidad");
    expect(html).toContain("No abras la fuente"); expect(html).toContain("no cambies la BIOS");
    expect(html).toContain("no significa que ese componente no exista");
    for (const forbidden of ["<script", "<iframe", "<img", "ms-settings:", "file://"]) expect(html).not.toContain(forbidden);
    expect(Object.values(hardwareGuideSources).every(source => new URL(source).protocol === "https:")).toBe(true);
    expect(Object.isFrozen(hardwareGuideSources)).toBe(true);
  });
  it("muestra sólo un ejemplo de hardware identificado, sin datos personales ni afirmación de compatibilidad", () => {
    const html = renderToStaticMarkup(<HardwareExample />);
    expect(html).toContain("no tu PC ni una configuración comprobada");
    expect(html).toContain("modelo por confirmar"); expect(html).toContain("2x8 GB DDR4");
    expect(hardwareTextExample).not.toMatch(/usuario|correo|contrase|serie|C:\\|fps|precio|@/i);
    expect(html).not.toContain("<textarea"); expect(html).not.toContain("<form");
    expect(html).not.toContain("<button");
  });
  it("admite guía reutilizada con IDs distintos y nombres accesibles", () => {
    const html = renderToStaticMarkup(<HardwareGuide id="unit-guide" />);
    expect(html).toContain('id="unit-guide"'); expect(html).toContain('aria-labelledby="unit-guide-title"');
    expect(html).toContain('id="unit-guide-title"'); expect(html).toContain("<summary>");
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
