"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { categories, type CatalogPage } from "../../../lib/catalog";
import { pcCategories, pcFormInput, type PC } from "../../../lib/pcs";
import { CurationError, curationRequest, type Extraction } from "../../../lib/curation";
import { extractionWarnings } from "../../../lib/extraction-presentation";
import HardwareGuide, { HardwareExample } from "../../../components/hardware-guide";
import { canSaveLegacyProposal } from "../../../lib/import-steps";

export function LegacySaveControls({ busy, blocked, confirmed, onConfirmedChange, onCancel }: { busy: boolean; blocked: boolean; confirmed: boolean; onConfirmedChange: (value: boolean) => void; onCancel: () => void }) {
  return <>
    <label className="flex gap-3 items-center"><input className="w-auto" type="checkbox" checked={confirmed} disabled={busy || blocked} onChange={event => { event.stopPropagation(); onConfirmedChange(event.target.checked); }} />Confirmo explícitamente guardar esta propuesta corregida</label>
    <button disabled={busy || blocked || !canSaveLegacyProposal({ locked: false, hasPreview: true, confirmed, blocked })}>Confirmar y guardar</button>{" "}
    <button type="button" disabled={busy} onClick={onCancel}>Cancelar propuesta</button>
    {blocked && <p>Envío bloqueado. Revisá Mis PCs antes de una nueva extracción; ante 409 revisá también la revisión del catálogo. No se garantiza idempotencia.</p>}
  </>;
}

