import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Plus } from "lucide-react";
import { Button } from "../../components/uj/button";
import { Field } from "../../components/uj/field";
import { Notice } from "../../components/uj/notice";
import { ChatBubble, ChatComposer, ChatSuggestions } from "../../components/uj/chat-bubble";

const html = (nodo: React.ReactElement) => renderToStaticMarkup(nodo);
const sinEtiquetas = (s: string) => s.replace(/<[^>]+>/g, "").trim();
const clasesDe = (s: string) => /class="([^"]*)"/.exec(s)?.[1] ?? "";

describe("Button", () => {
  it("distingue los tres pesos", () => {
    const principal = clasesDe(html(<Button peso="principal">Ver qué me conviene</Button>));
    const secundario = clasesDe(html(<Button peso="secundario">Guardar mi PC</Button>));
    const quieto = clasesDe(html(<Button peso="quieto">Prefiero mirar el catálogo</Button>));
    expect(principal).toContain("bg-pino");
    expect(principal).toContain("text-sobre-pino");
    expect(secundario).toContain("bg-papel-alto");
    expect(secundario).toContain("border-linea-fuerte");
    expect(quieto).toContain("bg-transparent");
    expect(quieto).toContain("text-pino");
    expect(quieto).toContain("underline");
  });

  it("mide 48px y es una píldora; chico mide 40px", () => {
    const normal = clasesDe(html(<Button peso="principal">Seguir</Button>));
    const chico = clasesDe(html(<Button peso="principal" chico>Seguir</Button>));
    expect(normal).toContain("min-h-12");
    expect(normal).toContain("rounded-pill");
    expect(chico).toContain("min-h-10");
    expect(chico).not.toContain("min-h-12");
  });

  it("fija sus propios mínimos y relleno en las tres variantes y en chico, sin depender del botón global", () => {
    for (const peso of ["principal", "secundario", "quieto"] as const) {
      for (const chico of [false, true]) {
        const c = clasesDe(html(<Button peso={peso} chico={chico}>Ok</Button>)).split(" ");
        expect(c.some((x) => /^min-h-\d+$/.test(x))).toBe(true);
        expect(c.some((x) => /^px-/.test(x))).toBe(true);
        expect(c.some((x) => /^py-/.test(x))).toBe(true);
        expect(c.some((x) => /^bg-/.test(x))).toBe(true);
        expect(c.some((x) => /^text-(sobre-pino|tinta|pino)$/.test(x))).toBe(true);
        expect(c.some((x) => /^border/.test(x))).toBe(true);
        expect(c).toContain("rounded-pill");
        expect(c.some((x) => x.endsWith("!"))).toBe(false);
      }
    }
  });

  it("es type=button por defecto", () => {
    expect(html(<Button peso="principal">Seguir</Button>)).toContain('type="button"');
  });

  it("deshabilitado con motivo muestra ese texto en lugar de la acción", () => {
    const h = html(
      <Button peso="principal" disabled motivo="Elegí un objetivo primero">
        Continuar
      </Button>,
    );
    expect(h).toMatch(/<button[^>]*\sdisabled(=|\s|>)/);
    expect(sinEtiquetas(h)).toBe("Elegí un objetivo primero");
    expect(h).not.toContain("Continuar");
  });

  it("deshabilitado sin motivo conserva su texto", () => {
    const h = html(
      <Button peso="secundario" disabled>
        Continuar
      </Button>,
    );
    expect(h).toMatch(/<button[^>]*\sdisabled(=|\s|>)/);
    expect(sinEtiquetas(h)).toBe("Continuar");
  });

  it("el motivo solo reemplaza el texto si está deshabilitado", () => {
    const h = html(
      <Button peso="principal" motivo="Elegí un objetivo primero">
        Continuar
      </Button>,
    );
    expect(h).not.toMatch(/<button[^>]*\sdisabled(=|\s|>)/);
    expect(sinEtiquetas(h)).toBe("Continuar");
  });

  it("pone el ícono a la derecha, después del texto", () => {
    const h = html(
      <Button peso="principal" icono={<Plus />}>
        Sumar pieza
      </Button>,
    );
    expect(h.indexOf("<svg")).toBeGreaterThan(-1);
    expect(h.indexOf("Sumar pieza")).toBeLessThan(h.indexOf("<svg"));
  });
});

