/* eslint-disable @typescript-eslint/no-explicit-any -- el fixture sintético se muta a propósito para armar casos inválidos */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PublicTowerShareView from "../../components/public-tower-share-view";
import { splitPieceChecks } from "../../lib/catalog-piece";
import { essentialChecksNote, essentialChecksNoteV2, isEssentialEvaluation, isEssentialTowerEvaluation, physicalSpaceNote, towerEssentialNote, towerResultLabel, towerRuleLabels, type TowerEvaluation } from "../../lib/tower-compatibility";
import { parsePublicTowerShare } from "../../lib/tower-share-dto";
import { syntheticPublicShare } from "../support/tower-share-fixture";

const essentialIds = ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T11"];

// Una evaluación como la que guarda el servidor desde el contrato nuevo: solo T01–T08 y T11.
function essentialShare() {
  const data = syntheticPublicShare() as any;
  data.versions = { ...data.versions, scope: "cu05-tower-essential-1", policy: "tower-essential-policy-1", inventory: "tower-essential-inventory-1", rules: "cu05-tower-essential-engine-1" };
  for (const stage of data.stages) {
    const evaluation = stage.evaluation;
    evaluation.rules_version = "cu05-tower-essential-engine-1";
    evaluation.scope = { ...evaluation.scope, id: "cu05-tower-essential-1", policy_version: "tower-essential-policy-1", inventory_version: "tower-essential-inventory-1" };
    evaluation.rule_results = evaluation.rule_results.filter((rule: { rule_id: string }) => essentialIds.includes(rule.rule_id));
    for (const key of ["required", "implemented", "unknown"]) evaluation.coverage[key] = essentialIds;
    stage.warnings = ["La refrigeración y los ventiladores no se evalúan todavía."];
  }
  return data;
}

// Contrato esencial 2: BIOS fuera de alcance, etiquetas nuevas y espacio físico declarado no evaluado.
function essentialShare2() {
  const data = essentialShare();
  data.versions = { ...data.versions, scope: "cu05-tower-essential-2", policy: "tower-essential-policy-2", inventory: "tower-essential-inventory-1", rules: "cu05-tower-essential-engine-2", labels: "tower-share-labels-es-2" };
  for (const stage of data.stages) {
    const evaluation = stage.evaluation;
    evaluation.rules_version = "cu05-tower-essential-engine-2";
    evaluation.verdict = "compatible";
    evaluation.scope = { ...evaluation.scope, id: "cu05-tower-essential-2", policy_version: "tower-essential-policy-2", inventory_version: "tower-essential-inventory-1" };
    evaluation.rule_results = evaluation.rule_results.map((rule: { rule_id: string }) => ["T04", "T07"].includes(rule.rule_id)
      ? { ...rule, state: "not_applicable", missing_fields: [] }
      : { ...rule, state: "pass", missing_fields: [] });
    evaluation.missing_fields = [];
    const passed = essentialIds.filter(id => !["T04", "T07"].includes(id));
    evaluation.coverage = { required: essentialIds, implemented: essentialIds, evaluated: passed, passed, failed: [], unknown: [], not_applicable: ["T04", "T07"], not_implemented: [], complete: true };
    stage.warnings = ["La refrigeración y los ventiladores no se evalúan todavía."];
  }
  return data;
}

// Cambia el estado de una regla y deja la cobertura coherente, para aislar la validación que se prueba.
function setShareRuleState(data: any, ruleId: string, state: string) {
  const evaluation = data.stages[0].evaluation;
  const rule = evaluation.rule_results.find((item: { rule_id: string }) => item.rule_id === ruleId);
  rule.state = state;
  if (state === "not_applicable") rule.missing_fields = [];
  const ids = (value: string) => evaluation.rule_results.filter((item: { state: string }) => item.state === value).map((item: { rule_id: string }) => item.rule_id);
  evaluation.coverage = { ...evaluation.coverage, passed: ids("pass"), failed: ids("fail"), unknown: ids("unknown"), not_applicable: ids("not_applicable"), evaluated: [...ids("pass"), ...ids("fail")] };
}

function evaluationV2(overrides: Partial<TowerEvaluation> = {}): TowerEvaluation {
  const base = evaluation();
  const passed = essentialIds.filter(id => id !== "T04");
  return {
    ...base,
    rules_version: "cu05-tower-essential-engine-2",
    scope: { id: "cu05-tower-essential-2", policy_version: "tower-essential-policy-2", inventory_version: "tower-essential-inventory-1", label: "Torre", operating_regime: "stock_no_oc", excludes: ["La BIOS no se evalúa: ni su versión ni su ausencia cambian el veredicto"] },
    rule_results: base.rule_results.map(rule => rule.rule_id === "T04" ? { ...rule, state: "not_applicable" as const } : rule),
    coverage: { required: essentialIds, implemented: essentialIds, evaluated: passed, passed, failed: [], unknown: [], not_applicable: ["T04"], not_implemented: [], complete: true },
    ...overrides,
  };
}

