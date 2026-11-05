import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceTag } from "../../components/uj/price-tag";

const completo = {
  monto: 389900,
  moneda: "ARS",
  condicion: "Contado",
  fecha: "2026-10-28",
  tienda: "Tienda de ejemplo A",
  enlace: "https://example.test/tienda-a",
};
const html = (props: Record<string, unknown>) => renderToStaticMarkup(<PriceTag {...(props as typeof completo)} />);
const texto = (props: Record<string, unknown>) => html(props).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

describe("PriceTag", () => {
  it("muestra el precio completo con moneda, fecha y tienda con enlace", () => {
    const salida = html(completo);
    expect(salida).toContain("ARS");
    expect(salida).toContain("$ 389.900");
    expect(salida).toContain("Contado");
    expect(salida).toContain("28/10/2026");
    expect(salida).toContain('href="https://example.test/tienda-a"');
    expect(salida).toContain(">Tienda de ejemplo A</a>");
    expect(salida).toContain('rel="noopener noreferrer"');
    expect(salida).not.toContain("Sin precio");
  });

  it("pone la moneda delante del monto", () => {
    const t = texto(completo);
    expect(t.indexOf("ARS")).toBeLessThan(t.indexOf("389.900"));
  });

  it("formatea con es-AR, incluidos los decimales", () => {
    expect(texto({ ...completo, monto: 1234567.5 })).toContain("1.234.567,5");
    expect(texto({ ...completo, monto: "92500" })).toContain("$ 92.500");
  });

  it("usa US$ para dólares", () => {
    expect(texto({ ...completo, moneda: "USD", monto: 250 })).toContain("US$ 250");
  });

  it("sin condición ni enlace igual muestra fecha y tienda como texto", () => {
    const salida = html({ ...completo, condicion: undefined, enlace: undefined });
    expect(salida).toContain("28/10/2026");
    expect(salida).toContain("Tienda de ejemplo A");
    expect(salida).not.toContain("<a ");
  });

  it("no enlaza direcciones que no sean http o https", () => {
    expect(html({ ...completo, enlace: "javascript:alert(1)" })).not.toContain("<a ");
  });

  it.each([
    ["monto", { monto: undefined }],
    ["monto nulo", { monto: null }],
    ["moneda", { moneda: undefined }],
    ["moneda vacía", { moneda: "  " }],
    ["fecha", { fecha: undefined }],
    ["fecha inválida", { fecha: "ayer" }],
    ["tienda", { tienda: undefined }],
    ["tienda vacía", { tienda: "" }],
  ])("si falta %s dice «Sin precio» y no muestra monto", (_nombre, cambio) => {
    const salida = html({ ...completo, ...cambio });
    expect(salida).toContain("Sin precio");
    expect(salida).not.toContain("389.900");
    expect(salida).not.toContain("$ ");
    expect(salida).not.toContain("<a ");
  });

  it.each([0, "0", "0,00", "", -5, Number.NaN, "abc", Number.POSITIVE_INFINITY])(
    "un monto %j nunca se muestra como precio",
    (monto) => {
      const salida = html({ ...completo, monto });
      expect(salida).toContain("Sin precio");
      expect(salida).not.toMatch(/\$ ?0/);
      expect(salida).not.toContain("ARS");
    },
  );

  it("sin ningún dato dice «Sin precio»", () => {
    expect(texto({})).toContain("Sin precio");
  });
});