describe("Field", () => {
  it("muestra la etiqueta siempre, asociada al campo", () => {
    const h = html(<Field etiqueta="¿Cómo se llama tu PC?" placeholder="Ej.: PC del living" />);
    const id = /<input[^>]*id="([^"]+)"/.exec(h)?.[1];
    expect(id).toBeTruthy();
    expect(h).toContain(`<label`);
    expect(h).toContain(`for="${id}"`);
    expect(h).toContain("¿Cómo se llama tu PC?");
    expect(h).not.toContain("aria-describedby");
    expect(h).not.toContain("aria-invalid");
  });

  it("asocia la ayuda al campo", () => {
    const h = html(<Field etiqueta="Nombre" ayuda="Es solo para que la reconozcas" />);
    const describedby = /aria-describedby="([^"]+)"/.exec(h)?.[1];
    expect(describedby).toBeTruthy();
    expect(h).toContain(`id="${describedby}"`);
    expect(h).toContain("Es solo para que la reconozcas");
  });

  it("con error apunta aria-describedby a un id existente, y marca el campo inválido", () => {
    const h = html(<Field etiqueta="Nombre" ayuda="Para reconocerla" error="Escribí un nombre de hasta 40 letras" />);
    const ids = (/aria-describedby="([^"]+)"/.exec(h)?.[1] ?? "").split(" ");
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(h).toContain(`id="${id}"`);
    expect(h).toContain('aria-invalid="true"');
    expect(h).toContain("border-no-encaja");
    expect(h).toContain("text-no-encaja");
    expect(h).toContain("<svg");
    expect(h).toContain("Escribí un nombre de hasta 40 letras");
  });

  it("el mensaje de error está en el id al que apunta el campo", () => {
    const h = html(<Field etiqueta="Nombre" error="Falta el nombre" />);
    const id = /aria-describedby="([^"]+)"/.exec(h)?.[1];
    const bloque = new RegExp(`<p id="${id}"[^>]*>([\\s\\S]*?)</p>`).exec(h);
    expect(bloque?.[1]).toContain("Falta el nombre");
  });

  it("la versión multilínea es un textarea", () => {
    const h = html(<Field etiqueta="Tus piezas" multilinea rows={5} />);
    expect(h).toContain("<textarea");
    expect(h).not.toContain("<input");
    expect(h).toContain('rows="5"');
  });

  it("deja pasar el resto de las props del campo", () => {
    const h = html(<Field etiqueta="Presupuesto" name="presupuesto" inputMode="numeric" required />);
    expect(h).toContain('name="presupuesto"');
    expect(h).toContain('inputMode="numeric"');
    expect(h).toContain("required");
  });

  it("dos campos no comparten ids", () => {
    const h = html(
      <>
        <Field etiqueta="A" ayuda="a" />
        <Field etiqueta="B" ayuda="b" />
      </>,
    );
    const ids = [...h.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Notice", () => {
  const tonos = [
    ["encaja", "bg-encaja-fondo", "status"],
    ["revisar", "bg-revisar-fondo", "status"],
    ["no", "bg-no-encaja-fondo", "alert"],
    ["info", "bg-papel-hundido", "status"],
  ] as const;

  it.each(tonos)("tono %s: fondo %s y role %s", (tono, fondo, role) => {
    const h = html(
      <Notice tono={tono} titulo="Conclusión">
        Qué hacer después.
      </Notice>,
    );
    expect(h).toContain(fondo);
    expect(h).toContain(`role="${role}"`);
    expect(h).toContain("<svg");
    expect(h).toContain("Conclusión");
    expect(h).toContain("Qué hacer después.");
  });

  it("role alert solo aparece con tono no", () => {
    for (const [tono, , role] of tonos) {
      const h = html(<Notice tono={tono} titulo="t">x</Notice>);
      expect(h.includes('role="alert"')).toBe(role === "alert");
    }
  });
});

describe("ChatBubble", () => {
  it("la persona va a la derecha sobre pino-suave", () => {
    const c = clasesDe(html(<ChatBubble autor="persona">Quiero jugar</ChatBubble>));
    expect(c).toContain("justify-self-end");
    expect(c).toContain("bg-pino-suave");
  });

  it("el asistente va a la izquierda sobre papel-alto con línea e interlineado amplio", () => {
    const h = html(
      <ChatBubble autor="asistente">
        <p>Te recomiendo esto</p>
      </ChatBubble>,
    );
    const c = clasesDe(h);
    expect(c).toContain("justify-self-start");
    expect(c).toContain("bg-papel-alto");
    expect(c).toContain("border-linea");
    expect(c).toContain("leading-[26px]");
    expect(h).toContain("<p>Te recomiendo esto</p>");
  });

  it("muestra el veredicto del motor con Verdict", () => {
    const h = html(
      <ChatBubble autor="asistente" veredicto="compatible">
        Encajan.
      </ChatBubble>,
    );
    expect(h).toContain("Encaja");
  });

  it("un veredicto desconocido no dice «Encaja»", () => {
    const h = html(
      <ChatBubble autor="asistente" veredicto="algo raro">
        Mmm.
      </ChatBubble>,
    );
    expect(h).toContain("Falta un dato");
    expect(h).not.toContain(">Encaja<");
  });

  it("sin veredicto no muestra ninguno", () => {
    const h = html(<ChatBubble autor="persona">Hola</ChatBubble>);
    expect(h).not.toContain("Encaja");
    expect(h).not.toContain("Falta un dato");
    expect(h).not.toContain("No encaja");
  });
});

describe("ChatSuggestions", () => {
  it("muestra cada sugerencia como un chip", () => {
    const h = html(<ChatSuggestions sugerencias={["Quiero jugar", "Mi PC va lenta", "Armar una PC"]} />);
    expect(h.match(/<button/g)).toHaveLength(3);
    expect(h).toContain("Quiero jugar");
    expect(h).toContain("rounded-pill");
    expect(h).toContain("min-h-9");
  });

  it("no muestra más de cuatro", () => {
    const h = html(<ChatSuggestions sugerencias={["a", "b", "c", "d", "e", "f"]} />);
    expect(h.match(/<button/g)).toHaveLength(4);
  });

  it("sin sugerencias no dibuja nada", () => {
    expect(html(<ChatSuggestions sugerencias={[]} />)).toBe("");
  });
});

describe("ChatComposer", () => {
  it("tiene input y botón con aria-label, y un placeholder que invita", () => {
    const h = html(<ChatComposer />);
    expect(h).toMatch(/<input[^>]*aria-label="[^"]+"/);
    expect(h).toMatch(/<button[^>]*aria-label="[^"]+"/);
    expect(h).toMatch(/placeholder="[^"]+"/);
    expect(h).toContain('type="submit"');
    expect(h).toContain("rounded-pill");
  });

  it("el botón de enviar queda dentro de la píldora", () => {
    const h = html(<ChatComposer />);
    expect(h.indexOf("<input")).toBeLessThan(h.indexOf("<button"));
    expect(h.indexOf("</button>")).toBeLessThan(h.lastIndexOf("</form>"));
  });

  it("deshabilita el envío cuando se pide", () => {
    expect(html(<ChatComposer disabled />)).toMatch(/<button[^>]*disabled/);
  });
});