function evaluation(overrides: Partial<TowerEvaluation> = {}, essential = true): TowerEvaluation {
  return {
    verdict: "compatible", rule_results: essentialIds.map(rule_id => ({ rule_id, family: rule_id, state: "pass" as const, facts: [], evidence: [], conditions: [], missing_fields: [] })), missing_fields: [],
    rules_version: essential ? "cu05-tower-essential-engine-1" : "cu05-tower-stock-engine-1", data_revision: "synthetic", pc_revision: 1,
    scope: essential
      ? { id: "cu05-tower-essential-1", policy_version: "tower-essential-policy-1", inventory_version: "tower-essential-inventory-1", label: "Torre", operating_regime: "stock_no_oc", excludes: [] }
      : { id: "cu05-tower-stock-1", policy_version: "tower-stock-policy-1", inventory_version: "tower-stock-inventory-1", label: "Torre", operating_regime: "stock_no_oc", excludes: [] },
    coverage: { required: essentialIds, implemented: essentialIds, evaluated: essentialIds, passed: essentialIds, failed: [], unknown: [], not_applicable: [], not_implemented: [], complete: true },
    additional_checks: [], warnings: [], evaluated_configuration: { lines: [] } as unknown as TowerEvaluation["evaluated_configuration"], ...overrides,
  };
}

describe("evaluaciones con comprobaciones esenciales (contrato nuevo)", () => {
  it("aclara junto a «Encaja» que la refrigeración no se evalúa, sin cambiar el veredicto", () => {
    const result = evaluation();
    expect(towerEssentialNote(result)).toBe(essentialChecksNote);
    expect(essentialChecksNote).toBe("Pasó las comprobaciones esenciales. La refrigeración y los ventiladores no se evalúan todavía.");
    expect(towerResultLabel(result)).toBe("Compatible en las comprobaciones esenciales");
    expect(result.verdict).toBe("compatible");
  });
  it("la versión 2 aclara que la BIOS no se evalúa y avisa del espacio físico no evaluado", () => {
    const result = evaluationV2();
    expect(isEssentialTowerEvaluation(result)).toBe(true);
    expect(isEssentialEvaluation(result)).toBe(true);
    expect(towerEssentialNote(result)).toBe(`${essentialChecksNoteV2} ${physicalSpaceNote}`);
    expect(towerEssentialNote(result)).toContain("La BIOS no se evalúa");
    expect(towerEssentialNote(result)).not.toMatch(/BIOS (?:validada|verificada|compatible)/i);
    expect(towerEssentialNote(result)).toContain("Chequeá que entre en tu gabinete");
    expect(towerResultLabel(result)).toBe("Compatible en las comprobaciones esenciales");
    expect(towerRuleLabels.T01).toBe("Procesador y placa");
    expect(towerRuleLabels.T01).not.toContain("BIOS");
  });
  it("la versión 2 sin espacio físico pendiente no agrega el aviso del gabinete", () => {
    const result = { ...evaluationV2(), rule_results: evaluationV2().rule_results.map(rule => rule.rule_id === "T04" ? { ...rule, state: "pass" as const } : rule) };
    expect(towerEssentialNote(result)).toBe(essentialChecksNoteV2);
    expect(towerEssentialNote(result)).not.toContain("Chequeá que entre");
  });
  it("el aviso del gabinete aparece aunque el veredicto no sea compatible", () => {
    expect(towerEssentialNote({ ...evaluationV2(), verdict: "incompatible" })).toBe(physicalSpaceNote);
    expect(towerEssentialNote({ ...evaluationV2(), verdict: "requiere_verificacion" })).toBe(physicalSpaceNote);
  });
  it("mezclar motor 2 con alcance 1 no se considera esencial ni recibe titular verde", () => {
    const mixed = { ...evaluationV2(), scope: { ...evaluationV2().scope, id: "cu05-tower-essential-1" as const, policy_version: "tower-essential-policy-1" as const } };
    expect(isEssentialTowerEvaluation(mixed)).toBe(false);
    expect(towerEssentialNote(mixed)).toBeNull();
    expect(towerResultLabel(mixed)).toMatch(/^Alcance no identificado/);
  });
  it("no agrega la aclaración cuando el servidor no dijo compatible", () => {
    expect(towerEssentialNote(evaluation({ verdict: "incompatible" }))).toBeNull();
    expect(towerEssentialNote(evaluation({ verdict: "requiere_verificacion" }))).toBeNull();
  });
  it("las evaluaciones viejas, que sí revisaban todo, siguen sin aclaración y con su texto", () => {
    const legacy = evaluation({}, false);
    expect(towerEssentialNote(legacy)).toBeNull();
    expect(towerResultLabel(legacy)).toBe("Compatible dentro del alcance torre stock");
  });
  it("un alcance desconocido o una versión mezclada nunca recibe titular verde", () => {
    expect(towerResultLabel(evaluation({ scope: { ...evaluation().scope, id: "otro" as never } }))).toMatch(/^Alcance no identificado/);
    expect(towerEssentialNote(evaluation({ rules_version: "cu05-tower-stock-engine-1" }))).toBeNull();
  });
  it("sigue sin dar titular verde a un resultado incompleto", () => {
    expect(towerResultLabel(evaluation({ coverage: { ...evaluation().coverage, complete: false } }))).toMatch(/^Resultado inconsistente/);
  });
  it("la ficha de pieza funciona sin T09, T10 ni T12", () => {
    const rules = essentialIds.map(rule_id => ({ rule_id }));
    const { related, others } = splitPieceChecks(rules, "cooler");
    expect(related.map(rule => rule.rule_id)).toEqual(["T11"]);
    expect(others).toHaveLength(8);
    expect(splitPieceChecks([], "fan")).toEqual({ related: [], others: [] });
  });
});

