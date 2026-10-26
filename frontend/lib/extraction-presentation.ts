import type { Category } from "./catalog";
import type { Extraction } from "./curation";

export function extractionWarnings(preview: Pick<Extraction, "evidence" | "warnings">) {
  const labels: Record<Category, string> = { cpu: "Procesador", motherboard: "Placa madre", ram: "Memoria RAM", gpu: "Tarjeta gráfica", psu: "Fuente", case: "Gabinete" };
  const spanishPending = /^(cpu|motherboard|ram|gpu|psu|case):\s*sin selección confirmada \((?:unknown|text|ambiguous)\)\.?$/i;
  const shortPending = /^(cpu|motherboard|ram|gpu|psu|case)\s*[:=,]\s*(?:unknown|text|ambiguous)\.?$/i;
  const knownPending = (warning: string) => spanishPending.exec(warning) ?? shortPending.exec(warning);
  const pending = [
    ...preview.evidence.filter(item => item.origin !== "catalog").map(item => labels[item.field]),
    ...preview.warnings.flatMap(warning => { const match = knownPending(warning); return match ? [labels[match[1].toLowerCase() as Category]] : []; }),
  ];
  const danger = /incompatib|unsupported|not supported|no soport|riesgo|danger|conflict|contradic|cooler|disipador|refrigeraci|12.?v|voltaje|voltage/i;
  const unrecognized = preview.warnings.filter(warning => !knownPending(warning));
  const important = unrecognized.filter(warning => danger.test(warning));
  const summaries = pending.length ? [`Revisá y confirmá los componentes por completar: ${[...new Set(pending)].join(", ")}.`] : [];
  // Only the exact known pending formats are summarized. Every other warning
  // stays visible, literally; React performs escaping at the existing UI boundary.
  summaries.push(...unrecognized.filter(warning => !danger.test(warning)));
  return { summaries, important, originals: preview.warnings };
}
