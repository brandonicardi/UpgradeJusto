"use client";
import { useState } from "react";
import { Button } from "../../components/uj/button";
import AssemblyStateSelect from "./assembly-state";
import type { AssemblyState, Tower } from "../../lib/towers";

/** Estado de armado de una PC guardada: se guarda sólo al tocar el botón. */
export default function EstadoDeArmado({ pc, ocupado, onGuardar }: { pc: Tower; ocupado: boolean; onGuardar: (value: AssemblyState) => void }) {
  const guardado = pc.context.assembly_state ?? null, [valor, setValor] = useState<AssemblyState>(guardado);
  return <div className="pcs-card pcs-assembly">
    <AssemblyStateSelect value={valor} onChange={setValor} disabled={ocupado} />
    <Button peso="secundario" chico disabled={ocupado || valor === guardado} onClick={() => onGuardar(valor)}>Guardar estado</Button>
  </div>;
}