describe("planes compartidos: los dos contratos conviven", () => {
  it("el plan nuevo trae 9 reglas, sin T09, T10 ni T12, y se lee", () => {
    const parsed = parsePublicTowerShare(essentialShare());
    const ids = parsed.stages[0].evaluation.rule_results.map(rule => rule.rule_id);
    expect(ids).toEqual(essentialIds);
    expect(parsed.versions.rules).toBe("cu05-tower-essential-engine-1");
  });
  it("el plan nuevo de la versión 2 se lee con espacio físico no evaluado y etiquetas -2", () => {
    const parsed = parsePublicTowerShare(essentialShare2());
    expect(parsed.versions.rules).toBe("cu05-tower-essential-engine-2");
    expect(parsed.versions.labels).toBe("tower-share-labels-es-2");
    expect(parsed.stages[0].evaluation.rules_version).toBe("cu05-tower-essential-engine-2");
    expect(parsed.stages[0].evaluation.rule_results.find(rule => rule.rule_id === "T04")?.state).toBe("not_applicable");
    expect(parsed.stages[0].evaluation.rule_results.find(rule => rule.rule_id === "T07")?.state).toBe("not_applicable");
    expect(parsed.stages[0].evaluation.rule_results.find(rule => rule.rule_id === "T01")?.facts).toEqual([]);
  });
  it("mezclar la versión 2 con versiones o alcance de la versión 1 se rechaza", () => {
    const rules = essentialShare2(); rules.versions.rules = "cu05-tower-essential-engine-1";
    expect(() => parsePublicTowerShare(rules)).toThrow();
    const scope = essentialShare2(); scope.stages[0].evaluation.scope.id = "cu05-tower-essential-1";
    expect(() => parsePublicTowerShare(scope)).toThrow();
    const policy = essentialShare2(); policy.stages[0].evaluation.scope.policy_version = "tower-essential-policy-1";
    expect(() => parsePublicTowerShare(policy)).toThrow();
    const planScope = essentialShare2(); planScope.versions.scope = "cu05-tower-essential-1";
    expect(() => parsePublicTowerShare(planScope)).toThrow();
    const label = essentialShare2(); label.versions.labels = "tower-share-labels-es-1";
    expect(() => parsePublicTowerShare(label)).not.toThrow();
  });
  it("la versión 2 también admite T08 no evaluado por depender del gabinete", () => {
    const storage = essentialShare2();
    setShareRuleState(storage, "T08", "not_applicable");
    const parsed = parsePublicTowerShare(storage);
    expect(parsed.stages[0].evaluation.coverage.not_applicable).toEqual(["T04", "T07", "T08"]);
  });
  it("la versión 2 solo acepta not_applicable en T04, T06, T07 o T08", () => {
    for (const ruleId of ["T01", "T02", "T03", "T05", "T11"]) {
      const data = essentialShare2();
      setShareRuleState(data, ruleId, "not_applicable");
      expect(() => parsePublicTowerShare(data), `${ruleId} no puede quedar fuera de alcance`).toThrow();
    }
  });
  it("un plan stock o esencial v1 no puede declarar not_applicable, aunque la cobertura sea coherente", () => {
    const oldEssential = essentialShare();
    setShareRuleState(oldEssential, "T04", "not_applicable");
    expect(() => parsePublicTowerShare(oldEssential)).toThrow();
    const legacy = syntheticPublicShare() as any;
    setShareRuleState(legacy, "T04", "not_applicable");
    expect(() => parsePublicTowerShare(legacy)).toThrow();
  });
  it("rechaza coberturas que no describen exactamente los estados de las reglas", () => {
    const missingNA = essentialShare2();
    missingNA.stages[0].evaluation.coverage.not_applicable = ["T04"];
    expect(() => parsePublicTowerShare(missingNA)).toThrow();
    const evaluated = essentialShare2();
    evaluated.stages[0].evaluation.coverage.evaluated = [];
    expect(() => parsePublicTowerShare(evaluated)).toThrow();
    const passed = essentialShare2();
    passed.stages[0].evaluation.coverage.passed = passed.stages[0].evaluation.coverage.passed.slice(1);
    expect(() => parsePublicTowerShare(passed)).toThrow();
    const failed = essentialShare2();
    failed.stages[0].evaluation.coverage.failed = ["T05"];
    expect(() => parsePublicTowerShare(failed)).toThrow();
    const unknown = essentialShare2();
    unknown.stages[0].evaluation.coverage.unknown = ["T06"];
    expect(() => parsePublicTowerShare(unknown)).toThrow();
  });
  it("la versión 2 rechaza hechos de BIOS en T01 porque la mezcla con la política vieja", () => {
    const bios = essentialShare2();
    bios.stages[0].evaluation.rule_results.find((rule: { rule_id: string }) => rule.rule_id === "T01").facts = [{ name: "bios_requirement_met", value: true }];
    expect(() => parsePublicTowerShare(bios)).toThrow();
  });
  it("el plan guardado con el contrato viejo se lee igual, con sus 12 reglas", () => {
    const parsed = parsePublicTowerShare(syntheticPublicShare());
    expect(parsed.stages[0].evaluation.rule_results).toHaveLength(12);
    expect(parsed.stages[0].evaluation.scope.id).toBe("cu05-tower-stock-1");
  });
  it("el contrato viejo no se afloja: con menos de 12 reglas, con alcance nuevo o con etiqueta ajena se rechaza", () => {
    const fewer = syntheticPublicShare() as any;
    fewer.stages[0].evaluation.rule_results = fewer.stages[0].evaluation.rule_results.slice(0, 9);
    expect(() => parsePublicTowerShare(fewer)).toThrow();
    const mixed = syntheticPublicShare() as any;
    mixed.stages[0].evaluation.scope.id = "cu05-tower-essential-1";
    expect(() => parsePublicTowerShare(mixed)).toThrow();
    const label = syntheticPublicShare() as any;
    label.stages[0].evaluation.scope.label = "Otra etiqueta";
    expect(() => parsePublicTowerShare(label)).toThrow();
    const warning = syntheticPublicShare() as any;
    warning.stages[0].warnings = ["Otro aviso"];
    expect(() => parsePublicTowerShare(warning)).toThrow();
  });
  it("el contrato nuevo exige exactamente T01–T08 y T11, y que plan y etapas hablen de la misma versión", () => {
    const withCooling = essentialShare();
    withCooling.stages[0].evaluation.rule_results.push({ rule_id: "T09", family: "T09", state: "unknown", reason: "Dato", facts: [], references: [], missing_fields: [] });
    expect(() => parsePublicTowerShare(withCooling)).toThrow();
    const missingRule = essentialShare();
    missingRule.stages[0].evaluation.rule_results.pop();
    expect(() => parsePublicTowerShare(missingRule)).toThrow();
    const versions = essentialShare();
    versions.versions.rules = "cu05-tower-stock-engine-1";
    expect(() => parsePublicTowerShare(versions)).toThrow();
  });
  it("el plan compartido nuevo con veredicto compatible muestra la aclaración en lenguaje común", () => {
    const data = parsePublicTowerShare(essentialShare());
    data.stages[0].evaluation.verdict = "compatible";
    const html = renderToStaticMarkup(<PublicTowerShareView data={data} />);
    expect(html).toContain(essentialChecksNote);
    const legacy = parsePublicTowerShare(syntheticPublicShare());
    legacy.stages[0].evaluation.verdict = "compatible";
    expect(renderToStaticMarkup(<PublicTowerShareView data={legacy} />)).not.toContain("no se evalúan todavía");
  });
});
