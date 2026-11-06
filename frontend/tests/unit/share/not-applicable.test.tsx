// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PublicTowerShareView from "../../../components/public-tower-share-view";
import { sharedHtml } from "../../../lib/shared-html";
import { parsePublicTowerShare } from "../../../lib/tower-share-dto";
import { syntheticPublicShare } from "../../support/tower-share-fixture";

// El servidor declara `not_applicable` cuando algo queda fuera de alcance.
// No es un dato faltante ni un fallo: se muestra «No evaluado» con su razón.
function share() {
  const data = parsePublicTowerShare(syntheticPublicShare());
  return data;
}
function forcedNotApplicable(data: ReturnType<typeof share>) {
  const evaluation = data.stages[0].evaluation;
  const rule = evaluation.rule_results[0];
  rule.rule_id = "T04";
  rule.state = "not_applicable";
  rule.reason = "Espacio físico no evaluado: faltan medidas. Chequeá que entre en tu gabinete.";
  rule.missing_fields = [];
  evaluation.coverage.not_applicable = ["T04"];
  return { evaluation, rule };
}

describe("plan compartido con comprobaciones fuera de alcance", () => {
  it("dice «No evaluado» con la razón y no lo presenta como dato faltante", () => {
    const data = share();
    forcedNotApplicable(data);
    data.stages[0].evaluation.verdict = "requiere_verificacion";
    const html = renderToStaticMarkup(<PublicTowerShareView data={data} />);
    expect(html).toContain("No evaluado");
    expect(html).toContain("Espacio físico no evaluado: faltan medidas. Chequeá que entre en tu gabinete.");
    expect(html).toContain("No evaluados: 1 (no es un dato faltante)");
    expect(html).not.toContain("Estado por verificar");
  });

  it("muestra el aviso del gabinete sin abrir detalles y nunca afirma que la BIOS esté validada", () => {
    const data = share();
    const { evaluation } = forcedNotApplicable(data);
    evaluation.rules_version = "cu05-tower-essential-engine-2";
    evaluation.scope.id = "cu05-tower-essential-2";
    evaluation.scope.policy_version = "tower-essential-policy-2";
    evaluation.verdict = "compatible";
    evaluation.coverage.complete = true;
    evaluation.coverage.unknown = [];
    evaluation.coverage.failed = [];
    evaluation.missing_fields = [];
    for (const rule of evaluation.rule_results.slice(1)) {
      rule.state = "pass";
      rule.missing_fields = [];
    }
    const html = renderToStaticMarkup(<PublicTowerShareView data={data} />);
    expect(html).toContain("Chequeá que entre en tu gabinete.");
    expect(html).toContain("La BIOS no se evalúa.");
    expect(html).not.toContain("BIOS validada");
    expect(html).not.toContain("BIOS compatible");
  });

  it("la versión HTML de solo lectura no convierte «No evaluado» en «Falta información»", () => {
    const html = sharedHtml({
      title: "Plan sintético",
      status: "requires_verification",
      cost: { total_ars: null },
      stages: [{ name: "Memoria", evaluation: { verdict: "compatible", rule_results: [{ rule_id: "T04", state: "not_applicable", reason: "Fuera de alcance por falta de medidas." }] } }],
    });
    expect(html).toContain("No evaluado");
    expect(html).toContain("Fuera de alcance por falta de medidas.");
    expect(html).not.toContain("Falta información");
  });
});
