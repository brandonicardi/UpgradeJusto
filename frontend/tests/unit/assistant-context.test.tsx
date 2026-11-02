import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { messageInput } from "../../lib/assistant";
import { assistantContext, createContextRequestEpoch, emptyTurnCriteria, towerTurnContext, turnObjective, type AssistantContext } from "../../lib/assistant-context";
import { emptyTower, type Tower } from "../../lib/towers";
import TowerChatContext, { TowerChatSummary } from "../../components/tower-chat-context";

const id = "12345678-1234-1234-1234-123456789abc";
const pc = (): Tower => ({ ...emptyTower(), id, name: "Torre sintética", revision: 1, origin_schema: 2 });
const context = () => towerTurnContext(pc(), emptyTurnCriteria());
describe("CU08 optional per-turn context, structural validation not authorization", () => {
  it("invalidates old page/reload tickets at user intent before effect cleanup", () => {
    const requests = createContextRequestEpoch(), initial = requests.current();
    expect(requests.isCurrent(initial)).toBe(true);
    const nextPage = requests.advance();
    expect(requests.isCurrent(initial)).toBe(false); expect(requests.isCurrent(nextPage)).toBe(true);
    const reload = requests.advance();
    expect(requests.isCurrent(initial)).toBe(false); expect(requests.isCurrent(nextPage)).toBe(false); expect(requests.isCurrent(reload)).toBe(true);
    const anotherContext = createContextRequestEpoch();
    anotherContext.advance(); expect(requests.isCurrent(reload)).toBe(true);
  });
  it("preserves old two-argument input and copies only the exact context keys", () => {
    expect(messageInput(" hola ", id)).toEqual({ content: "hola", client_request_id: id });
    const source = { ...context(), user_id: "never", role: "admin", notes: "never", models: ["never"], confirmed: true, quantity: 5, source: "never" };
    const body = messageInput("hola", id, source);
    expect(Object.keys(body.context!).sort()).toEqual(["context_version", "configuration_schema", "pc_id", "expected_pc_revision", "objective", "budget_ars", "price_condition", "workload"].sort());
    expect(body.context).toEqual(context()); expect(body.context).not.toBe(source); expect(Object.isFrozen(body.context)).toBe(true);
    source.expected_pc_revision = 2; expect(body.context?.expected_pc_revision).toBe(1);
  });
  it("rejects invalid version/schema/identity/revision/enums without coercion", () => {
    for (const patch of [{ context_version: 1 }, { context_version: "2" }, { configuration_schema: 3 }, { pc_id: "not-a-uuid" }, { expected_pc_revision: "1" }, { expected_pc_revision: 0 }, { expected_pc_revision: 1.5 }, { objective: "other" }, { price_condition: "installments" }, { price_condition: null }, { workload: "other" }]) expect(() => assistantContext({ ...context(), ...patch } as unknown as AssistantContext)).toThrow();
    expect(assistantContext({ ...context(), configuration_schema: 1 }).configuration_schema).toBe(1);
    expect(() => towerTurnContext({ ...pc(), origin_schema: 1 }, emptyTurnCriteria())).toThrow();
  });
  it("keeps optional budget null distinct from zero and exact decimal string", () => {
    expect(context().budget_ars).toBeNull();
    expect(towerTurnContext(pc(), { ...emptyTurnCriteria(), budget: "900719925474099300.19" }).budget_ars).toBe("900719925474099300.19");
    for (const budget of ["0", "0.00", "1e3", "-1", "1,00", "01", "NaN"]) expect(() => towerTurnContext(pc(), { ...emptyTurnCriteria(), budget })).toThrow();
    expect(() => assistantContext({ ...context(), budget_ars: 10 } as unknown as AssistantContext)).toThrow();
  });
  it("clears workload on objective change and rejects mismatched context at submit", () => {
    const criteria = { ...emptyTurnCriteria(), objective: "productivity" as const, workload: "blender-cpu" as const };
    expect(turnObjective(criteria, "gaming").workload).toBeNull(); expect(criteria.workload).toBe("blender-cpu");
    expect(() => towerTurnContext(pc(), { ...criteria, objective: "gaming" })).toThrow();
    expect(towerTurnContext(pc(), criteria).workload).toBe("blender-cpu");
  });
  it("renders nine states/quantity without attaching or displaying notes/models", () => {
    const tower = pc(); tower.category_status.storage = "absent"; tower.category_status.ram = "present"; tower.context.notes = "PRIVATE_SENTINEL";
    tower.lines = [{ line_id: null, category: "ram", component_id: null, declared_model: "MODEL_SENTINEL", quantity: 2 }];
    const html = renderToStaticMarkup(<TowerChatSummary pc={tower} />);
    expect(html).toContain("revisión 1"); expect(html.match(/<li>/g)).toHaveLength(9); expect(html).toContain("No sé / por confirmar"); expect(html).toContain("No tengo (declarado)"); expect(html).toContain("2 módulos; capacidad no calculada"); expect(html).not.toContain("PRIVATE_SENTINEL"); expect(html).not.toContain("MODEL_SENTINEL");
    expect(JSON.stringify(towerTurnContext(tower, emptyTurnCriteria()))).not.toMatch(/SENTINEL|quantity|notes|models/);
  });
  it("starts with no chosen context, explains transient selection and never sends on mount", () => {
    let calls = 0;
    const html = renderToStaticMarkup(<TowerChatContext disabled={false} onChange={() => { calls++; }} />);
    expect(html).toContain("Ninguna"); expect(html).toContain("Solo este turno; selección no guardada en conversación"); expect(html).toContain("Consultando…"); expect(html).toMatch(/disabled=""[^>]*>Torres siguientes/); expect(calls).toBe(0);
  });
});
