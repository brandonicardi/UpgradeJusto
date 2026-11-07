import { describe, expect, it } from "vitest";
import { pcAfterPurchase, pcMatchesPlan } from "../../lib/mi-plan-pc";

const line = (category: string, declared_model: string) => ({ category, component_id: null, declared_model, quantity: 1 });
const plan = { snapshot: { pc_revision: 3, stages: [{ evaluated_configuration: { lines: [line("gpu", "RTX 4060")] } }, { evaluated_configuration: { lines: [line("gpu", "RTX 4060"), line("psu", "750W")] } }] } } as never;

describe("pcMatchesPlan", () => {
  it("acepta la PC con la que se armó el plan", () => {
    expect(pcMatchesPlan(plan, { revision: 3, lines: [] } as never, 0)).toBe(true);
  });
  it("acepta la PC ya actualizada con una compra anterior", () => {
    expect(pcMatchesPlan(plan, { revision: 4, lines: [line("gpu", "RTX 4060")] } as never, 1)).toBe(true);
  });
  it("rechaza una PC cambiada por otro motivo", () => {
    expect(pcMatchesPlan(plan, { revision: 4, lines: [line("gpu", "RX 6600")] } as never, 1)).toBe(false);
  });
});

describe("pcAfterPurchase", () => {
  it("toma la BIOS que evaluó el plan, no la de la placa anterior", () => {
    const pc = { name: "Mía", lines: [], context: { bios_version: "P9.00", notes: "x", assembly_state: null } };
    const stage = { evaluated_configuration: { category_status: {}, context: { bios_version: null }, lines: [] } };
    const input = pcAfterPurchase(pc as never, { snapshot: { stages: [stage] } } as never, 0);
    expect(input.context.bios_version).toBeNull();
    expect(input.context.notes).toBe("x");
  });
});
