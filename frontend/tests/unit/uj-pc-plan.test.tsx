import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Box, CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, Monitor, PlugZap, Wind } from "lucide-react";
import { PcSlots, CATEGORIAS_PC } from "../../components/uj/pc-slots";
import { GoalPicker, siguienteSeleccion } from "../../components/uj/goal-picker";
import { BudgetSlider, escribirMonto, interpretarMonto } from "../../components/uj/budget-slider";
import { UpgradeCard } from "../../components/uj/upgrade-card";
import { PlanSteps } from "../../components/uj/plan-steps";
import { Button } from "../../components/uj/button";
import { PartCard } from "../../components/uj/part-card";
import type { ReactElement } from "react";
import * as uj from "../../components/uj";

const claseIcono = (Icono: typeof Cpu) => /lucide-[a-z0-9-]+/.exec(renderToStaticMarkup(<Icono />))![0];
const hrefAgregar = (categoria: string) => `/pc/agregar/${categoria}`;

describe("PcSlots", () => {
  it("define las nueve categorías en un orden fijo desde una sola constante", () => {
    expect(CATEGORIAS_PC.map((c) => c.clave)).toEqual([
      "cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan",
    ]);
  });

  it("muestra siempre las nueve, en orden, aunque no reciba ninguna pieza", () => {
    const html = renderToStaticMarkup(<PcSlots piezas={{}} hrefAgregar={hrefAgregar} />);
    const etiquetas = ["Procesador", "Placa madre", "Memoria", "Placa de video", "Fuente", "Gabinete", "Almacenamiento", "Cooler", "Ventiladores"];
    const posiciones = etiquetas.map((t) => html.indexOf(t));
    expect(posiciones.every((i) => i >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it("categoría ausente: casillero vacío con enlace «Agregar», nunca se omite", () => {
    const html = renderToStaticMarkup(
      <PcSlots piezas={{ cpu: { nombre: "Ryzen 5 5600" } }} hrefAgregar={hrefAgregar} />,
    );
    expect(html.match(/Agregar/g)).toHaveLength(8);
    expect(html).toContain('href="/pc/agregar/cooler"');
    expect(html).toContain('href="/pc/agregar/fan"');
    expect(html).not.toContain('href="/pc/agregar/cpu"');
    expect(html).toContain("border-dashed");
    expect(html).toContain("border-linea-fuerte");
    expect(html).toContain("text-pino");
  });

  it("pieza cargada: muestra el nombre sobre papel-alto con el ícono sobre pino-suave", () => {
    const html = renderToStaticMarkup(
      <PcSlots piezas={{ gpu: { nombre: "GTX 1650" } }} hrefAgregar={hrefAgregar} />,
    );
    expect(html).toContain("GTX 1650");
    expect(html).toContain("bg-papel-alto");
    expect(html).toContain("bg-pino-suave");
  });

  it("pieza en duda: dice qué falta, por ejemplo «16 GB · falta la velocidad»", () => {
    const html = renderToStaticMarkup(
      <PcSlots piezas={{ ram: { nombre: "16 GB", enDuda: true, falta: "la velocidad" } }} hrefAgregar={hrefAgregar} />,
    );
    expect(html).toContain("16 GB · falta la velocidad");
    expect(html).toContain("bg-revisar-fondo");
    expect(html).not.toContain('href="/pc/agregar/ram"');
  });

  it("en duda sin detalle igual avisa que falta un dato", () => {
    const html = renderToStaticMarkup(
      <PcSlots piezas={{ ram: { nombre: "16 GB", enDuda: true } }} hrefAgregar={hrefAgregar} />,
    );
    expect(html).toContain("16 GB · falta un dato");
  });

  it("una pieza con `falta` pero sin `enDuda` también se muestra en duda, nunca como cargada", () => {
    const html = renderToStaticMarkup(
      <PcSlots piezas={{ ram: { nombre: "16 GB", falta: "la velocidad" } }} hrefAgregar={hrefAgregar} />,
    );
    expect(html).toContain("16 GB · falta la velocidad");
    expect(html).toContain("bg-revisar-fondo");
    expect(html).not.toContain("bg-pino-suave");
  });

  it("`falta` vacío o en blanco sin `enDuda` sigue siendo una pieza cargada", () => {
    const html = renderToStaticMarkup(
      <PcSlots piezas={{ ram: { nombre: "16 GB", falta: "  " } }} hrefAgregar={hrefAgregar} />,
    );
    expect(html).toContain("bg-pino-suave");
    expect(html).not.toContain("falta");
  });

  it("el casillero en duda pasa de línea (sin truncate); el cargado y el vacío sí truncan", () => {
    const duda = renderToStaticMarkup(
      <PcSlots piezas={{ ram: { nombre: "16 GB", enDuda: true, falta: "la velocidad" } }} hrefAgregar={hrefAgregar} />,
    );
    const nombreEnDuda = duda.slice(duda.indexOf("16 GB"));
    expect(duda.slice(0, duda.indexOf("16 GB"))).toMatch(/break-words[^"]*">$/);
    expect(nombreEnDuda).toBeTruthy();
    const casilleroEnDuda = duda.slice(duda.lastIndexOf("<li", duda.indexOf("16 GB")), duda.indexOf("</li>", duda.indexOf("16 GB")));
    expect(casilleroEnDuda).not.toContain("truncate");

    const cargada = renderToStaticMarkup(<PcSlots piezas={{ gpu: { nombre: "GTX 1650" } }} hrefAgregar={hrefAgregar} />);
    const casilleroCargado = cargada.slice(cargada.lastIndexOf("<li", cargada.indexOf("GTX 1650")), cargada.indexOf("</li>", cargada.indexOf("GTX 1650")));
    expect(casilleroCargado).toContain("truncate");

    const vacia = renderToStaticMarkup(<PcSlots piezas={{}} hrefAgregar={hrefAgregar} />);
    const casilleroVacio = vacia.slice(vacia.indexOf("<li"), vacia.indexOf("</li>"));
    expect(casilleroVacio).toContain("truncate");
  });

  it("usa los mismos íconos que PartCard", () => {
    const html = renderToStaticMarkup(<PcSlots piezas={{}} hrefAgregar={hrefAgregar} />);
    for (const Icono of [Cpu, CircuitBoard, MemoryStick, Monitor, PlugZap, Box, HardDrive, Fan, Wind]) {
      expect(html).toContain(claseIcono(Icono));
    }
  });

  it("el ícono del casillero es de 20 px y el de PartCard sigue en 30 px", () => {
    const html = renderToStaticMarkup(<PcSlots piezas={{}} hrefAgregar={hrefAgregar} />);
    expect(html.match(/<svg[^>]*size-5/g)).toHaveLength(9);
    expect(html).not.toContain("size-[30px]");
    const tarjeta = renderToStaticMarkup(<PartCard categoria="Procesador" beneficio="b" modelo="m" />);
    expect(tarjeta).toMatch(/<svg[^>]*size-\[30px\]/);
  });

  it("los casilleros de una fila se estiran a igual altura (la grilla no usa items-start)", () => {
    const html = renderToStaticMarkup(<PcSlots piezas={{}} hrefAgregar={hrefAgregar} />);
    const lista = html.match(/<ul[^>]*>/)![0];
    expect(lista).not.toMatch(/items-(start|center|end)/);
    for (const li of html.match(/<li\b[^>]*>/g)!) expect(li).toContain("min-w-0");
    // El casillero llena la altura de su celda, con el contenido centrado.
    expect(html.match(/h-full[^"]*items-center|items-center[^"]*h-full/g)).toHaveLength(9);
  });

  it("el nombre del casillero es de 600, 15 px y 20 px de alto de línea, sin truncar ni cortar la línea", () => {
    const html = renderToStaticMarkup(
      <PcSlots piezas={{ gpu: { nombre: "GTX 1650" }, ram: { nombre: "16 GB", enDuda: true } }} hrefAgregar={hrefAgregar} />,
    );
    const nombres = html.match(/<span class="block[^"]*text-\[15px\][^"]*"/g)!;
    expect(nombres).toHaveLength(9);
    for (const n of nombres) {
      expect(n).toContain("font-semibold");
      expect(n).toContain("leading-5");
      expect(n).not.toContain("text-cuerpo-fuerte");
      expect(n).not.toContain("whitespace-nowrap");
    }
    const enDuda = html.slice(html.indexOf("16 GB") - 200, html.indexOf("16 GB"));
    expect(enDuda).not.toContain("truncate");
    expect(enDuda).toContain("break-words");
  });

  it("es una grilla de una columna en móvil y tres en escritorio, sin hexadecimales", () => {
    const html = renderToStaticMarkup(<PcSlots piezas={{}} hrefAgregar={hrefAgregar} />);
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("min-[720px]:grid-cols-3");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("GoalPicker", () => {
  const opciones = [
    { valor: "jugar", texto: "Jugar mejor" },
    { valor: "trabajar", texto: "Trabajar más rápido" },
    { valor: "editar", texto: "Editar fotos y video" },
  ];

  it("muestra la pregunta y cada opción como botón con aria-pressed", () => {
    const html = renderToStaticMarkup(
      <GoalPicker pregunta="¿Qué querés que tu PC haga mejor?" opciones={opciones} valor="trabajar" onCambio={() => {}} />,
    );
    expect(html).toContain("¿Qué querés que tu PC haga mejor?");
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Trabajar más rápido/);
  });

  it("la opción elegida usa pino-suave y pino; el grupo queda nombrado por la pregunta", () => {
    const html = renderToStaticMarkup(<GoalPicker pregunta="¿Para qué?" opciones={opciones} valor="jugar" onCambio={() => {}} />);
    expect(html).toContain("aria-pressed:bg-pino-suave");
    expect(html).toContain('role="group"');
    expect(html).toContain("aria-labelledby");
  });

  it("con `nombre`, el grupo usa ese nombre accesible en lugar de la pregunta", () => {
    const html = renderToStaticMarkup(<GoalPicker pregunta="¿Para qué?" nombre="Objetivo del armado" opciones={opciones} valor={null} onCambio={() => {}} />);
    expect(html).toContain('aria-label="Objetivo del armado"');
    expect(html).not.toContain("aria-labelledby");
  });

  it("modo una sola opción: elegir otra reemplaza, elegir la misma la deja", () => {
    expect(siguienteSeleccion("jugar", "editar", false)).toBe("editar");
    expect(siguienteSeleccion("jugar", "jugar", false)).toBe("jugar");
  });

  it("modo multiple: varias opciones marcadas, y volver a tocar una la saca", () => {
    const html = renderToStaticMarkup(
      <GoalPicker pregunta="Elegí todas las que quieras" opciones={opciones} valor={["jugar", "editar"]} onCambio={() => {}} multiple />,
    );
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(siguienteSeleccion(["jugar"], "editar", true)).toEqual(["jugar", "editar"]);
    expect(siguienteSeleccion(["jugar", "editar"], "jugar", true)).toEqual(["editar"]);
  });
});

describe("BudgetSlider", () => {
  const base = {
    min: "100000",
    max: "1500000",
    paso: "50000",
    moneda: "ARS",
    valor: "400000",
    atajos: [
      { valor: "250000", texto: "$ 250 mil" },
      { valor: "500000", texto: "$ 500 mil" },
      { valor: "1000000", texto: "$ 1 millón" },
    ],
    onCambio: () => {},
  };

  it("muestra el monto grande con separador de miles y la moneda al lado", () => {
    const html = renderToStaticMarkup(<BudgetSlider {...base} />);
    expect(html).toContain("$ 400.000");
    expect(html).toContain("ARS");
    expect(html).toContain("font-display");
    expect(html).toContain("text-titular-l");
  });

  it("tiene un input range accesible con rango, paso, valor y etiqueta", () => {
    const html = renderToStaticMarkup(<BudgetSlider {...base} />);
    expect(html).toContain('type="range"');
    expect(html).toContain('min="100000"');
    expect(html).toContain('max="1500000"');
    expect(html).toContain('step="50000"');
    expect(html).toContain('value="400000"');
    expect(html).toContain("<label");
    expect(html).toContain("¿Cuánto querés gastar como máximo?");
    expect(html).toContain("focus-visible:outline-foco");
  });

  it("el campo del monto sigue al campo del sistema: padding horizontal space-4 y 420 px de ancho máximo", () => {
    const html = renderToStaticMarkup(<BudgetSlider {...base} />);
    const campo = html.match(/<input[^>]*type="text"[^>]*>/)![0];
    expect(campo).toContain("px-space-4");
    expect(campo).not.toContain("px-space-3");
    const contenedor = html.slice(0, html.indexOf(campo));
    expect(contenedor.slice(contenedor.lastIndexOf("<div"))).toContain("max-w-[420px]");
  });

  it("muestra la escala con el mínimo y el máximo", () => {
    const html = renderToStaticMarkup(<BudgetSlider {...base} />);
    expect(html).toContain("$ 100.000");
    expect(html).toContain("$ 1.500.000");
  });

  it("ofrece atajos como botones y un campo con etiqueta para escribir el monto", () => {
    const html = renderToStaticMarkup(<BudgetSlider {...base} />);
    for (const texto of ["$ 250 mil", "$ 500 mil", "$ 1 millón"]) expect(html).toContain(texto);
    expect(html.match(/type="button"/g)).toHaveLength(3);
    expect(html).toContain('inputMode="numeric"');
    expect(html).toMatch(/<label[^>]*>[^<]*Escribí el monto/);
  });

  it("el atajo elegido queda marcado con aria-pressed", () => {
    const html = renderToStaticMarkup(<BudgetSlider {...base} valor="500000" />);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>\$ 500 mil/);
  });

  it("el monto del campo refleja el valor guardado como texto entero", () => {
    const html = renderToStaticMarkup(<BudgetSlider {...base} valor="750000" />);
    expect(html).toContain('value="750000"');
    expect(html).toContain("$ 750.000");
  });

  describe("monto escrito", () => {
    it("dentro del rango: devuelve el entero como texto y avisa por onCambio", () => {
      const onCambio = vi.fn();
      expect(escribirMonto("650000", { min: "100000", max: "1500000", onCambio })).toBeNull();
      expect(onCambio).toHaveBeenCalledExactlyOnceWith("650000");
    });

    it("acepta puntos de miles, espacios y el signo $", () => {
      expect(interpretarMonto("$ 400.000", "100000", "1500000")).toEqual({ valor: "400000" });
      expect(interpretarMonto(" 1.500.000 ", "100000", "1500000")).toEqual({ valor: "1500000" });
      expect(interpretarMonto("100000", "100000", "1500000")).toEqual({ valor: "100000" });
    });

    it("fuera de rango: no avisa y explica el rango válido", () => {
      const onCambio = vi.fn();
      const bajo = escribirMonto("5000", { min: "100000", max: "1500000", onCambio });
      const alto = escribirMonto("99999999", { min: "100000", max: "1500000", onCambio });
      expect(onCambio).not.toHaveBeenCalled();
      expect(bajo).toBe("Escribí un monto entre $ 100.000 y $ 1.500.000.");
      expect(alto).toBe(bajo);
    });

    it.each(["", "   ", "abc", "12abc", "-5000", "400000,50", "4e5", "1.5", "NaN", "Infinity", "0x1F"])(
      "no numérico o con decimales (%j): no avisa un valor inválido",
      (texto) => {
        const onCambio = vi.fn();
        const error = escribirMonto(texto, { min: "100000", max: "1500000", onCambio });
        expect(onCambio).not.toHaveBeenCalled();
        expect(error).toMatch(/^Escribí un monto/);
      },
    );
  });

  it("no usa float: un monto enorme se compara como entero y no se redondea", () => {
    expect(interpretarMonto("9007199254740993", "1", "9007199254740993")).toEqual({ valor: "9007199254740993" });
    expect(interpretarMonto("9007199254740994", "1", "9007199254740993")).toHaveProperty("error");
  });
});

function buscar(nodo: unknown, es: (el: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | null {
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) {
      const hallado = buscar(hijo, es);
      if (hallado) return hallado;
    }
    return null;
  }
  if (!nodo || typeof nodo !== "object" || !("props" in nodo)) return null;
  const el = nodo as ReactElement<Record<string, unknown>>;
  return es(el) ? el : buscar(el.props.children, es);
}

describe("UpgradeCard", () => {
  const precio = { monto: 389900, moneda: "ARS", fecha: "2026-10-28", tienda: "Tienda de ejemplo A" };
  const base = {
    titulo: "Cambiá la placa de video",
    actual: "GTX 1650 · 4 GB",
    nueva: "RTX 4060 · 8 GB",
    motivos: ["Es la pieza que más frena tus juegos hoy.", "Tu fuente de 550 W alcanza y entra en tu gabinete."],
    precio,
    diferencia: { monto: "10100", moneda: "ARS" },
    veredicto: "compatible",
    onSumar: () => {},
  };

  it("muestra título, pieza actual y nueva, motivos, precio y veredicto", () => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} />);
    for (const t of ["Cambiá la placa de video", "Hoy tenés", "GTX 1650 · 4 GB", "Pasás a", "RTX 4060 · 8 GB", "Es la pieza que más frena", "$ 389.900", "Encaja"]) {
      expect(html).toContain(t);
    }
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).toContain("<h3");
    expect(html).toContain("rounded-lg");
    expect(html).toContain("shadow-sombra-2");
    expect(html).toContain("bg-pino-suave");
  });

  it("sobra plata: lo dice y lo resalta con lima", () => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} />);
    expect(html).toContain("Te sobran");
    expect(html).toMatch(/bg-lima[^>]*>\$ 10\.100</);
    expect(html).toContain("de tu presupuesto");
  });

  it("falta plata: dice «Te faltan» con el monto en tinta, sin resaltar y sin signo", () => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} diferencia={{ monto: "-40000", moneda: "ARS" }} />);
    expect(html).toContain("Te faltan");
    expect(html).toMatch(/text-tinta[^>]*>\$ 40\.000</);
    expect(html).not.toContain("-40");
    expect(html).not.toContain("Te sobran");
    expect(html).not.toContain("lima");
  });

  it("no hace cuentas: un monto enorme se muestra exacto, y respeta la moneda", () => {
    const grande = renderToStaticMarkup(<UpgradeCard {...base} diferencia={{ monto: "-9007199254740993", moneda: "ARS" }} />);
    expect(grande).toContain("$ 9.007.199.254.740.993");
    const dolares = renderToStaticMarkup(<UpgradeCard {...base} diferencia={{ monto: "-40000", moneda: "USD" }} />);
    expect(dolares).toContain("US$ 40.000");
  });

  it.each([
    ["ausente", undefined],
    ["nula", null],
    ["vacía", { monto: "", moneda: "ARS" }],
    ["no numérica", { monto: "abc", moneda: "ARS" }],
    ["con decimales", { monto: "10.5", moneda: "ARS" }],
    ["sin moneda", { monto: "10100", moneda: "" }],
  ])("diferencia %s: no dice cuánto sobra ni falta, ni inventa un monto", (_, diferencia) => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} diferencia={diferencia} />);
    expect(html).not.toMatch(/Te sobran|Te faltan|\$ 0\b/);
  });

  it("diferencia en cero: dice que justo alcanza, sin «$ 0»", () => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} diferencia={{ monto: "0", moneda: "ARS" }} />);
    expect(html).toContain("Justo con tu presupuesto");
    expect(html).not.toContain("$ 0");
  });

  it("sin precio muestra «Sin precio», nunca «$ 0»", () => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} precio={undefined} diferencia={undefined} />);
    expect(html).toContain("Sin precio");
    expect(html).not.toContain("$ 0");
    expect(renderToStaticMarkup(<UpgradeCard {...base} precio={{ monto: 0, moneda: "ARS", fecha: "2026-10-28", tienda: "x" }} />)).not.toContain("$ 0");
  });

  it("sin veredicto dice «Falta un dato», nunca «Encaja»", () => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} veredicto={undefined} />);
    expect(html).toContain("Falta un dato");
    expect(html).not.toContain("Encaja");
  });

  it("el botón principal dice «Sumar a mi plan», nunca «Aplicar», y avisa por onSumar", () => {
    const onSumar = vi.fn();
    const html = renderToStaticMarkup(<UpgradeCard {...base} onSumar={onSumar} />);
    expect(html).toContain("Sumar a mi plan");
    expect(html).not.toContain("Aplicar");
    const boton = buscar(UpgradeCard({ ...base, onSumar }), (el) => el.type === Button);
    expect(boton?.props.peso).toBe("principal");
    expect(boton?.props.onClick).toBe(onSumar);
  });

  it("«Ver otras opciones» aparece solo si llega onVerOpciones, antes de «Sumar a mi plan»", () => {
    expect(renderToStaticMarkup(<UpgradeCard {...base} />)).not.toContain("Ver otras opciones");
    const onVerOpciones = vi.fn();
    const html = renderToStaticMarkup(<UpgradeCard {...base} onVerOpciones={onVerOpciones} />);
    expect(html).toContain("Ver otras opciones");
    expect(html.indexOf("Ver otras opciones")).toBeLessThan(html.indexOf("Sumar a mi plan"));
    const boton = buscar(UpgradeCard({ ...base, onVerOpciones }), (el) => el.type === Button && el.props.peso === "secundario");
    expect(boton?.props.chico).toBe(true);
    expect(boton?.props.onClick).toBe(onVerOpciones);
  });

  it("sigue la maqueta: sin borde exterior, 620 px de ancho máximo, gap space-4 y pie con línea", () => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} />);
    const raiz = html.match(/<article[^>]*>/)![0];
    expect(raiz).not.toMatch(/\bborder\b/);
    expect(raiz).toContain("max-w-[620px]");
    expect(raiz).toContain("w-full");
    expect(raiz).toContain("gap-space-4");
    expect(raiz).not.toContain("gap-space-5");
    expect(raiz).toContain("shadow-sombra-2");
    expect(html).toMatch(/border-t[^"]*border-linea[^"]*pt-space-4|pt-space-4[^"]*border-t[^"]*border-linea/);
    expect(html.match(/px-space-4 py-space-3/g)).toHaveLength(2);
  });

  it("se adapta a 390 px: la fila de piezas se apila y no hay hexadecimales", () => {
    const html = renderToStaticMarkup(<UpgradeCard {...base} />);
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("min-[600px]:grid-cols-");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("PlanSteps", () => {
  const costo = (monto: number) => ({ monto, moneda: "ARS", fecha: "2026-10-28", tienda: "Tienda de ejemplo A" });
  const etapas = [
    { nombre: "Más memoria", costo: costo(92500), estado: "hecha" as const, veredicto: "compatible" },
    { nombre: "Placa de video nueva", costo: costo(389900), estado: "actual" as const, veredicto: "compatible" },
    { nombre: "Disco más grande", estado: "pendiente" as const },
  ];

  it("es una lista ordenada con las etapas en el orden recibido", () => {
    const html = renderToStaticMarkup(<PlanSteps etapas={etapas} />);
    expect(html).toContain("<ol");
    expect(html.match(/<li/g)).toHaveLength(3);
    const orden = ["Más memoria", "Placa de video nueva", "Disco más grande"].map((t) => html.indexOf(t));
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  it("distingue hecha, actual y pendiente por forma y por palabra, no solo por color", () => {
    const html = renderToStaticMarkup(<PlanSteps etapas={etapas} />);
    expect(html).toMatch(/\bbg-pino(?![-\w])/);
    expect(html).toContain("bg-lima");
    expect(html).toContain("bg-papel-hundido");
    expect(html).toContain("bg-pino-suave");
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    for (const palabra of ["Hecha", "Paso actual", "Pendiente"]) expect(html).toContain(palabra);
  });

  it("muestra el costo y el veredicto recibidos de cada etapa", () => {
    const html = renderToStaticMarkup(<PlanSteps etapas={etapas} />);
    expect(html).toContain("$ 92.500");
    expect(html).toContain("$ 389.900");
    expect(html).toContain("Encaja");
  });

  it("etapa sin veredicto: «Falta un dato», nunca «Encaja»", () => {
    const html = renderToStaticMarkup(<PlanSteps etapas={[{ nombre: "Disco", costo: costo(50000), estado: "actual" }]} />);
    expect(html).toContain("Falta un dato");
    expect(html).not.toContain("Encaja");
    const nulo = renderToStaticMarkup(<PlanSteps etapas={[{ nombre: "Disco", estado: "actual", veredicto: null }]} />);
    expect(nulo).toContain("Falta un dato");
    expect(nulo).not.toContain("Encaja");
  });

  it("etapa sin costo: «Sin precio», nunca «$ 0»", () => {
    const html = renderToStaticMarkup(<PlanSteps etapas={[{ nombre: "Disco", estado: "pendiente" }]} />);
    expect(html).toContain("Sin precio");
    expect(html).not.toContain("$ 0");
  });

  it("el total se recibe y se muestra arriba de la lista; sin total no se inventa uno", () => {
    const conTotal = renderToStaticMarkup(<PlanSteps total={costo(482400)} etapas={etapas} />);
    expect(conTotal).toContain("$ 482.400");
    expect(conTotal.indexOf("$ 482.400")).toBeLessThan(conTotal.indexOf("<ol"));
    const sinTotal = renderToStaticMarkup(<PlanSteps etapas={etapas} />);
    expect(sinTotal).not.toContain("Total");
    expect(sinTotal).not.toContain("$ 482.400");
  });

  it("el fondo pino-suave va solo en el cuerpo de la etapa actual, no en el li", () => {
    const html = renderToStaticMarkup(<PlanSteps etapas={etapas} />);
    for (const li of html.match(/<li[^>]*>/g)!) expect(li).not.toContain("bg-pino-suave");
    expect(html.match(/bg-pino-suave/g)).toHaveLength(1);
    const actual = html.slice(html.indexOf("<li", html.indexOf("Más memoria")), html.indexOf("Disco más grande"));
    expect(actual).toContain("bg-pino-suave");
    const cuerpo = actual.slice(actual.lastIndexOf("<div", actual.indexOf("bg-pino-suave")));
    expect(cuerpo).toContain("Placa de video nueva");
  });

  it("los círculos son de 40 px y la grilla de cada etapa es 40px + resto", () => {
    const html = renderToStaticMarkup(<PlanSteps etapas={etapas} />);
    expect(html.match(/<span[^>]*size-10/g)).toHaveLength(3);
    expect(html).not.toContain("size-8");
    expect(html.match(/grid-cols-\[40px_minmax\(0,1fr\)\]/g)).toHaveLength(3);
  });

  it("todas las etapas menos la última llevan una línea conectora decorativa", () => {
    const html = renderToStaticMarkup(<PlanSteps etapas={etapas} />);
    expect(html.match(/data-conector/g)).toHaveLength(2);
    expect(html.match(/<span[^>]*data-conector[^>]*aria-hidden="true"|<span[^>]*aria-hidden="true"[^>]*data-conector/g)).toHaveLength(2);
    const ultima = html.slice(html.indexOf("<li", html.indexOf("Placa de video nueva")));
    expect(ultima).not.toContain("data-conector");
    const sola = renderToStaticMarkup(<PlanSteps etapas={[etapas[0]]} />);
    expect(sola).not.toContain("data-conector");
  });

  it("sin hexadecimales", () => {
    expect(renderToStaticMarkup(<PlanSteps total={costo(1)} etapas={etapas} />)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("exportaciones", () => {
  it("salen desde components/uj", () => {
    expect(uj.UpgradeCard).toBe(UpgradeCard);
    expect(uj.PlanSteps).toBe(PlanSteps);
    expect(uj.PcSlots).toBe(PcSlots);
    expect(uj.GoalPicker).toBe(GoalPicker);
    expect(uj.BudgetSlider).toBe(BudgetSlider);
  });
});
