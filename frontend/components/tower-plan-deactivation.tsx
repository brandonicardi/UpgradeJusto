"use client";
import type { FormEvent } from "react";

export default function TowerPlanDeactivation({ busy, onConfirm, onCancel }: { busy: boolean; onConfirm: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form aria-label="Confirmar baja de plan de torre" onSubmit={onConfirm}>
    <p>Dar de baja el plan lo retira del uso activo. El historial se conserva; no es borrado físico. Esto no publica el historial ni ofrece restauración.</p>
    <label><input type="checkbox" required disabled={busy} />Confirmo dar de baja este plan</label>
    <button disabled={busy}>Dar de baja el plan</button>
    <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar baja del plan</button>
  </form>;
}
