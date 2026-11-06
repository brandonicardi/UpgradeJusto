// Structural, allowlist-only consumer. These checks never authorize access or
// recompute a verdict. Unknown keys are omitted; schema1 is not adapted.
type Schema<T> = (value: unknown) => T;
function invalid(): never { throw new Error("Share data unavailable"); }
const text = (max = 500): Schema<string> => value => typeof value === "string" && value.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value) ? value : invalid();
const match = (pattern: RegExp): Schema<string> => value => typeof value === "string" && pattern.test(value) ? value : invalid();
const literal = <T extends string | number | boolean>(expected: T): Schema<T> => value => value === expected ? expected : invalid();
const enumeration = <T extends string>(...options: T[]): Schema<T> => value => typeof value === "string" && options.includes(value as T) ? value as T : invalid();
const bool: Schema<boolean> = value => typeof value === "boolean" ? value : invalid();
const integer = (min = 0, max = 1000000000): Schema<number> => value => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max ? value : invalid();
const nullable = <T>(schema: Schema<T>): Schema<T | null> => value => value === null ? null : schema(value);
const optional = <T>(schema: Schema<T>): Schema<T | undefined> => value => value === undefined ? undefined : schema(value);
const array = <T>(schema: Schema<T>, max = 10000, min = 0): Schema<T[]> => value => Array.isArray(value) && value.length >= min && value.length <= max ? value.map(schema) : invalid();
function object<S extends Record<string, Schema<unknown>>>(shape: S): Schema<{ [K in keyof S]: ReturnType<S[K]> }> {
  return value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
    const input = value as Record<string, unknown>, output: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) { const parsed = shape[key](Object.hasOwn(input, key) ? input[key] : undefined); if (parsed !== undefined) output[key] = parsed; }
    return output as { [K in keyof S]: ReturnType<S[K]> };
  };
}
export const shareUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const shareTokenPath = /^[A-Za-z0-9_-]{1,128}$/;
export const shareTitles = ["Plan de mejora de torre", "Plan de mejora por etapas"] as const;
const title = enumeration(...shareTitles), money = match(/^(?:0|[1-9]\d{0,23})\.\d{2}$/), decimal = match(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const positiveMoney: Schema<string> = value => { const amount = money(value); return /[1-9]/.test(amount) ? amount : invalid(); };
const iso: Schema<string> = value => { const result = text(60)(value); return /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(result) && Number.isFinite(Date.parse(result)) ? result : invalid(); };
const pRef = match(/^p[1-9]\d*$/), lRef = match(/^l[1-9]\d*$/), qRef = match(/^q[1-9]\d*$/), rRef = match(/^r[1-9]\d*$/);
const resourceRef = match(/^R[1-9]\d*$/), groupRef = match(/^G[1-9]\d*$/);
const category = enumeration("cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan"), presence = enumeration("present", "absent", "unknown"), condition = enumeration("cash", "list"), status = enumeration("ready", "blocked", "requires_verification");
const ruleId = enumeration("T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09", "T10", "T11", "T12");
const projectionVersion = literal("tower-share-projection-1");
export const safeShareURL: Schema<string> = value => {
  const source = text(4000)(value);
  try { const url = new URL(source); if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || !url.hostname.includes(".") || /^[\d.]+$/.test(url.hostname) || /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) return invalid(); return url.href; } catch { return invalid(); }
};
const reference = object({ ref: rRef, class: enumeration("manufacturer_spec", "manufacturer_manual", "manufacturer_support", "manufacturer_policy", "retail_product", "benchmark_blender_cpu", "benchmark_tpu_raster"), url: safeShareURL, consulted_on: match(/^\d{4}-\d\d-\d\d$/), locator: text() });
const resource = object({ ref: resourceRef, kind: enumeration("fan", "storage-bay", "SATA", "M2-NVMe", "M2-SATA", "PCIe"), accepts: array(text(50), 32), group: nullable(groupRef), excludes: array(resourceRef, 100), voltage_mv: nullable(integer(1)), max_current_ma: nullable(integer(1)), cost: integer(1) });
const coolerSummary = { cooler_sockets: optional(array(enumeration("AM4", "AM5", "LGA1700", "LGA1851"), 4)), cooler_type: optional(enumeration("air", "liquid", "passive")), cooler_height_mm: optional(integer(1)), fan_count: optional(integer(0, 1000000)), fan_voltage_mv: optional(integer(1)), fan_current_ma: optional(integer(1)), fan_connector: optional(enumeration("3pin", "4pin")), thermal_compound_required_on_remount: optional(bool), thermal_compound_included: optional(bool) };
const summarySchemas = {
  cpu: object({ ...coolerSummary, stock_cooler_included: optional(bool) }), cooler: object(coolerSummary),
  motherboard: object({ tower_ports: optional(array(resource)), fan_headers: optional(array(resource)), shared_limits: optional(array(object({ group: groupRef, capacity: integer(0, 1000000) }))), fan_total_current_ma: optional(integer()) }),
  case: object({ storage_bays: optional(array(resource)), cooler_height_limit_mm: optional(integer(1)), fan_positions: optional(integer(0, 1000000)), fan_supported_sizes_mm: optional(array(integer(1), 32)) }),
  storage: object({ storage_interface: optional(enumeration("SATA", "M2-NVMe", "M2-SATA")), storage_form: optional(enumeration("2.5-inch", "3.5-inch", "2242", "2260", "2280", "22110")), sata_power_count: optional(integer(0, 1000000)) }),
  gpu: object({ tower_port_kind: optional(literal("PCIe")), tower_port_form: optional(enumeration("x1", "x4", "x8", "x16")) }), psu: object({ sata_power_count: optional(integer(0, 1000000)) }),
  fan: object({ fan_size_mm: optional(integer(1)), fan_voltage_mv: optional(integer(1)), fan_current_ma: optional(integer(1)), fan_connector: optional(enumeration("3pin", "4pin")) }), ram: object({}),
};
const componentBase = object({ ref: pRef, category, name: text(), image: nullable(object({ url: safeShareURL, retrieved_at: iso, rights_notice: literal("Imagen referenciada del proveedor; no se transfieren derechos"), bytes_verified: bool, alt: text() })), references: array(rRef), evidence_summary: (value: unknown) => value });
const component = (value: unknown) => { const part = componentBase(value); return { ...part, evidence_summary: summarySchemas[part.category](part.evidence_summary) }; };
const config = object({ schema_version: literal(2), category_status: object({ cpu: presence, motherboard: presence, ram: presence, gpu: presence, psu: presence, case: presence, storage: presence, cooler: presence, fan: presence }), lines: array(object({ line_ref: lRef, category, component_ref: pRef, quantity: integer(1, 32) }), 36) });
const missing = <T extends string>(code: T) => array(object({ code: literal(code), count: integer(1) }), 100);
const cost = object({ total_ars: nullable(money), known_subtotal_ars: money, within_budget: nullable(bool), lines: array(object({ component_ref: pRef, quote_ref: qRef, quantity: integer(1, 1000000), unit_amount_ars: money, amount_ars: money })), missing_fields: missing("quote_unresolved"), excluded: (value: unknown) => { const values = array(enumeration("shipping", "financing", "labor"), 3, 3)(value); return new Set(values).size === 3 ? values : invalid(); } });
const benefit = object({ status: enumeration("supported", "unknown", "not_an_improvement"), before: nullable(decimal), after: nullable(decimal), source: array(rRef), label: literal("Referencia técnica; no FPS ni rendimiento garantizado") });
const factValue: Schema<null | boolean | number | string | (number | string)[]> = value => {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : invalid();
  if (typeof value === "string") return text(100)(value);
  return array< string | number >(item => typeof item === "number" ? integer(1)(item) : text(50)(item), 100)(value);
};
const fact = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  const input = value as Record<string, unknown>;
  return Object.hasOwn(input, "component_ref") ? object({ name: text(200), component_ref: pRef })(input) : object({ name: text(200), value: factValue, unit: optional(enumeration("mm", "W")) })(input);
};
// Tres contratos de evaluación conviven: los planes guardados antes conservan el completo (12 reglas, `stock`)
// y los nuevos traen solo las comprobaciones esenciales (T01–T08 y T11), en su versión 1 o 2. Cada plan debe ser coherente con uno solo.
export const legacyTowerContract = { rules: "cu05-tower-stock-engine-1", scope: "cu05-tower-stock-1", policy: "tower-stock-policy-1", inventory: "tower-stock-inventory-1", label: "Torre stock: asignación nominal, no certificación física", stageWarning: "Alcance nominal; verificar detalles técnicos reservados", ruleIds: ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09", "T10", "T11", "T12"] } as const;
export const essentialTowerContract = { rules: "cu05-tower-essential-engine-1", scope: "cu05-tower-essential-1", policy: "tower-essential-policy-1", inventory: "tower-essential-inventory-1", ruleIds: ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T11"] } as const;
// La política 2 deja la BIOS fuera de alcance y puede declarar espacio físico como no evaluado.
export const essentialTowerContract2 = { rules: "cu05-tower-essential-engine-2", scope: "cu05-tower-essential-2", policy: "tower-essential-policy-2", inventory: "tower-essential-inventory-1", ruleIds: ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T11"] } as const;
const towerContracts = [legacyTowerContract, essentialTowerContract, essentialTowerContract2] as const;
const evaluation = object({ verdict: enumeration("compatible", "incompatible", "requiere_verificacion"), rules_version: enumeration(...towerContracts.map(contract => contract.rules)), coverage: object({ required: array(ruleId, 12), implemented: array(ruleId, 12), evaluated: array(ruleId, 12), passed: array(ruleId, 12), failed: array(ruleId, 12), unknown: array(ruleId, 12), not_applicable: array(ruleId, 12), not_implemented: array(ruleId, 12), complete: bool }), rule_results: array(object({ rule_id: ruleId, family: ruleId, state: enumeration("pass", "fail", "unknown", "not_applicable"), reason: text(), facts: array(fact), references: array(rRef), missing_fields: array(object({ code: literal("required_fact_missing"), rule_id: ruleId, count: integer(1) })) }), 12, 9), scope: object({ id: enumeration(...towerContracts.map(contract => contract.scope)), policy_version: enumeration(...towerContracts.map(contract => contract.policy)), inventory_version: enumeration(...towerContracts.map(contract => contract.inventory)), operating_regime: literal("stock_no_oc"), label: text(200), excludes: array(text(), 10) }), missing_fields: missing("required_fact_missing"), evaluated_configuration: config });
const quote = object({ amount: positiveMoney, currency: literal("ARS"), condition, availability_at_quote: enumeration("in_stock", "out_of_stock", "unknown"), quoted_at: iso, expires_at: iso, references: array(rRef), notice: literal("Cotización histórica, sin garantía de precio/stock actual"), quote_ref: qRef, component_ref: pRef });
const action = object({ action: enumeration("replace_category", "replace_line", "add_line", "remove_line"), category, candidates: array(object({ component_ref: pRef, quantity: integer(1, 32) }), 36), line_ref: optional(lRef), bios_context: optional(literal("BIOS declarada no publicada")) });
const stage = object({ position: integer(1, 12), name: match(/^Etapa(?:[1-9]|1[0-2])$/), budget_ars: money, actions: array(action, 36, 1), materials: array(object({ kind: literal("thermal_compound"), state: literal("available_confirmed"), confirmed: literal(true) }), 1), evaluated_configuration: config, evaluation, benefit, offers: array(quote), dependencies: array(object({ kind: enumeration("cpu", "motherboard", "ram", "gpu", "psu", "case", "storage", "cooler", "fan", "thermal_compound"), required: bool, state: enumeration("included", "available_confirmed", "priced", "missing"), amount_ars: nullable(money), reason: text(), references: array(rRef) })), cost, cumulative_cost: cost, status, missing_fields: missing("required_fact_missing"), warnings: array(text(300), 5) });
const versions = object({ scope: enumeration(...towerContracts.map(contract => contract.scope)), policy: enumeration(...towerContracts.map(contract => contract.policy)), inventory: enumeration(...towerContracts.map(contract => contract.inventory)), rules: enumeration(...towerContracts.map(contract => contract.rules)), calculation: literal("tower-plan-calculation-1"), references: literal("tower-benefit-references-1"), identity: literal("tower-reference-identity-2"), catalog: text(200), classification: literal("tower-share-classification-1"), facts: literal("tower-share-facts-1"), labels: enumeration("tower-share-labels-es-1", "tower-share-labels-es-2"), urls: literal("tower-share-url-policy-1"), projection: projectionVersion });
const publicSchema = object({ kind: literal("shared_tower_plan"), schema_version: literal(2), title, plan_revision: integer(1, 9999999999), published_at: iso, generated_at: iso, objective: enumeration("general", "gaming", "productivity"), workload: nullable(literal("blender-cpu")), budget_ars: money, currency: literal("ARS"), price_condition: condition, versions, components: array(component), references: array(reference), base_configuration: config, stages: array(stage, 12, 1), cost, benefit, status, projection: object({ version: projectionVersion, evidence_complete: bool, withheld_details: integer() }), missing_fields: missing("public_evidence_withheld"), warnings: array(text(), 3, 3) });
export type PublicTowerShare = ReturnType<typeof publicSchema>;
export function parsePublicTowerShare(value: unknown): PublicTowerShare {
  const data = publicSchema(value);
  if (data.stages.reduce((sum, item) => sum + item.actions.length, 0) > 96 || new Set(data.stages.map(item => item.position)).size !== data.stages.length) return invalid();
  const components = new Set(data.components.map(item => item.ref)), refs = new Set(data.references.map(item => item.ref));
  if (components.size !== data.components.length || refs.size !== data.references.length) return invalid();
  const checkRefs = (values: string[]) => { if (values.some(ref => !refs.has(ref))) invalid(); };
  const checkConfig = (value: ReturnType<typeof config>) => { if (value.lines.some(line => !components.has(line.component_ref))) invalid(); };
  checkConfig(data.base_configuration); checkRefs(data.benefit.source);
  for (const part of data.components) checkRefs(part.references);
  for (const item of data.stages) {
    if (item.name !== `Etapa${item.position}`) return invalid();
    // Cada evaluación debe ser coherente con un único contrato y con las versiones del plan: sin mezclar.
    const contract = towerContracts.find(candidate => item.evaluation.rules_version === candidate.rules && item.evaluation.scope.id === candidate.scope && item.evaluation.scope.policy_version === candidate.policy && item.evaluation.scope.inventory_version === candidate.inventory);
    if (!contract) return invalid();
    const essential = contract !== legacyTowerContract, ruleIds = item.evaluation.rule_results.map(rule => rule.rule_id);
    if (item.evaluation.rules_version !== data.versions.rules || data.versions.scope !== contract.scope || data.versions.policy !== contract.policy || data.versions.inventory !== contract.inventory) return invalid();
    if (new Set(ruleIds).size !== contract.ruleIds.length || ruleIds.length !== contract.ruleIds.length || !contract.ruleIds.every(id => ruleIds.includes(id))) return invalid();
    if (!essential && (item.evaluation.scope.label !== legacyTowerContract.label || item.evaluation.scope.excludes.length !== 3 || item.warnings.length !== 1 || item.warnings[0] !== legacyTowerContract.stageWarning)) return invalid();
    const idsWithState = (state: "pass" | "fail" | "unknown" | "not_applicable") => item.evaluation.rule_results.filter(rule => rule.state === state).map(rule => rule.rule_id);
    const sameIds = (left: readonly string[], right: readonly string[]) => left.length === right.length && left.every((id, index) => id === right[index]);
    const notApplicable = idsWithState("not_applicable");
    // `not_applicable` nace con la política 2 y solo para espacio físico o dependencia del gabinete.
    if (notApplicable.length && (contract !== essentialTowerContract2 || notApplicable.some(id => !["T04", "T07", "T08"].includes(id)))) return invalid();
    // La cobertura publicada debe describir exactamente las reglas, sin ocultar ni inventar estados.
    if (!sameIds(item.evaluation.coverage.passed, idsWithState("pass")) || !sameIds(item.evaluation.coverage.failed, idsWithState("fail")) || !sameIds(item.evaluation.coverage.unknown, idsWithState("unknown")) || !sameIds(item.evaluation.coverage.not_applicable, notApplicable)) return invalid();
    if (!sameIds(item.evaluation.coverage.evaluated, [...idsWithState("pass"), ...idsWithState("fail")])) return invalid();
    // La política 2 no publica hechos de BIOS en T01: si aparecen, el plan mezcla el contrato viejo.
    if (contract === essentialTowerContract2 && item.evaluation.rule_results.some(rule => rule.rule_id === "T01" && rule.facts.some(fact => "name" in fact && /bios/i.test(fact.name)))) return invalid();
    checkConfig(item.evaluated_configuration); checkConfig(item.evaluation.evaluated_configuration); checkRefs(item.benefit.source);
    for (const change of item.actions) if (change.candidates.some(candidate => !components.has(candidate.component_ref))) return invalid();
    for (const rule of item.evaluation.rule_results) { if (rule.rule_id !== rule.family || (["T08", "T09", "T10", "T11", "T12"].includes(rule.rule_id) && rule.facts.length > 0)) return invalid(); checkRefs(rule.references); for (const item of rule.facts) if ("component_ref" in item && !components.has(item.component_ref)) return invalid(); }
    for (const offer of item.offers) { if (!components.has(offer.component_ref)) return invalid(); checkRefs(offer.references); }
    for (const dependency of item.dependencies) checkRefs(dependency.references);
  }
  return data;
}
const metadata = { id: match(shareUUID), plan_revision: integer(1, 9999999999), title, projection_version: projectionVersion, created_at: iso, revoked_at: nullable(iso) };
export const parseShareList = object({ items: array(object({ ...metadata, effective_state: enumeration("active", "disabled_plan_deleted", "revoked") }), 100) });
export const parseCreatedShare = object({ ...metadata, revoked_at: (value: unknown): null => value === null ? null : invalid(), token: match(/^[A-Za-z0-9_-]{43}$/) });
export type ShareMetadata = ReturnType<typeof parseShareList>["items"][number];
export function shareCreateInput(revision: number, selectedTitle: string, confirmed: boolean) {
  if (confirmed !== true) return invalid();
  return { expected_plan_revision: integer(1, 9999999999)(revision), title: title(selectedTitle), public_projection_confirmed: true as const };
}
