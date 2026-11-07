// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BeginnerEntry from "../../components/beginner-entry";
import HomeStart from "../../components/home-start";
import { mount, unmountAll, click, button } from "./support/dom";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(async () => { await unmountAll(); push.mockClear(); });

describe("entrada como la maqueta de Inicio", () => {
  it("arma la pantalla en el orden de la maqueta: presentación con la tarjeta, tres caminos y el recorrido", () => {
    const html = renderToStaticMarkup(<BeginnerEntry />);
    expect(html).toContain("<h1"); expect(html).toContain("Tu PC puede dar"); expect(html).toContain("<mark");
    for (const text of ["No hace falta saber de hardware.", "Revisamos que cada pieza encaje antes de sugerirla.", "Precios reales, con fecha y tienda."]) expect(html).toContain(text);
    expect(html).toContain("¿Qué querés que tu PC haga mejor?"); expect(html).toContain("¿Cuánto querés gastar como máximo?");
    const orden = ["Tu PC puede dar", "Paso 1 de 2", "¿Sabés qué tiene tu PC adentro?", "No sé qué tengo", "Sé qué piezas tiene", "Tengo una lista", "De tu PC a un plan que entendés", "Explorar el catálogo"].map(text => html.indexOf(text));
    expect(orden.every(position => position >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });
  it("ofrece los tres caminos con sus destinos y la etiqueta de quien recién empieza", () => {
    const html = renderToStaticMarkup(<BeginnerEntry />);
    expect(html).toContain("Si recién empezás");
    expect(html).toContain('href="/pcs/import#ayuda"'); expect(html).toContain('href="/pcs"'); expect(html).toContain('href="/pcs/import"');
    expect(html.indexOf("No sé qué tengo")).toBeLessThan(html.indexOf("Sé qué piezas tiene"));
    expect(html).toContain('aria-describedby="beginner-paste-note"'); expect(html).toContain('id="beginner-paste-note"');
    expect(html).toContain("Pegá lo que te pasó el vendedor o un programa.");
  });
  it("sigue ofreciendo armar desde cero y el catálogo, sin mostrar piezas ni precios inventados", () => {
    const html = renderToStaticMarkup(<BeginnerEntry />);
    expect(html).toContain('href="/build"'); expect(html).toContain('href="/catalog"'); expect(html).toContain("Armá una desde cero");
    expect(html).not.toContain("Explorá una pieza real"); expect(html).not.toContain("Precio guardado"); expect(html).not.toContain("Ficha y procedencia");
  });
});

describe("tarjeta para empezar", () => {
  const goals = ["Jugar mejor", "Trabajar más rápido", "Editar fotos y video", "Que abra todo más rápido"];
  it("no deja avanzar sin elegir qué mejorar y lo dice en el botón", async () => {
    const host = await mount(<HomeStart />);
    const go = button(host, "Elegí qué querés mejorar") as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    expect(host.textContent).toContain("Paso 1 de 2"); expect(host.textContent).toContain("Paso 2 de 2");
    expect(host.textContent).toContain("Mirar sugerencias no cambia nada de tu PC guardada.");
    for (const text of goals) expect(button(host, text)).not.toBeNull();
    expect([...host.querySelectorAll('[role="group"][aria-labelledby="inicio-objetivo"] [aria-pressed="true"]')].map(item => item.textContent)).toEqual([]);
    expect(host.querySelector('input[type="range"]')).not.toBeNull();
    expect(host.textContent).toContain("$ 400.000"); expect(host.textContent).toContain("$ 100.000"); expect(host.textContent).toContain("$ 5.000.000");
    for (const text of ["$ 500 mil", "$ 1 millón", "$ 2 millones"]) expect(button(host, text)).not.toBeNull();
    expect(button(host, "$ 250 mil")).toBeNull();
    // El campo para escribir el monto se muestra también en la tarjeta de inicio.
    expect(host.querySelector('input[type="text"]')).not.toBeNull();
    // Por defecto la persona mejora la PC que tiene; la otra opción es armar una primera PC.
    expect(button(host, /^Mejorar la PC que tengo/)?.getAttribute("aria-pressed")).toBe("true");
    expect(button(host, /^Armar mi primera PC/)?.getAttribute("aria-pressed")).toBe("false");
  });
  it("con objetivo y monto va a «Lo que te conviene» con esos datos, y no manda identidad", async () => {
    const host = await mount(<HomeStart />);
    await click(button(host, "Jugar mejor")); await click(button(host, "$ 500 mil"));
    const go = button(host, "Ver qué me conviene con $ 500.000") as HTMLButtonElement;
    expect(go.disabled).toBe(false);
    await click(go);
    expect(push).toHaveBeenCalledWith("/conviene?objetivo=gaming&presupuesto=500000");
    expect(String(push.mock.calls[0][0])).not.toMatch(/user|email|id=/);
  });
  it("con «Armar mi primera PC» navega a /build con el mismo objetivo y presupuesto", async () => {
    const host = await mount(<HomeStart />);
    await click(button(host, /^Armar mi primera PC/)); await click(button(host, "Jugar")); await click(button(host, "$ 1 millón"));
    await click(button(host, "Armar mi PC con $ 1.000.000"));
    expect(push).toHaveBeenCalledWith("/build?objetivo=gaming&presupuesto=1000000");
  });
  it("elige un solo objetivo a la vez", async () => {
    const host = await mount(<HomeStart />);
    await click(button(host, "Jugar mejor")); await click(button(host, "Editar fotos y video"));
    expect([...host.querySelectorAll('[role="group"][aria-labelledby="inicio-objetivo"] [aria-pressed="true"]')].map(item => item.textContent?.trim())).toEqual(["Editar fotos y video"]);
  });
});
