import { describe, expect, it } from "vitest";
import { elegirSugerencia } from "../../lib/import-review";
import { busquedasDeSugerencia, ordenarSugerencias } from "../../lib/import-suggestions";
import type { TowerProposalDraft } from "../../lib/tower-extraction";

const vacio = { lines: [], category_status: { ram: "unknown", cpu: "unknown" } } as unknown as TowerProposalDraft;

describe("sugerencias del catálogo al revisar una lista", () => {
  it("saca las palabras de relleno y va de lo preciso a lo amplio", () => {
    expect(busquedasDeSugerencia("mother B550")).toEqual(["B550"]);
    expect(busquedasDeSugerencia("fuente 750W")).toEqual(["750W"]);
    expect(busquedasDeSugerencia("SSD NVMe 1TB")).toEqual(["NVMe 1TB", "NVMe", "1TB"]);
    expect(busquedasDeSugerencia("mother")).toEqual([]);
  });
  it("pone primero la coincidencia exacta", () => {
    const items = [{ name: "Ryzen 7 5700GE 4.6GHz" }, { name: "Ryzen 7 5700G 4.6GHz" }];
    expect(ordenarSugerencias(items, "Ryzen 7 5700G")[0].name).toBe("Ryzen 7 5700G 4.6GHz");
  });
  it("elegir reemplaza lo escrito por el componente, y un kit cuenta como 1", () => {
    const escrito = { ...vacio, lines: [{ line_id: null, category: "cpu", component_id: null, declared_model: "Ryzen", quantity: 1 }] } as TowerProposalDraft;
    expect(elegirSugerencia(escrito, "cpu", { id: "c1", name: "Ryzen 7" }).lines[0]).toMatchObject({ component_id: "c1", declared_model: null, quantity: 1 });
    const kit = elegirSugerencia(vacio, "ram", { id: "r1", name: "Memoria DDR4 32GB (2x16GB)" });
    expect(kit.lines[0]).toMatchObject({ component_id: "r1", quantity: 1 }); expect(kit.category_status.ram).toBe("present");
    expect(elegirSugerencia(vacio, "ram", { id: "r2", name: "Memoria DDR4 16GB" }).lines[0].quantity).toBeNull();
  });
});
