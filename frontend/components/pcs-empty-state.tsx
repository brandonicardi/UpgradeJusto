import Link from "next/link";
import { ClipboardPaste, Plus } from "lucide-react";
import { Button } from "./uj/button";

const ENLACE = "inline-flex min-h-12 items-center justify-center gap-space-2 rounded-pill border-[1.5px] border-solid border-linea-fuerte bg-papel-alto px-space-5 py-space-3 text-cuerpo-fuerte text-tinta no-underline hover:border-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

/** Se muestra cuando la persona todavía no guardó ninguna PC. No hay PC de ejemplo ni nada seleccionado. */
export default function PcsEmptyState({ onCreate, disabled = false }: { onCreate: () => void; disabled?: boolean }) {
  return <section aria-label="Todavía no tenés PCs" className="grid gap-space-4 rounded-md border-[1.5px] border-dashed border-linea-fuerte p-space-5 font-sans-uj text-tinta">
    <div className="grid gap-space-1"><h2 className="m-0 font-display text-titular-m">Todavía no cargaste ninguna PC</h2><p className="m-0 text-tinta-suave">Contanos qué tiene tu PC y te mostramos qué conviene cambiar. Podés cargarla a mano o pegar una lista con sus piezas.</p></div>
    <div className="flex flex-wrap gap-space-3"><Button peso="principal" disabled={disabled} icono={<Plus className="size-5" />} onClick={onCreate}>Crear a mano</Button><Link className={ENLACE} href="/pcs/import"><ClipboardPaste aria-hidden="true" className="size-5" />Pegar una lista</Link></div>
  </section>;
}
