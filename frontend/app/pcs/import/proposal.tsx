"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HardwareGuide, { HardwareExample } from "../../../components/hardware-guide";
import EditableTowerProposal from "../../../components/editable-tower-proposal";
import TowerExtractionEvidence from "../../../components/tower-extraction-evidence";
import { createTowerExtraction, extractionDraft, type ExtractionState, type TowerExtraction, type TowerProposalDraft } from "../../../lib/tower-extraction";
import type { Tower } from "../../../lib/towers";

export default function ImportTower() {
  const [text, setText] = useState(""), [preview, setPreview] = useState<TowerExtraction | null>(null), [draft, setDraft] = useState<TowerProposalDraft | null>(null), [confirmed, setConfirmed] = useState(false), [saved, setSaved] = useState<Tower | null>(null);
  const [state, setState] = useState<ExtractionState>({ phase: "idle", message: "Nada se guarda sin confirmación explícita.", blocked: null });
  const controller = useRef<ReturnType<typeof createTowerExtraction> | null>(null);
  useEffect(() => {
    controller.current = createTowerExtraction({ onState: setState, onPreview: next => { setPreview(next); setDraft(next ? extractionDraft(next) : null); setConfirmed(false); }, onSaved: setSaved });
    return () => { controller.current?.dispose(); controller.current = null; };
  }, []);
  const busy = state.phase === "extracting" || state.phase === "confirming";
  return <section aria-busy={busy} className="stack">
    <header className="page-heading"><h1>Importar PC desde texto</h1><p>Pegá sólo las piezas que conocés. Revisá las nueve categorías antes de guardar tu torre.</p></header>
    <div className="row wrap"><Link href="/pcs">Revisar Mis PCs</Link><Link href="/pcs/legacy/import">Extracción histórica de seis categorías</Link></div>
    <p role="status" aria-label="Estado de importación de torre">{state.message}</p>
    {!saved && !preview && <form aria-label="Extraer torre desde texto" className="surface stack import-input" onSubmit={event => { event.preventDefault(); void controller.current?.extract(text); }}>
      <HardwareExample /><details><summary>Necesito ayuda para encontrar mis componentes</summary><HardwareGuide id="import-hardware-guide" /></details>
      <label>Texto de la PC (máximo 12000 caracteres)<textarea name="text" required maxLength={12000} rows={8} value={text} disabled={busy} onChange={event => setText(event.target.value)} /></label>
      <p>Sólo hardware, sin datos personales ni credenciales. No leemos archivos ni detectamos el equipo. Extraer no guarda una PC.</p><button disabled={busy}>Extraer propuesta</button>
    </form>}
    {busy && <button type="button" className="secondary" onClick={() => { setConfirmed(false); controller.current?.cancel(); }}>Cancelar {state.phase === "confirming" ? "espera de confirmación" : "extracción"}</button>}
    {preview && draft && !saved && <>
      <TowerExtractionEvidence preview={preview} />
      <form aria-label="Propuesta editable de torre" className="surface stack" onSubmit={event => { event.preventDefault(); void controller.current?.confirm(draft, preview.catalog_revision, confirmed); }}>
        <EditableTowerProposal value={draft} disabled={busy} onChange={next => { setDraft(next); setConfirmed(false); }} />
        <label><input type="checkbox" checked={confirmed} disabled={busy || !!state.blocked} onChange={event => setConfirmed(event.target.checked)} />Revisé esta propuesta y confirmo explícitamente guardarla</label>
        <button disabled={busy || !!state.blocked || !confirmed}>Confirmar y guardar mi torre</button>
        <p>El envío no es idempotente: repetir una confirmación puede crear otra PC. Cancelar la espera no revierte un guardado ya realizado.</p>
        {!busy && state.blocked !== "uncertain" && <button type="button" className="secondary" onClick={() => { setConfirmed(false); controller.current?.cancel(); }}>Descartar propuesta y volver al texto</button>}
        {state.blocked === "catalog" && <p>La propuesta sigue editable, pero el envío está bloqueado por revisión obsoleta. <Link href="/catalog">Revisá el catálogo</Link>; para obtener una versión nueva, descartá esta propuesta sólo cuando decidas extraer otra vez el texto conservado.</p>}
        {state.blocked === "uncertain" && <><p>Primero <Link href="/pcs">revisá Mis PCs</Link>. No se reintentará automáticamente.</p><button type="button" disabled={busy} className="secondary" onClick={() => { setConfirmed(false); controller.current?.allowExplicitRetry(); }}>Revisé Mis PCs: autorizar un nuevo envío</button></>}
      </form>
    </>}
    {saved && <section className="surface stack" aria-label="Torre guardada"><h2>{saved.name}</h2><p>Guardada · revisión {saved.revision}. No se evaluó compatibilidad ni se modificó otra PC.</p><Link href="/pcs">Revisar mi torre guardada</Link><button type="button" className="secondary" onClick={() => { setSaved(null); controller.current?.cancel(); }}>Empezar otra extracción explícita</button></section>}
  </section>;
}
