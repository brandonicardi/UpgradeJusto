import { describe, expect, it } from "vitest";
import { planInput, planError, draftStages, type Plan } from "../../lib/plans";
import { plansProxy } from "../../lib/plans-proxy";
import { signedProxyHeaders } from "../../lib/gateway";
import type { PC } from "../../lib/pcs";

const pc: PC = { id: "11111111-1111-1111-1111-111111111111", revision: 2, name: "synthetic-unit-PC", components: [], context: { bios_version: null, notes: null } };
const stages = () => [{ name: " stage one ", replacements: [{ category: "ram" as const, candidates: [{ component_id: "unit-ram", quantity: "2" }], bios: "" }] }];

describe("CU07 G contrato de formulario y proxy, no motor cliente", () => {
  it("preserva etapas ordenadas y adquisiciones repetidas sin alterar PC", () => {
    const before = JSON.stringify(pc), draft = stages();
    draft.push({ ...stages()[0], name: "second" });
    const result = planInput(" plan ", pc, "general", "123.40", draft);
    expect(result.name).toBe("plan"); expect(result.budget_ars).toBe("123.40");
    expect(result.expected_pc_revision).toBe(2); expect(result.stages.map(stage => stage.name)).toEqual(["stage one", "second"]);
    expect(result.stages[0].replacements[0].candidates[0].quantity).toBe(2);
    expect(result.stages[1].replacements).toEqual(result.stages[0].replacements);
    expect(result).not.toHaveProperty("cost"); expect(result).not.toHaveProperty("status"); expect(JSON.stringify(pc)).toBe(before);
  });
  it("rechaza nombres/etapas vacías y más de12, sin truncar ni guardar parcialmente", () => {
    expect(() => planInput("", pc, "general", "1", stages())).toThrow();
    expect(() => planInput("plan", pc, "general", "1", [])).toThrow();
    expect(() => planInput("plan", pc, "general", "1", Array.from({ length: 13 }, () => stages()[0]))).toThrow();
    expect(() => planInput("plan", pc, "general", "1", [{ ...stages()[0], name: "\0" }])).toThrow();
  });
  it("editar snapshot reconstruye solo entrada, sin reenviar evaluación/precio", () => {
    // Deliberately minimal synthetic snapshot: draftStages reads only normalized stage input.
    const snapshot = { stages: [{ name: "board", replacements: [{ category: "motherboard", candidates: [{ component_id: "unit-board", quantity: 1 }], candidate_context: { bios_version: null } }], evaluation: { verdict: "unknown" }, cost: { total_ars: null } }] } as unknown as Plan;
    const draft = draftStages(snapshot);
    expect(draft[0].replacements[0].bios).toBe("");
    expect(draft[0]).not.toHaveProperty("cost"); expect(draft[0]).not.toHaveProperty("evaluation");
  });
  it("gateway permite solo raíz GET/POST y UUID GET/PUT/DELETE, sin compartir todavía", () => {
    const root = "/api/plans", detail = root + "/" + pc.id, fixture = "synthetic-unit-fixture-not-runtime-secret";
    for (const method of ["GET", "POST"]) expect(signedProxyHeaders("127.0.0.1", method, root, fixture)).not.toBeNull();
    for (const method of ["GET", "PUT", "DELETE"]) expect(signedProxyHeaders("127.0.0.1", method, detail, fixture)).not.toBeNull();
    for (const [method, path] of [["PUT", root], ["POST", detail], ["PATCH", detail], ["GET", detail + "/share"], ["GET", detail + "?owner="], ["GET", root + "/invalid"]]) expect(signedProxyHeaders("127.0.0.1", method, path, fixture)).toBeNull();
  });
  it("proxy rechaza queries/duplicados/vacíos/métodos/UUID antes de contactar backend", async () => {
    for (const query of ["?owner=", "?owner", "?page=", "?page=1&page=2", "?page_size=51"]) {
      const response = await plansProxy(new Request("http://127.0.0.1:3000/api/plans" + query));
      expect(response.status).toBe(422); expect(response.headers.get("cache-control")).toBe("no-store");
    }
    for (const method of ["GET", "PUT", "DELETE"]) expect((await plansProxy(new Request(`http://127.0.0.1:3000/api/plans/${pc.id}?owner=`, { method }), pc.id)).status).toBe(422);
    expect((await plansProxy(new Request("http://127.0.0.1:3000/api/plans", { method: "PUT" }))).status).toBe(405);
    expect((await plansProxy(new Request("http://127.0.0.1:3000/api/plans/bad"), "bad")).status).toBe(422);
    expect(planError(409, "PC revision conflict")).toContain("La PC cambió");
    expect(planError(409, "Plan revision conflict")).toContain("Recargá el detalle");
  });
});
