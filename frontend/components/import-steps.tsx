import type { Ref } from "react";
import Link from "next/link";
import { confirmGate, draftSummary, importSteps, type ImportStep } from "../lib/import-steps";
import type { ExtractionState, TowerProposalDraft } from "../lib/tower-extraction";

export function ImportStepList({ step }: { step: ImportStep }) {
  return <nav aria-label="Pasos para agregar tu PC">
    <p className="import-step-count">Paso {step} de {importSteps.length}</p>
    <ol className="import-steps">{importSteps.map(item => <li key={item.n} aria-current={item.n === step ? "step" : undefined} className={item.n < step ? "is-done" : undefined}><b aria-hidden="true">{item.n}</b>{item.label}</li>)}</ol>
  </nav>;
}

type ConfirmProps = {
  draft: TowerProposalDraft; confirmed: boolean; edited: boolean; busy: boolean; blocked: ExtractionState["blocked"];
  onName: (name: string) => void; onConfirmed: (value: boolean) => void; onSubmit: () => void;
  onBack: () => void; onDiscard: () => void; onAllowRetry: () => void; headingRef?: Ref<HTMLHeadingElement>;
};

/** Paso 3: nombre, resumen y confirmación explícita, con los estados de catálogo cambiado y resultado incierto. */
export function ImportConfirmStep({ draft, confirmed, edited, busy, blocked, onName, onConfirmed, onSubmit, onBack, onDiscard, onAllowRetry, headingRef }: ConfirmProps) {
  const gate = confirmGate({ confirmed, edited, busy, blocked });
  return <form aria-label="Guardar tu PC" className="surface stack import-confirm" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
    <header className="stack-sm"><h2 ref={headingRef} tabIndex={-1}>Guardala</h2><p className="muted">Todavía no se guardó nada. Esto es lo que se va a guardar si confirmás.</p></header>
    <label>Nombre de tu PC<input required maxLength={100} value={draft.name} disabled={busy} onChange={event => onName(event.target.value)} /></label>
    <ul className="import-summary" aria-label="Resumen de lo que se va a guardar">{draftSummary(draft).map(row => <li key={row.category}><strong>{row.label}</strong><span>{row.text}</span></li>)}</ul>
    <label className="import-consent"><input type="checkbox" checked={confirmed} disabled={busy || !!blocked} onChange={event => onConfirmed(event.target.checked)} />Revisé esta propuesta y confirmo explícitamente guardarla</label>
    <button disabled={!gate.canSave} aria-describedby={gate.reason ? "import-confirm-reason" : undefined}>Confirmar y guardar mi torre</button>
    {gate.reason && <p role="status" className={blocked ? "notice" : "muted"} id="import-confirm-reason">{gate.reason}</p>}
    {blocked === "catalog" && <div className="stack-sm"><p>Tus correcciones se conservan. <Link href="/catalog">Revisá el catálogo</Link> y, cuando quieras, volvé a pegar tu lista para armar una propuesta nueva.</p></div>}
    {blocked === "uncertain" && <div className="stack-sm"><p>Primero <Link href="/pcs">revisá Mis PCs</Link>: puede que la PC ya esté guardada. No vamos a reenviar nada solos.</p><button type="button" className="secondary" disabled={busy} onClick={onAllowRetry}>Ya revisé Mis PCs: autorizar un nuevo envío</button></div>}
    <p className="muted">Si repetís la confirmación puede crearse otra PC igual. Cancelar la espera no deshace un guardado ya hecho.</p>
    <div className="row wrap">
      <button type="button" className="secondary" disabled={busy} onClick={onBack}>Volver a revisar</button>
      {!busy && blocked !== "uncertain" && <button type="button" className="secondary" onClick={onDiscard}>Descartar y volver a pegar</button>}
    </div>
  </form>;
}
