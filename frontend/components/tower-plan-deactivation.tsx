"use client";
import type { FormEvent } from "react";

export default function TowerPlanDeactivation({ busy, onConfirm, onCancel }: { busy: boolean; onConfirm: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form aria-label="Confirmar que querés borrar el plan" onSubmit={onConfirm}>
    <p>Borrar este plan lo saca de tu lista. Tu PC guardada no cambia.</p>
    <label><input type="checkbox" required disabled={busy} />Quiero borrar este plan</label>
    <button disabled={busy}>Borrar el plan</button>
    <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Mejor no</button>
  </form>;
}
