"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HardwareGuide, { HardwareExample } from "../../../components/hardware-guide";
import EditableTowerProposal from "../../../components/editable-tower-proposal";
import TowerExtractionEvidence from "../../../components/tower-extraction-evidence";
import { ImportConfirmStep, ImportStepList } from "../../../components/import-steps";
import { consentAfterEdit, currentImportStep, type ImportStep } from "../../../lib/import-steps";
import { createTowerExtraction, extractionDraft, type ExtractionState, type TowerExtraction, type TowerProposalDraft } from "../../../lib/tower-extraction";
import type { Tower } from "../../../lib/towers";

export default function ImportTower() {
  const [text, setText] = useState(""), [preview, setPreview] = useState<TowerExtraction | null>(null), [draft, setDraft] = useState<TowerProposalDraft | null>(null), [confirmed, setConfirmed] = useState(false), [edited, setEdited] = useState(false), [saved, setSaved] = useState<Tower | null>(null), [reviewing, setReviewing] = useState<ImportStep>(2);
  const [state, setState] = useState<ExtractionState>({ phase: "idle", message: "Nada se guarda sin tu confirmación.", blocked: null });
  const controller = useRef<ReturnType<typeof createTowerExtraction> | null>(null);
  useEffect(() => {
    controller.current = createTowerExtraction({ onState: setState, onPreview: next => { setPreview(next); setDraft(next ? extractionDraft(next) : null); setConfirmed(false); setEdited(false); setReviewing(2); }, onSaved: setSaved });
    return () => { controller.current?.dispose(); controller.current = null; };
  }, []);
  const busy = state.phase === "extracting" || state.phase === "confirming";
  const step = currentImportStep(!!(preview && draft), !!saved, reviewing);
  // Volver al texto descarta la propuesta (no envía nada); el texto pegado queda en `text`.
  // Al cambiar de paso el foco pasa al encabezado visible, para que el teclado no pierda el contexto.
  const heading = useRef<HTMLHeadingElement | null>(null), previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const discard = () => { setConfirmed(false); setEdited(false); controller.current?.cancel(); };
  return <section aria-busy={busy} className="stack">
    <header className="page-heading"><h1>Agregar una PC con tu lista</h1><p>Pegá solo las piezas que conocés. Antes de guardar vas a revisar todo.</p></header>
    <ImportStepList step={step} />
    <div className="row wrap"><Link href="/pcs">Revisar Mis PCs</Link><Link href="/pcs/legacy/import">Extracción histórica de seis categorías</Link></div>
    <p role="status" aria-label="Estado de importación de torre">{state.message}</p>
    {step === 1 && <form aria-label="Extraer torre desde texto" className="surface stack import-input" onSubmit={event => { event.preventDefault(); void controller.current?.extract(text); }}>
      <h2 ref={heading} tabIndex={-1}>Pegá lo que sepas de tu PC</h2>
      <HardwareExample /><details><summary>Necesito ayuda para encontrar mis componentes</summary><HardwareGuide id="import-hardware-guide" /></details>
      <label>Texto de la PC (máximo 12000 caracteres)<textarea name="text" required maxLength={12000} rows={8} value={text} disabled={busy} onChange={event => setText(event.target.value)} /></label>
      <p>Solo hardware, sin datos personales ni contraseñas. No leemos archivos ni detectamos el equipo. Extraer no guarda una PC.</p><button disabled={busy}>Extraer propuesta</button>
    </form>}
    {busy && <button type="button" className="secondary" onClick={() => { setConfirmed(false); controller.current?.cancel(); }}>Cancelar {state.phase === "confirming" ? "espera de confirmación" : "extracción"}</button>}
    {step === 2 && preview && draft && <>
      <header className="stack-sm"><h2 ref={heading} tabIndex={-1}>Revisá lo que entendimos</h2><p className="muted">Todavía no se guardó nada. Corregí lo que haga falta: recién en el próximo paso confirmás.</p></header>
      <TowerExtractionEvidence preview={preview} />
      <form aria-label="Propuesta editable de torre" className="surface stack" onSubmit={event => { event.preventDefault(); setReviewing(3); }}>
        <EditableTowerProposal value={draft} disabled={busy} showName={false} onChange={next => { const consent = consentAfterEdit({ confirmed, edited }); setConfirmed(consent.confirmed); setEdited(consent.edited); setDraft(next); }} />
        <div className="row wrap">
          <button disabled={busy}>Seguir al paso 3</button>
          {!busy && state.blocked !== "uncertain" && <button type="button" className="secondary" onClick={discard}>Volver a pegar</button>}
        </div>
        <p className="muted">Volver a pegar descarta esta propuesta y conserva tu texto.</p>
      </form>
    </>}
    {step === 3 && !saved && preview && draft && <ImportConfirmStep draft={draft} confirmed={confirmed} edited={edited} busy={busy} blocked={state.blocked} headingRef={heading}
      onName={name => setDraft({ ...draft, name })} onConfirmed={value => { setConfirmed(value); if (value) setEdited(false); }}
      onSubmit={() => { void controller.current?.confirm(draft, preview.catalog_revision, confirmed); }}
      onBack={() => setReviewing(2)} onDiscard={discard} onAllowRetry={() => { setConfirmed(false); controller.current?.allowExplicitRetry(); }} />}
    {saved && <section className="surface stack" aria-label="Torre guardada"><h2>{saved.name}</h2><p>Guardada. No se evaluó compatibilidad ni se modificó otra PC.</p><Link href="/pcs">Revisar mi torre guardada</Link><button type="button" className="secondary" onClick={() => { setSaved(null); controller.current?.cancel(); }}>Empezar otra extracción explícita</button></section>}
  </section>;
}