export default function LegacyImportPC({ catalog }: { catalog: CatalogPage | null }) {
  const [preview, setPreview] = useState<Extraction | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false), [blocked, setBlocked] = useState(false);
  const [saved, setSaved] = useState<PC | null>(null);
  const lock = useRef(false);
  const warnings = preview ? extractionWarnings(preview) : null;
  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    const form = event.currentTarget;
    const text = String(new FormData(form).get("text") ?? "");
    if (!text.trim() || text.length > 12000 || text.includes("\0")) { setError("Pegá entre 1 y 12000 caracteres, sin NUL."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await curationRequest("/api/pcs/extract", "POST", { text });
      setPreview(await response.json()); setConfirmed(false); setBlocked(false); form.reset();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo extraer."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canSaveLegacyProposal({ locked: lock.current, hasPreview: !!preview, confirmed, blocked }) || !preview) return;
    let pc;
    try { pc = pcFormInput(new FormData(event.currentTarget)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Revisá los campos."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await curationRequest("/api/pcs/extract/confirm", "POST", { confirmed: true, pc, metadata: { dataset_version: preview.dataset_version, edited: JSON.stringify(pc) !== JSON.stringify(preview.proposal) } });
      setSaved(await response.json()); setPreview(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Resultado incierto: revisá Mis PCs antes de reenviar.");
      if (!(failure instanceof CurationError) || failure.status >= 500 || failure.status === 409) setBlocked(true);
    } finally { lock.current = false; setBusy(false); }
  }
  return <section aria-busy={busy} className="space-y-5">
    <header className="page-heading"><p className="eyebrow">DE TEXTO A CONFIGURACIÓN</p><h1>Importar PC desde texto</h1><p className="muted">Pegá los componentes que conocés. Revisá la propuesta antes de guardar.</p></header>
    <ol className="step-list" aria-label="Pasos de importación"><li aria-current={!preview && !saved ? "step" : undefined}>1 · Pegá tu configuración</li><li aria-current={preview ? "step" : undefined}>2 · Revisá y corregí</li><li aria-current={saved ? "step" : undefined}>3 · Confirmá el guardado</li></ol>
    <Link href="/pcs">Revisar Mis PCs</Link>
    <p role="status" className="muted">{busy ? "Consultando al servidor, sin reintentos automáticos…" : saved ? `PC guardada: ${saved.name}. Revisión ${saved.revision}.` : "Nada se guarda sin tu confirmación."}</p>
    {error && <p role="alert" className="notice">{error}</p>}
    {!preview && !saved && <form onSubmit={extract} className="surface stack import-input">
      <HardwareExample />
      <details className="accordion"><summary>Necesito ayuda para encontrar mis componentes</summary><HardwareGuide id="import-hardware-guide" /></details>
      <label className="block">Texto de la PC (máximo 12000 caracteres)<textarea name="text" maxLength={12000} required disabled={busy} rows={8} /></label>
      <p className="muted">No pegues credenciales ni datos personales. No leemos archivos ni detectamos tu hardware. La extracción no guarda una PC.</p>
      <button disabled={busy}>Extraer propuesta</button>
    </form>}
    {preview && <div className="import-review">
      <section className="surface stack" aria-label="Evidencia de extracción">
        <h2>Qué pudo reconocer</h2><p className="muted">Las coincidencias son una propuesta, no una comprobación de compatibilidad.</p>
        <ul>{preview.evidence.map(item => <li key={item.field} className="extraction-evidence"><strong>{categories[item.field]}</strong><p>{{ catalog: "✓ Coincidencia en catálogo", text: "! Texto sin selección confirmada", unknown: "! Falta información", ambiguous: "! Hay más de una posibilidad" }[item.origin]}</p>
          {(item.excerpt || item.candidate_ids.length > 0) && <details><summary>Ver evidencia y candidatos</summary>{item.excerpt && <blockquote className="whitespace-pre-wrap">{item.excerpt}</blockquote>}<p>Candidatos: {item.candidate_ids.length ? item.candidate_ids.map(id => catalog?.items.find(c => c.id === id)?.name ?? "Nombre no disponible en el catálogo").join(", ") : "Ninguno"}</p></details>}
        </li>)}</ul>
        {warnings && <><ul aria-label="Advertencias" className="stack-sm">{warnings.summaries.map((warning, i) => <li key={i} className="muted">{warning}</li>)}{warnings.important.map((warning, i) => <li key={`important-${i}`} className="notice">{warning}</li>)}</ul>{warnings.originals.length > 0 && <details className="accordion"><summary>Advertencias completas</summary><ul>{warnings.originals.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}</>}
        <details className="accordion"><summary>Versión y propuesta recibida</summary><p>Versión técnica del dataset: {preview.dataset_version}</p><pre className="technical-json">{JSON.stringify(preview.proposal, null, 2)}</pre></details>
      </section>
      <form onSubmit={save} className="surface stack" aria-label="Propuesta editable" onChange={() => setConfirmed(false)}>
        <fieldset disabled={busy || blocked} className="space-y-4"><legend className="text-xl font-bold">Corregir propuesta completa</legend>
          <p className="muted">Elegí los componentes correctos. Dejá vacío lo que no conocés; no se asume compatible.</p>
          <label className="block">Nombre de PC<input name="name" maxLength={100} required defaultValue={preview.proposal.name} /></label>
          {!catalog && <p className="notice">Catálogo no disponible: podés omitir referencias, no inventarlas.</p>}
          {pcCategories.map(category => {
            const selected = preview.proposal.components.find(c => c.category === category);
            return <div key={category}><label className="block" htmlFor={`import-${category}`}>{categories[category]}</label>
              <select id={`import-${category}`} name={category} defaultValue={selected?.component_id ?? ""}>
                 <option value="">Por confirmar / sin componente declarado</option>
                {selected && !catalog?.items.some(c => c.id === selected.component_id) && <option value={selected.component_id}>Referencia {selected.component_id} (nombre no disponible)</option>}
                {catalog?.items.filter(c => c.category === category).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>;
          })}
          <label className="block">Cantidad de módulos RAM idénticos<input name="ram-quantity" type="number" min={1} max={8} defaultValue={preview.proposal.components.find(c => c.category === "ram")?.quantity ?? ""} /></label>
          <label className="block">BIOS declarada<input name="bios_version" maxLength={100} defaultValue={preview.proposal.context.bios_version ?? ""} /></label>
          <label className="block">Notas declaradas<textarea name="notes" maxLength={1000} defaultValue={preview.proposal.context.notes ?? ""} /></label>
        </fieldset>
        <LegacySaveControls busy={busy} blocked={blocked} confirmed={confirmed} onConfirmedChange={setConfirmed} onCancel={() => { setPreview(null); setError(""); setConfirmed(false); setBlocked(false); }} />
      </form>
    </div>}
  </section>;
}
