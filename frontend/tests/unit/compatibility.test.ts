import { describe, expect, it } from "vitest";
import { simulationInput } from "../../lib/compatibility";
import { compatibilityProxy } from "../../lib/compatibility-proxy";
import { signedProxyHeaders } from "../../lib/gateway";

describe("CU05 D lógica local aislada, sin decidir compatibilidad", () => {
  it("construye reemplazo RAM completo sin conservar grupo previo ni inferir cantidad", () => {
    const form = new FormData(); form.append("candidate", "reference-from-catalog");
    expect(() => simulationInput(2, "ram", form)).toThrow();
    form.append("quantity", "2");
    expect(simulationInput(2, "ram", form)).toEqual({ expected_pc_revision: 2, category: "ram", candidates: [{ component_id: "reference-from-catalog", quantity: 2 }] });
    form.append("candidate", "reference-from-catalog"); form.append("quantity", "2");
    expect(() => simulationInput(2, "ram", form)).toThrow();
  });
  it("nueva placa usa BIOSnull explícita, otra categoría no envía contexto", () => {
    const form = new FormData(); form.set("candidate", "reference-from-catalog"); form.set("quantity", "1");
    expect(simulationInput(1, "motherboard", form).candidate_context).toEqual({ bios_version: null });
    form.set("candidate_bios", " P2.30 ");
    expect(simulationInput(1, "motherboard", form).candidate_context).toEqual({ bios_version: "P2.30" });
    expect(simulationInput(1, "cpu", form)).not.toHaveProperty("candidate_context");
  });
  it("rechaza total RAM mayor que8 y múltiples CPU", () => {
    const form = new FormData(); form.append("candidate", "a"); form.append("quantity", "5"); form.append("candidate", "b"); form.append("quantity", "4");
    expect(() => simulationInput(1, "ram", form)).toThrow();
    expect(() => simulationInput(1, "cpu", form)).toThrow();
  });
  it("gateway firma solo acciones conocidas POST, nunca queries ni rutas arbitrarias", () => {
    const root = "/api/pcs/11111111-1111-1111-1111-111111111111/compatibility/";
    const fixture = "synthetic-unit-fixture-not-runtime-secret";
    for (const action of ["evaluate", "simulate"]) {
      expect(signedProxyHeaders("127.0.0.1", "POST", root + action, fixture)).not.toBeNull();
      expect(signedProxyHeaders("127.0.0.1", "GET", root + action, fixture)).toBeNull();
      expect(signedProxyHeaders("127.0.0.1", "POST", root + action + "?owner_id=", fixture)).toBeNull();
    }
    expect(signedProxyHeaders("127.0.0.1", "POST", root + "save", fixture)).toBeNull();
  });
  it("proxy rechaza query incluso vacía de valor, UUID y método antes del backend", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect((await compatibilityProxy(new Request(`http://127.0.0.1:3000/api/pcs/${id}/compatibility/evaluate?owner_id=`, { method: "POST" }), id, "evaluate")).status).toBe(422);
    expect((await compatibilityProxy(new Request("http://127.0.0.1:3000"), id, "evaluate")).status).toBe(405);
    expect((await compatibilityProxy(new Request("http://127.0.0.1:3000", { method: "POST" }), "invalid", "simulate")).status).toBe(422);
  });
});
