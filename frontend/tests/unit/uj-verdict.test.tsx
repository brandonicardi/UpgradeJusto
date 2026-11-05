import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Verdict } from "../../components/uj/verdict";

const texto = (estado: string | null | undefined) =>
  renderToStaticMarkup(<Verdict estado={estado} />).replace(/<[^>]+>/g, "").trim();

describe("Verdict", () => {
  it("traduce los tres estados del motor", () => {
    expect(texto("compatible")).toBe("Encaja");
    expect(texto("requiere_verificacion")).toBe("Falta un dato");
    expect(texto("incompatible")).toBe("No encaja");
  });

  it("junta color, ícono y palabra en cada estado", () => {
    const encaja = renderToStaticMarkup(<Verdict estado="compatible" />);
    expect(encaja).toContain("bg-encaja-fondo");
    expect(encaja).toContain("text-encaja");
    expect(encaja).toContain("lucide-check");
    const revisar = renderToStaticMarkup(<Verdict estado="requiere_verificacion" />);
    expect(revisar).toContain("bg-revisar-fondo");
    expect(revisar).toContain("lucide-circle-question-mark");
    const no = renderToStaticMarkup(<Verdict estado="incompatible" />);
    expect(no).toContain("bg-no-encaja-fondo");
    expect(no).toContain("lucide-x");
  });

  it("el ícono es decorativo: la palabra ya dice el estado", () => {
    expect(renderToStaticMarkup(<Verdict estado="compatible" />)).toContain('aria-hidden="true"');
  });

  it.each([null, undefined, "", " ", "otra-cosa", "COMPATIBLE", "compatible ", "Compatible", "ok", "true", "constructor", "toString"])(
    "un valor ausente o raro (%j) dice «Falta un dato» y nunca «Encaja»",
    (valor) => {
      const html = renderToStaticMarkup(<Verdict estado={valor as string | null | undefined} />);
      expect(texto(valor as string | null | undefined)).toBe("Falta un dato");
      expect(html).not.toContain("Encaja");
      expect(html).not.toContain("bg-encaja-fondo");
    },
  );
});
