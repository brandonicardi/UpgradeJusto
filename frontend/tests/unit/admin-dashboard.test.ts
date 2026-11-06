import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  affectedPcsLabel,
  dashboardCategoryLabels,
  formatInputARS,
  missingAttributeLabel,
  normalizePriceAmount,
  oldPriceAmountLabel,
  oldPriceDateLabel,
  storeLabel,
} from "../../lib/admin-dashboard";

describe("rótulos del tablero de administración", () => {
  it("pone nombre a cada atributo del motor y conserva el crudo si no lo conoce", () => {
    expect(missingAttributeLabel("gpu_limit_mm")).toBe("Largo máximo de placa de video (mm)");
    expect(missingAttributeLabel("cooler_sockets")).toBe("Zócalos que acepta");
    expect(missingAttributeLabel("eps8_count")).toBe("Conectores de 8 pines");
    expect(missingAttributeLabel("attribute_sin_rotulo")).toBe("attribute_sin_rotulo");
  });
  it("tiene rótulo para cada atributo que el motor lee, sin mostrar nombres internos", () => {
    const source = readFileSync(resolve(__dirname, "../../../backend/upgradejusto/compatibility/tower_essential.py"), "utf8");
    const start = source.indexOf("ESSENTIAL_ATTRIBUTES = {");
    const block = source.slice(start, source.indexOf("\n}\n", start));
    const attributes = new Set(block.match(/"[a-z0-9_]+"/g)?.map((quoted) => quoted.slice(1, -1)).filter((name) => !["cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"].includes(name)));
    expect(start).toBeGreaterThan(0);
    expect(attributes.size).toBeGreaterThan(15);
    for (const attribute of attributes) expect(missingAttributeLabel(attribute), attribute).not.toBe(attribute);
  });
  it("nombra las categorías y las tiendas en castellano", () => {
    expect(dashboardCategoryLabels.case).toBe("Gabinete");
    expect(dashboardCategoryLabels.gpu).toBe("Placa de video");
    expect(storeLabel("compragamer")).toBe("Compra Gamer");
    expect(storeLabel("venex")).toBe("Venex");
    expect(storeLabel("desconocida")).toBe("desconocida");
  });
});

describe("formato del tablero sin inventar números", () => {
  it("normaliza el monto a como lo espera el servidor y rechaza lo que no es importe", () => {
    expect(normalizePriceAmount("389900")).toBe("389900");
    expect(normalizePriceAmount("389900,50")).toBe("389900.50");
    expect(normalizePriceAmount(" 389900.50 ")).toBe("389900.50");
    expect(normalizePriceAmount("0")).toBeNull();
    expect(normalizePriceAmount("0.00")).toBeNull();
    expect(normalizePriceAmount("abc")).toBeNull();
    expect(normalizePriceAmount("1.234")).toBeNull();
  });
  it("arma el resumen en ARS solo cuando el importe es válido", () => {
    expect(formatInputARS("389900")).toBe("ARS $ 389.900");
    expect(formatInputARS("389900.50")).toBe("ARS $ 389.900,50");
    expect(formatInputARS("no es importe")).toBe("");
  });
  it("muestra importe y fecha del precio viejo, nunca cero", () => {
    expect(oldPriceAmountLabel("371500.00")).toBe("ARS $ 371.500");
    expect(oldPriceAmountLabel("")).toBe("Importe no disponible");
    expect(oldPriceDateLabel("2026-10-12T12:00:00-03:00", 25)).toBe("12/10 · hace 25 días");
    expect(oldPriceDateLabel("2026-10-12T12:00:00-03:00", 1)).toBe("12/10 · hace 1 día");
  });
  it("cuenta PCs afectadas solo con números reales", () => {
    expect(affectedPcsLabel(14)).toBe("14 PCs");
    expect(affectedPcsLabel(1)).toBe("1 PC");
    expect(affectedPcsLabel(0)).toBe("0 PCs");
    expect(affectedPcsLabel(Number.NaN)).toBe("Sin dato");
  });
});
