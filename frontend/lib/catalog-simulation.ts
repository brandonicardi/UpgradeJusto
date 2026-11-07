import { towerCompatibilityRequest, towerSimulationInput } from "./tower-compatibility";
import type { Tower, TowerPage } from "./towers";
import { detalleDePieza } from "./mi-pc";
import type { TowerComponent } from "./tower-catalog";
export const catalogCategories = { gpu: "Placa de video", ram: "Memoria", cpu: "Procesador", storage: "Almacenamiento", psu: "Fuente", case: "Gabinete", motherboard: "Placa madre", cooler: "Cooler", fan: "Ventiladores" } as const;
/** Solo atributos documentados, sin inferir medidas ni beneficios. */
export function catalogTechnicalText(part: TowerComponent): string {
  const labels: Record<string, string> = { socket: "Socket", memory_type: "Memoria", form_factor: "Formato", interface: "Interfaz" };
  const details = Object.entries(labels).flatMap(([key, label]) => {
    const value = part.attributes[key]?.trim();
    return value ? [`${label}: ${value}`] : [];
  });
  return details.slice(0, 2).join(" · ") || detalleDePieza(part.category, part.attributes) || "No tenemos más datos de esta pieza todavía";
}
export async function loadCatalogPCs(signal: AbortSignal): Promise<{ pcs: Tower[]; access: "guest" | "ready" | "error" }> {
  try {
    const pcs: Tower[] = [];
    for (let page = 1; ; page++) {
      const response = await fetch(`/api/towers?page=${page}&page_size=50`, { credentials: "same-origin", cache: "no-store", signal });
      if (response.status === 401) return { pcs: [], access: "guest" };
      if (!response.ok) throw new Error("No disponible");
      const data: TowerPage = await response.json();
      if (!Array.isArray(data.items) || !Number.isSafeInteger(data.total) || data.total < 0) throw new Error("Respuesta no válida");
      pcs.push(...data.items);
      if (pcs.length >= data.total || !data.items.length) return { pcs, access: "ready" };
    }
  } catch { return { pcs: [], access: "error" }; }
}
/** Solo simulaciones sobre una copia. Nunca llama al guardado ni altera la PC recibida. */
export async function simulateCatalogPage(pc: Tower, parts: TowerComponent[], signal: AbortSignal, publish: (values: Record<string, string>) => void) {
  const values: Record<string, string> = {};
  let next = 0;
  async function worker() {
    while (!signal.aborted && next < parts.length) {
      const part = parts[next++];
      try {
        const input = towerSimulationInput(pc, [{ action: "replace_category", category: part.category, line_id: null, candidates: [{ component_id: part.id, declared_model: null, quantity: 1 }] }]);
        const result = await towerCompatibilityRequest(pc, "simulate", input, signal);
        if (signal.aborted) return;
        if (["compatible", "incompatible", "requiere_verificacion"].includes(result.verdict)) { values[part.id] = result.verdict; publish({ ...values }); }
      } catch { /* Una categoría no simulable o un error no tienen estado. */ }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
}
