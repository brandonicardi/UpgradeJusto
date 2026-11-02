import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyTower, towerKeys, type Tower } from "../../lib/towers";
import { confirmTowerInput, createTowerExtraction, extractionDraft, readTowerExtraction, type ExtractionState, type TowerExtraction } from "../../lib/tower-extraction";
import EditableTowerProposal from "../../components/editable-tower-proposal";
import TowerExtractionEvidence from "../../components/tower-extraction-evidence";

const id = "12345678-1234-1234-1234-123456789abc";
function preview(): TowerExtraction {
  return { proposal: { ...emptyTower(), name: "Torre extraída" }, evidence: towerKeys.map(category => ({ category, status: "unknown", absence_excerpt: null, lines: [] })), missing_fields: ["Identificación pendiente"], warnings: [], catalog_revision: "synthetic-revision", requires_confirmation: true };
}
function setup(confirmStatus = 201) {
  const extraction = preview(), onState = vi.fn<(state: ExtractionState) => void>(), onPreview = vi.fn(), onSaved = vi.fn();
  const saved: Tower = { ...extraction.proposal, id, revision: 1, origin_schema: 2 };
  const request = vi.fn<typeof fetch>().mockImplementation(async path => {
    if (path === "/api/auth/csrf") return Response.json({ csrf_token: "synthetic" });
    if (path === "/api/towers/extract") return Response.json(extraction);
    return Response.json(confirmStatus === 201 ? saved : { detail: "private backend input" }, { status: confirmStatus });
  });
  const controller = createTowerExtraction({ request, onState, onPreview, onSaved });
  return { controller, extraction, request, onState, onPreview, onSaved };
}
describe("CU02 torre: preview no persistente y confirmación explícita", () => {
  it("valida nueve evidencias/confirmation y proyecta payload cerrado sin autoridad/evidencia", () => {
    expect(readTowerExtraction(preview()).evidence).toHaveLength(9);
    expect(() => readTowerExtraction({ ...preview(), requires_confirmation: false })).toThrow();
    expect(() => readTowerExtraction({ ...preview(), evidence: preview().evidence.slice(1) })).toThrow();
    const draft = { ...extractionDraft(preview()), owner_id: id, evidence: ["not sent"] };
    const payload = confirmTowerInput(draft, "synthetic-revision");
    expect(Object.keys(payload).sort()).toEqual(["catalog_revision", "confirmed", "proposal"]); expect(payload.proposal).not.toHaveProperty("owner_id"); expect(payload.proposal).not.toHaveProperty("evidence");
  });
  it("quantité null reste inconnue: no autofill1, unresolved RAM/storage/fan no se materializan", () => {
    const data = preview(); data.proposal.category_status.storage = "present";
    data.proposal.lines = [{ line_id: null, category: "storage", component_id: null, declared_model: "Synthetic SSD", quantity: 1 }];
    data.evidence.find(item => item.category === "storage")!.lines = [{ proposal_line_index: 0, component_id: null, declared_model: "Synthetic SSD", quantity: null, excerpt: "<script>test-only</script>", quantity_excerpt: null, candidate_ids: [], resolution: "needs_review" }];
    const draft = extractionDraft(readTowerExtraction(data)); expect(draft.lines[0].quantity).toBeNull(); expect(() => confirmTowerInput(draft, data.catalog_revision)).toThrow();
    const html = renderToStaticMarkup(<EditableTowerProposal value={draft} onChange={() => {}} disabled={false} />);
    expect(html).toMatch(/type="number"[^>]*value=""/); expect(html).not.toMatch(/type="number"[^>]*value="1"/);
    const evidence = renderToStaticMarkup(<TowerExtractionEvidence preview={data} />);
    expect(evidence).toContain("&lt;script&gt;test-only&lt;/script&gt;"); expect(evidence).not.toContain("<script>"); expect(evidence).toContain("cantidad desconocida");
    expect(extractionDraft(preview()).lines).toEqual([]);
    draft.lines[0].quantity = 2; expect(confirmTowerInput(draft, data.catalog_revision).proposal.lines[0].quantity).toBe(2);
  });
  it("extraer sólo hace POSTextract; guardar requiere confirmación, bloquea doble click y reenvío tras éxito", async () => {
    const h = setup(); await h.controller.extract("Hardware sintético por confirmar");
    expect(h.request.mock.calls.map(call => call[0])).toEqual(["/api/auth/csrf", "/api/towers/extract"]); expect(h.onSaved).not.toHaveBeenCalled();
    const draft = extractionDraft(h.extraction); draft.name = "Nombre editado";
    await h.controller.confirm(draft, h.extraction.catalog_revision, false); expect(h.request).toHaveBeenCalledTimes(2);
    await Promise.all([h.controller.confirm(draft, h.extraction.catalog_revision, true), h.controller.confirm(draft, h.extraction.catalog_revision, true)]);
    expect(h.onSaved).toHaveBeenCalledTimes(1); await h.controller.confirm(draft, h.extraction.catalog_revision, true);
    const calls = h.request.mock.calls.filter(call => call[0] === "/api/towers/extract/confirm"); expect(calls).toHaveLength(1); expect(JSON.parse(calls[0][1]!.body as string).proposal.name).toBe("Nombre editado");
    h.controller.dispose();
  });
  it("409 conserva propuesta y bloquea confirmación hasta nueva extracción explícita", async () => {
    const h = setup(409); await h.controller.extract("Hardware sintético"); const draft = extractionDraft(h.extraction), before = JSON.stringify(draft);
    await h.controller.confirm(draft, h.extraction.catalog_revision, true); expect(h.onState.mock.calls.at(-1)?.[0].blocked).toBe("catalog"); expect(JSON.stringify(draft)).toBe(before);
    await h.controller.confirm(draft, h.extraction.catalog_revision, true); expect(h.request.mock.calls.filter(call => call[0] === "/api/towers/extract/confirm")).toHaveLength(1); expect(h.onSaved).not.toHaveBeenCalled();
    h.controller.dispose();
  });
  it("guardado incierto no se reenvía automáticamente, exige revisión/autorizar y nuevo click", async () => {
    const h = setup(503); await h.controller.extract("Hardware sintético"); const draft = extractionDraft(h.extraction);
    await h.controller.confirm(draft, h.extraction.catalog_revision, true); expect(h.onState.mock.calls.at(-1)?.[0].blocked).toBe("uncertain");
    h.controller.cancel(); expect(h.onState.mock.calls.at(-1)?.[0].blocked).toBe("uncertain");
    await h.controller.confirm(draft, h.extraction.catalog_revision, true); expect(h.request.mock.calls.filter(call => call[0] === "/api/towers/extract/confirm")).toHaveLength(1);
    h.controller.allowExplicitRetry(); expect(h.request.mock.calls.filter(call => call[0] === "/api/towers/extract/confirm")).toHaveLength(1); expect(h.onSaved).not.toHaveBeenCalled();
    h.controller.dispose();
  });
  it("cancelar ignora respuesta tardía y conserva aviso de no rollback al confirmar", async () => {
    const h = setup(); let finish: ((value: Response) => void) | undefined;
    h.request.mockImplementationOnce(async () => Response.json({ csrf_token: "synthetic" })).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    const pending = h.controller.extract("Texto conservado por UI"); await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    h.controller.cancel(); finish!(Response.json(h.extraction)); await pending;
    expect(h.onPreview.mock.calls.every(call => call[0] === null)).toBe(true); expect(h.onSaved).not.toHaveBeenCalled();
    await h.controller.extract("Texto conservado por UI");
    h.request.mockImplementationOnce(async () => Response.json({ csrf_token: "synthetic" })).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    finish = undefined; const confirming = h.controller.confirm(extractionDraft(h.extraction), h.extraction.catalog_revision, true);
    await vi.waitFor(() => expect(finish).toBeTypeOf("function")); h.controller.cancel(); expect(h.onState.mock.calls.at(-1)?.[0].blocked).toBe("uncertain");
    finish!(Response.json({ ...h.extraction.proposal, id, revision: 1, origin_schema: 2 })); await confirming; expect(h.onSaved).not.toHaveBeenCalled(); h.controller.dispose();
  });
  it("429/503 extracción son seguros y no disparan reintentos ni confirmaciones", async () => {
    for (const status of [429, 503]) {
      const h = setup(); h.request.mockImplementationOnce(async () => Response.json({ csrf_token: "synthetic" })).mockImplementationOnce(async () => Response.json({ detail: "private" }, { status, headers: { "Retry-After": "12" } }));
      await h.controller.extract("Hardware sintético"); expect(h.request).toHaveBeenCalledTimes(2); expect(h.onSaved).not.toHaveBeenCalled(); expect(h.onState.mock.calls.at(-1)?.[0].message).not.toContain("private"); h.controller.dispose();
    }
  });
});
