import { towerInput, towerKeys, towerUUID, type CategoryStatus, type Tower, type TowerCategory, type TowerInput, type TowerLine } from "./towers";
import type { JsonValue } from "./compatibility";
export type ExtractionLineEvidence = { proposal_line_index: number | null; component_id: string | null; declared_model: string | null; quantity: number | null; excerpt: string; quantity_excerpt: string | null; candidate_ids: string[]; resolution: "catalog" | "declared" | "needs_review" };
export type TowerExtraction = { proposal: TowerInput; evidence: { category: TowerCategory; status: CategoryStatus; absence_excerpt: string | null; lines: ExtractionLineEvidence[] }[]; missing_fields: JsonValue; warnings: string[]; catalog_revision: string; requires_confirmation: true };
export type TowerProposalDraft = Omit<TowerInput, "lines"> & { lines: (Omit<TowerLine, "quantity"> & { quantity: number | null })[] };
export function readTowerExtraction(value: unknown): TowerExtraction {
  const data = value as TowerExtraction;
  if (!data || data.requires_confirmation !== true || typeof data.catalog_revision !== "string" || !data.catalog_revision || !Array.isArray(data.warnings) || data.warnings.some(text => typeof text !== "string") || !Array.isArray(data.evidence) || data.evidence.length !== 9) throw new Error("Propuesta de extracción no válida. No se guardó una PC.");
  const keys = new Set<TowerCategory>();
  for (const item of data.evidence) {
    if (!towerKeys.includes(item.category) || keys.has(item.category) || !["present", "unknown", "absent"].includes(item.status) || !Array.isArray(item.lines) || (item.absence_excerpt !== null && typeof item.absence_excerpt !== "string")) throw new Error("Evidencia de extracción incompleta.");
    keys.add(item.category);
    for (const line of item.lines) if ((line.quantity !== null && (!Number.isInteger(line.quantity) || line.quantity < 1)) || (line.proposal_line_index !== null && (!Number.isInteger(line.proposal_line_index) || line.proposal_line_index < 0 || line.proposal_line_index >= data.proposal.lines.length || data.proposal.lines[line.proposal_line_index].category !== item.category)) || typeof line.excerpt !== "string" || (line.component_id !== null && typeof line.component_id !== "string") || (line.declared_model !== null && typeof line.declared_model !== "string") || (line.quantity_excerpt !== null && typeof line.quantity_excerpt !== "string") || !Array.isArray(line.candidate_ids) || line.candidate_ids.some(id => typeof id !== "string") || !["catalog", "declared", "needs_review"].includes(line.resolution)) throw new Error("Evidencia de línea no válida.");
  }
  const proposal = towerInput(data.proposal);
  if (proposal.lines.some(line => line.line_id !== null)) throw new Error("La propuesta no debe asignar UUID de líneas.");
  return { proposal, evidence: data.evidence, missing_fields: data.missing_fields, warnings: data.warnings, catalog_revision: data.catalog_revision, requires_confirmation: true };
}
export function extractionDraft(data: TowerExtraction): TowerProposalDraft {
  const unknownQuantities = new Set(data.evidence.flatMap(item => item.lines.filter(line => line.quantity === null && line.proposal_line_index !== null).map(line => line.proposal_line_index)));
  return { ...data.proposal, category_status: { ...data.proposal.category_status }, context: { ...data.proposal.context }, lines: data.proposal.lines.map((line, index) => ({ ...line, quantity: unknownQuantities.has(index) ? null : line.quantity })) };
}
export function confirmTowerInput(draft: TowerProposalDraft, catalog_revision: string) {
  if (!catalog_revision || draft.lines.some(line => line.quantity === null)) throw new Error("Indicá explícitamente la cantidad de cada línea antes de confirmar; desconocido no es1.");
  const proposal = towerInput(draft as TowerInput);
  if (proposal.lines.some(line => line.line_id !== null)) throw new Error("Los UUID nuevos los asigna el servidor.");
  return { confirmed: true as const, proposal, catalog_revision };
}
export type ExtractionState = { phase: "idle" | "extracting" | "review" | "confirming" | "saved"; message: string; blocked: "catalog" | "uncertain" | null };
class ExtractionError extends Error { constructor(public status: number, retry: string | null = null) { super(status === 409 ? "El catálogo cambió. Tu propuesta editable se conserva. Revisá el catálogo y pedí una nueva extracción explícita antes de guardar." : status === 429 ? `Cuota alcanzada. No se reintentó.${retry && /^\d{1,8}$/.test(retry) ? ` Esperá ${Number(retry)} segundos.` : ""}` : "No se pudo completar la solicitud. Conservá el texto y revisá sesión, datos o disponibilidad antes de reintentar explícitamente."); } }
export function createTowerExtraction(deps: { onState: (state: ExtractionState) => void; onPreview: (preview: TowerExtraction | null) => void; onSaved: (tower: Tower) => void; request?: typeof fetch }) {
  const request = deps.request ?? fetch; let generation = 0, active: AbortController | null = null, phase: ExtractionState["phase"] = "idle", blocked: ExtractionState["blocked"] = null;
  const state = (next: ExtractionState["phase"], message: string, block: ExtractionState["blocked"] = null) => { phase = next; blocked = block; deps.onState({ phase, message, blocked }); };
  function stop() { generation++; active?.abort(); active = null; }
  async function post(path: string, body: unknown, signal: AbortSignal, sending?: () => void) {
    const csrf = await request("/api/auth/csrf", { credentials: "same-origin", cache: "no-store", signal });
    if (!csrf.ok) throw new ExtractionError(csrf.status);
    const token = await csrf.json(); if (typeof token.csrf_token !== "string") throw new ExtractionError(503);
    if (signal.aborted) throw new Error("Cancelled");
    sending?.();
    const response = await request(path, { method: "POST", credentials: "same-origin", cache: "no-store", signal, headers: { "Content-Type": "application/json", "X-CSRF-Token": token.csrf_token }, body: JSON.stringify(body) });
    if (!response.ok) throw new ExtractionError(response.status, response.headers.get("Retry-After"));
    return response.json();
  }
  return {
    dispose: stop,
    cancel() { const uncertain = phase === "confirming" || blocked === "uncertain"; stop(); if (!uncertain) deps.onPreview(null); state(uncertain ? "review" : "idle", uncertain ? "Confirmación cancelada en esta pantalla; puede haberse guardado. Revisá Mis PCs antes de autorizar otro envío. Cancelar no revierte el servidor." : "Propuesta descartada. El texto se conserva. Esta acción no envía un guardado.", uncertain ? "uncertain" : null); },
    allowExplicitRetry() { if (!active && blocked === "uncertain") state("review", "Autorizaste un nuevo envío tras revisar Mis PCs. No hay garantía de idempotencia: confirmá de nuevo explícitamente."); },
    async extract(text: string) {
      if (active) return;
      if (!text.trim() || text.length > 12000 || text.includes("\0")) { state("idle", "Pegá entre1 y12000 caracteres de hardware, sin NUL."); return; }
      stop(); const ticket = generation, controller = new AbortController(); active = controller; deps.onPreview(null); state("extracting", "Extrayendo una propuesta; todavía no se guarda tu PC…");
      try { const preview = readTowerExtraction(await post("/api/towers/extract", { text }, controller.signal)); if (ticket === generation && !controller.signal.aborted) { deps.onPreview(preview); state("review", "Propuesta editable recibida. Revisá fuentes y cantidades antes de confirmar."); } }
      catch (error) { if (ticket === generation && !controller.signal.aborted) state("idle", error instanceof ExtractionError ? error.message : "No se pudo extraer. El texto se conserva; no hubo guardado ni reintento automático."); }
      finally { if (ticket === generation) active = null; }
    },
    async confirm(draft: TowerProposalDraft, revision: string, confirmed: boolean) {
      if (active || blocked || phase === "saved" || phase !== "review" || !confirmed) return;
      let body;
      try { body = confirmTowerInput(draft, revision); } catch (error) { state("review", error instanceof Error ? error.message : "Revisá la propuesta."); return; }
      const controller = new AbortController(), ticket = ++generation; active = controller; let sent = false; state("confirming", "Enviando confirmación explícita al servidor…");
      try {
        const saved = await post("/api/towers/extract/confirm", body, controller.signal, () => { sent = true; }) as Tower;
        if (!towerUUID.test(saved.id) || !Number.isInteger(saved.revision) || saved.revision < 1 || saved.origin_schema !== 2) throw new Error("Invalid saved tower");
        const input = towerInput(saved);
        if (input.lines.some(line => !line.line_id)) throw new Error("Missing server UUID");
        if (ticket === generation && !controller.signal.aborted) { state("saved", "Torre guardada por el servidor. No se evaluó compatibilidad."); deps.onSaved({ ...input, id: saved.id, revision: saved.revision, origin_schema: 2 }); }
      } catch (error) {
        if (ticket === generation && !controller.signal.aborted) {
          const uncertain = sent && (!(error instanceof ExtractionError) || error.status >= 500 || error.status === 408);
          state("review", uncertain ? "Resultado de guardado incierto. No reenvíes sin revisar Mis PCs; el servidor pudo haber guardado la torre. Cancelar no revierte un guardado." : error instanceof ExtractionError ? error.message : "No se pudo preparar el envío. La propuesta se conserva.", uncertain ? "uncertain" : error instanceof ExtractionError && error.status === 409 ? "catalog" : null);
        }
      } finally { if (ticket === generation) active = null; }
    },
  };
}
