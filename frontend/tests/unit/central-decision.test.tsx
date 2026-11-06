import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { actionLabel, configurationNextSteps, missingLabel, pendingGroups, workloadLabel } from "../../lib/central-presentation";
import { BenefitSummary, CostSummary, PendingFields } from "../../components/central-decision";
import TowerInventory from "../../components/tower-inventory";
import TowerPlanEditor from "../../components/tower-plan-editor";
import { emptyTower, towerKeys, type Tower } from "../../lib/towers";
import type { PlanCost } from "../../lib/tower-plans";
import type { JsonValue } from "../../lib/compatibility";

describe("central decision presentation, no domain inference", () => {
  it("offers human next steps for explicit base absences without treating optional categories as mandatory", () => {
    const pc: Tower = { ...emptyTower(), id: "12345678-1234-1234-1234-123456789abc", revision: 1, origin_schema: 2 };
    for (const category of towerKeys) pc.category_status[category] = "absent";
    pc.category_status.cpu = "present";
    const before = JSON.stringify(pc), steps = configurationNextSteps(pc);
    expect(steps).toHaveLength(1); expect(steps[0]).toContain("Placa madre, Memoria RAM, Fuente, Gabinete, Almacenamiento");
    expect(steps[0]).not.toMatch(/Gráfica|Refrigeración|Ventiladores/);
    const fields = Array.from({ length: 56 }, () => "unmapped-engine-code");
    const html = renderToStaticMarkup(<PendingFields fields={fields} configuration={pc} />);
    expect(html).toContain("56 datos o condiciones pendientes"); expect(html).toContain("no de piezas distintas"); expect(html).toContain('href="/pcs"');
    expect(html.match(/<code>unmapped-engine-code<\/code>/g)).toHaveLength(56); expect(JSON.stringify(pc)).toBe(before);
  });
  it("keeps unknown declarations distinct from absent and never diagnoses a BIOS version", () => {
    const pc: Tower = { ...emptyTower(), id: "12345678-1234-1234-1234-123456789abc", revision: 1, origin_schema: 2 };
    expect(configurationNextSteps(pc)[0]).toContain("Confirmá qué tenés"); expect(configurationNextSteps(pc)[0]).not.toContain("Elegí");
    expect(missingLabel("context.bios_version")).toContain("no se evalúa");
    expect(missingLabel("context.bios_version")).not.toMatch(/Confirmá|Revisá/);
    expect(missingLabel("context.bios_version:guessed")).toContain("pendiente");
  });
  it("does not manufacture pending hardware when the server has no pending entries", () => {
    const pc: Tower = { ...emptyTower(), id: "12345678-1234-1234-1234-123456789abc", revision: 1, origin_schema: 2 };
    expect(renderToStaticMarkup(<PendingFields fields={[]} configuration={pc} />)).toBe("");
  });
  it("groups recognized duplicates in stable order and accounts for every omitted or unknown entry", () => {
    const fields: readonly JsonValue[] = ["cpu.socket", "cpu.socket", "offer.missing", "stages.2.offer:unidentified_component", "search:bounded_not_exhaustive", "search:bounded_not_exhaustive", null, false, 0, { sentinel: "<script>synthetic</script>" }, ["a"], "unknownNonce", "__proto__", "constructor"];
    const before = JSON.stringify(fields), grouped = pendingGroups(fields);
    expect(grouped.total).toBe(14); expect(grouped.unknownCount).toBe(8);
    expect(grouped.groups).toEqual([
      { summary: "Falta confirmar el socket del procesador", count: 2 },
      { summary: "Falta una cotización", count: 1 },
      { summary: "Etapa 2: componente sin identificar; falta cotización", count: 1 },
    ]);
    expect(grouped.remainingCount).toBe(10);
    expect(grouped.groups.reduce((sum, group) => sum + group.count, 0) + grouped.remainingCount).toBe(fields.length);
    expect(JSON.stringify(fields)).toBe(before);
    expect(pendingGroups([])).toEqual({ total: 0, groups: [], remainingCount: 0, unknownCount: 0 });
  });
  it("renders one remaining notice, duplicate count and full original evidence rather than repeated generic bullets", () => {
    const fields: readonly JsonValue[] = ["cpu.socket", "cpu.socket", null, false, 0, "unknownNonce"];
    const html = renderToStaticMarkup(<PendingFields fields={fields} />), visible = html.split("<details>")[0];
    expect(visible).toContain("6 datos o condiciones pendientes");
    expect(visible.match(/Falta confirmar el socket del procesador/g)).toHaveLength(1);
    expect(visible).toContain("(2 entradas)");
    expect(visible.match(/Otros 4 datos o condiciones requieren revisión/g)).toHaveLength(1);
    expect(visible).not.toContain("Dato o condición pendiente;"); expect(visible).not.toContain("Detalle técnico pendiente;");
    expect(html.match(/<code>cpu.socket<\/code>/g)).toHaveLength(2);
    for (const value of ["null", "false", "0", "unknownNonce"]) expect(html).toContain(`<code>${value}</code>`);
  });
  it("counts all unknown JSON values once in the summary while retaining nested escaped raw data", () => {
    const fields: readonly JsonValue[] = [null, false, 0, { sentinel: "<script>synthetic</script>" }, ["a"], "unknownNonce"];
    const html = renderToStaticMarkup(<PendingFields fields={fields} />), visible = html.split("<details>")[0];
    expect(pendingGroups(fields)).toEqual({ total: 6, groups: [], remainingCount: 6, unknownCount: 6 });
    expect(visible.match(/Otros 6 datos o condiciones requieren revisión/g)).toHaveLength(1);
    expect(html).toContain("&lt;script&gt;synthetic&lt;/script&gt;"); expect(html).toContain("&quot;a&quot;"); expect(html).not.toContain("<script>"); expect(html).not.toContain("[object Object]");
  });
  it("translates only closed actions and exact stage offer pattern", () => {
    expect(actionLabel("replace_category")).toBe("Reemplazar conjunto completo");
    expect(actionLabel("add_line")).toBe("Añadir línea");
    expect(missingLabel("stages.2.offer:unidentified_component")).toBe("Etapa 2: componente sin identificar; falta cotización");
    for (const code of ["stages.2.offer:new_reason", "stages.0.offer:unidentified_component", "stages.2.offer:unidentified_component:extra", "__proto__", "constructor", "unrecognized"]) {
      expect(missingLabel(code)).toContain("pendiente");
      expect(actionLabel(code)).toContain("sin traducción");
    }
  });
  it("keeps every pending value and count, including unknown and long codes", () => {
    const fields = ["stages.2.offer:unidentified_component", "cpu.socket", "offer.missing", "unrecognized-".repeat(30)];
    const before = JSON.stringify(fields), html = renderToStaticMarkup(<PendingFields fields={fields} />);
    expect(html).toContain("4 datos o condiciones pendientes");
    expect(html).toContain("Etapa 2: componente sin identificar; falta cotización");
    expect(html).toContain("Todos los datos pendientes y códigos originales (4)");
    for (const field of fields) expect(html).toContain(`<code>${field}</code>`);
    expect(html).not.toContain("compatible"); expect(JSON.stringify(fields)).toBe(before);
  });
  it("distinguishes null total, zero known subtotal and server budget false without arithmetic", () => {
    const cost: PlanCost = { total_ars: null, known_subtotal_ars: "0.00", within_budget: null, missing_fields: ["offer.missing"], lines: [], excluded: ["shipping", "financing", "labor"] };
    const before = JSON.stringify(cost), html = renderToStaticMarkup(<CostSummary cost={cost} budget="0.01" />);
    expect(html).toContain("Total desconocido / incompleto"); expect(html).toContain("Subtotal conocido"); expect(html).toContain("ARS 0,00"); expect(html).toContain("ARS 0,01"); expect(html).toContain("Presupuesto sin verificar");
    const blocked = renderToStaticMarkup(<CostSummary cost={{ ...cost, total_ars: "900719925474099300.19", within_budget: false }} />);
    expect(blocked).toContain("Supera el presupuesto"); expect(blocked).toContain("900.719.925.474.099.300,19"); expect(JSON.stringify(cost)).toBe(before);
  });
  it("preserves all JSON pending values, counts null/false/zero and safely escapes nested evidence", () => {
    const fields: readonly JsonValue[] = [null, false, 0, { sentinel: "<script>alert('synthetic')</script>", nested: { value: null, flag: false, count: 0 } }, ["a"], "stages.2.offer:unidentified_component"];
    const before = JSON.stringify(fields), html = renderToStaticMarkup(<PendingFields fields={fields} />);
    expect(html).toContain("6 datos o condiciones pendientes");
    expect(html).toContain("Detalle técnico pendiente; consultá la evidencia original");
    expect(html).toContain("<code>null</code>"); expect(html).toContain("<code>false</code>"); expect(html).toContain("<code>0</code>");
    expect(html).toContain("&quot;sentinel&quot;"); expect(html).toContain("&lt;script&gt;"); expect(html).toContain("&lt;/script&gt;");
    expect(html).toContain("&quot;nested&quot;"); expect(html).toContain("&quot;value&quot;: null"); expect(html).toContain("&quot;flag&quot;: false"); expect(html).toContain("&quot;count&quot;: 0"); expect(html).toContain("&quot;a&quot;");
    expect(html).toContain("Etapa 2: componente sin identificar; falta cotización");
    expect(html).not.toContain("<script>"); expect(html).not.toContain("[object Object]"); expect(html).not.toContain("compatible"); expect(JSON.stringify(fields)).toBe(before);
  });
  it("shows Spanish workload but preserves raw benefit label and workload without calculating FPS", () => {
    const benefit = { status: "unknown" as const, before: null, after: null, source: [], label: "Original English reference", workload: "blender-cpu" };
    const html = renderToStaticMarkup(<BenefitSummary benefit={benefit} />);
    expect(html).toContain("Blender: render con procesador"); expect(html).toContain("Original English reference"); expect(html).toContain("blender-cpu"); expect(html).toContain("no mide el rendimiento universal");
    expect(workloadLabel("unknown-workload")).toContain("sin traducción"); expect(workloadLabel(null)).toBe("Trabajo no especificado");
  });
  it("renders nine categories without inventing absent parts, quantity or RAM capacity", () => {
    const pc: Tower = { ...emptyTower(), id: "12345678-1234-1234-1234-123456789abc", revision: 1, origin_schema: 2 };
    pc.category_status.storage = "absent"; pc.category_status.ram = "present";
    pc.lines = [{ line_id: null, category: "ram", component_id: null, declared_model: "RAM declarada sin ficha", quantity: 2 }];
    const before = JSON.stringify(pc), html = renderToStaticMarkup(<TowerInventory pc={pc} />);
    expect((html.match(/<h3>/g) ?? [])).toHaveLength(towerKeys.length);
    expect((html.match(/Falta un dato/g) ?? [])).toHaveLength(7);
    expect(html).toContain("No tengo (declarado)"); expect(html).toContain("Cantidad explícita: 2 módulos; capacidad total no calculada"); expect(html).not.toContain("GB"); expect(JSON.stringify(pc)).toBe(before);
  });
  it("keeps stage editor semantic selectors, explicit consent and disabled save after grid regrouping", () => {
    const pc: Tower = { ...emptyTower(), id: "12345678-1234-1234-1234-123456789abc", revision: 1, origin_schema: 2 };
    const html = renderToStaticMarkup(<TowerPlanEditor pc={pc} onSaved={() => {}} seed={{ name: "Plan sintético", pc_id: pc.id, expected_pc_revision: 1, expected_catalog_version: "synthetic", objective: "general", workload: null, budget_ars: "10.00", price_condition: "cash", stages: [1, 2].map(index => ({ name: `Etapa ${index}`, budget_ars: "5.00", materials: [], actions: [{ category: "storage", action: "replace_category", line_id: null, candidates: [{ component_id: null, declared_model: "Disco declarado sin ficha", quantity: 1 }] }] })) }} />);
    expect(html).toContain('aria-label="Editor de plan de torre"'); expect(html).toContain('aria-label="Editar etapa 2"');
    expect(html).toContain("Almacenamiento"); expect(html).toContain("Reemplazar conjunto completo"); expect(html).toContain("storage · replace_category");
    expect(html).toContain("Revisé etapas, cantidades y contexto; confirmo guardar sin modificar mi PC");
    expect(html).not.toContain('checked=""'); expect(html).toMatch(/<button disabled="">Confirmar y guardar mi plan/);
  });
});
