import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Box, CircuitBoard, Cpu, Fan, HardDrive, MemoryStick, Monitor, PlugZap, Wind } from "lucide-react";
import { PartCard } from "../../components/uj/part-card";

const precio = { monto: 389900, moneda: "ARS", condicion: "Contado", fecha: "2026-10-28", tienda: "Tienda de ejemplo A" };
const base = { categoria: "Placa de video", beneficio: "Para jugar en alta calidad", modelo: "GeForce RTX 4060 · 8 GB" };
const claseIcono = (Icono: typeof Cpu) => /lucide-[a-z0-9-]+/.exec(renderToStaticMarkup(<Icono />))![0];

describe("PartCard", () => {
  it("respeta el orden: categoría, beneficio, modelo, foto o ícono, precio, veredicto", () => {
    const html = renderToStaticMarkup(<PartCard {...base} precio={precio} veredicto="compatible" />);
    const orden = ["Placa de video", "Para jugar en alta calidad", "GeForce RTX 4060", "<svg", "$ 389.900", "Encaja"].map((t) => html.indexOf(t));
    expect(orden.every((i) => i >= 0)).toBe(true);
    expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  });

  it("sin foto muestra el ícono de la categoría sobre papel-hundido, sin imagen", () => {
    const html = renderToStaticMarkup(<PartCard {...base} />);
    expect(html).toContain("bg-papel-hundido");
    expect(html).toContain(claseIcono(Monitor));
    expect(html).not.toContain("<img");
  });

  it("con foto real muestra la foto con el nombre del modelo", () => {
    const html = renderToStaticMarkup(<PartCard {...base} foto="https://example.test/rtx.jpg" />);
    expect(html).toContain('src="https://example.test/rtx.jpg"');
    expect(html).toContain('alt="GeForce RTX 4060 · 8 GB"');
    expect(html).toContain("bg-papel-hundido");
  });

  it.each([
    ["Procesador", Cpu],
    ["Placa madre", CircuitBoard],
    ["Memoria", MemoryStick],
    ["Placa de video", Monitor],
    ["Fuente", PlugZap],
    ["Gabinete", Box],
    ["Almacenamiento", HardDrive],
    ["Cooler", Fan],
    ["Ventiladores", Wind],
    ["  PLACA  DE VIDEO ", Monitor],
  ])("el ícono de «%s» sale del mapa de categorías", (categoria, Icono) => {
    expect(renderToStaticMarkup(<PartCard {...base} categoria={categoria} />)).toContain(claseIcono(Icono));
  });

  it("una categoría desconocida igual muestra un ícono y su nombre", () => {
    const html = renderToStaticMarkup(<PartCard {...base} categoria="Algo nuevo" />);
    expect(html).toContain("Algo nuevo");
    expect(html).toContain("<svg");
  });

  it("sin precio dice «Sin precio» y sin veredicto no inventa uno", () => {
    const html = renderToStaticMarkup(<PartCard {...base} />);
    expect(html).toContain("Sin precio");
    expect(html).not.toContain("Encaja");
    expect(html).not.toContain("Falta un dato");
    expect(html).not.toContain("No encaja");
  });

  it("muestra el veredicto con Verdict, también uno desconocido", () => {
    expect(renderToStaticMarkup(<PartCard {...base} veredicto="incompatible" />)).toContain("No encaja");
    expect(renderToStaticMarkup(<PartCard {...base} veredicto="otra-cosa" />)).toContain("Falta un dato");
    expect(renderToStaticMarkup(<PartCard {...base} veredicto={null} />)).toContain("Falta un dato");
  });

  it("con href toda la tarjeta es tocable y tiene sombra y fondo propios", () => {
    const html = renderToStaticMarkup(<PartCard {...base} href="/piezas/rtx-4060" />);
    expect(html).toContain('href="/piezas/rtx-4060"');
    expect(html).toContain("after:absolute");
    expect(html).toContain("shadow-sombra-1");
    expect(html).toContain("bg-papel-alto");
    expect(html).toContain("rounded-md");
  });

  it("sin href no hay enlace", () => {
    expect(renderToStaticMarkup(<PartCard {...base} />)).not.toContain("<a ");
  });

  it("el enlace de la tienda sigue siendo clickeable por encima de la tarjeta", () => {
    const html = renderToStaticMarkup(
      <PartCard {...base} href="/piezas/rtx-4060" precio={{ ...precio, enlace: "https://example.test/a" }} />,
    );
    expect(html).toContain('href="https://example.test/a"');
    expect(html).toContain("z-10");
  });
});
