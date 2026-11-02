import { describe, expect, it } from "vitest";
import { updateSimulationCandidate } from "../../lib/tower-simulation-state";
import type { TowerCandidate } from "../../lib/tower-compatibility";

describe("BIOS ligada a la identificación candidata, nunca heredada", () => {
  const candidates: TowerCandidate[] = [{ component_id: "synthetic-board-A", declared_model: null, quantity: 1 }];
  it("cambiar placa seleccionada borra BIOS sin mutar candidata anterior", () => {
    const result = updateSimulationCandidate("motherboard", candidates, "BIOS-A", 0, { component_id: "synthetic-board-B" });
    expect(result.bios).toBe(""); expect(result.candidates[0].component_id).toBe("synthetic-board-B"); expect(candidates[0].component_id).toBe("synthetic-board-A");
  });
  it("no borra por cantidad ni por seleccionar otra vez la misma placa", () => {
    expect(updateSimulationCandidate("motherboard", candidates, "BIOS-A", 0, { quantity: 2 }).bios).toBe("BIOS-A");
    expect(updateSimulationCandidate("motherboard", candidates, "BIOS-A", 0, { component_id: "synthetic-board-A", declared_model: null }).bios).toBe("BIOS-A");
  });
  it("escribir/cambiar declaración o modo de identificación borra BIOS", () => {
    expect(updateSimulationCandidate("motherboard", candidates, "BIOS-A", 0, { component_id: null, declared_model: "Placa declarada" }).bios).toBe("");
    const declared = [{ component_id: null, declared_model: "Placa A", quantity: 1 }];
    expect(updateSimulationCandidate("motherboard", declared, "BIOS-A", 0, { declared_model: "Placa B" }).bios).toBe("");
    expect(updateSimulationCandidate("motherboard", declared, "BIOS-A", 0, { component_id: "synthetic-board-B", declared_model: null }).bios).toBe("");
  });
});
