import type { Category, Component } from "./catalog";

// Stable, known catalog aliases, not claims about a product's physical appearance.
export const productVisualManifest = Object.fromEntries(["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P15", "P16", "P17", "P18"].map(id => [id, { modelKey: id.toLowerCase(), kind: "category-illustration" as const }]));
export const categoryIllustrations: Record<Category, string> = { cpu: "/illustrations/cpu.svg", motherboard: "/illustrations/motherboard.svg", ram: "/illustrations/ram.svg", gpu: "/illustrations/gpu.svg", psu: "/illustrations/psu.svg", case: "/illustrations/case.svg" };
export function documentedCapacity(component: Component | undefined, quantity: number): string | null {
  if (!component || !["ram", "gpu"].includes(component.category) || !Number.isInteger(quantity) || quantity < 1 || (component.category === "gpu" && quantity !== 1)) return null;
  const capacities: number[] = [];
  let invalid = false;
  function collect(value: unknown, unitRequired = false) {
    if (value === undefined || value === null) return;
    const match = typeof value === "string" ? (unitRequired ? /^([1-9]\d*(?:\.\d+)?) GB$/ : /^([1-9]\d*(?:\.\d+)?)(?: GB)?$/).exec(value) : null;
    const number = typeof value === "number" && !unitRequired ? value : match ? Number(match[1]) : NaN;
    if (!Number.isFinite(number) || number <= 0) invalid = true;
    else capacities.push(number);
  }
  // Published curated strings. Never derive capacity from a name or reference ID.
  collect(component.attributes[component.category === "ram" ? "capacity_per_module" : "vram"], true);
  if (component.category === "ram") collect(component.attributes.module_capacity, true);
  for (const key of ["capacity_gb", "memory_capacity_gb", "memory_gb", "vram_gb"]) {
    collect(component.attributes[key]);
  }
  const structured = component.attributes.basic_stock_v1;
  if (structured !== undefined && structured !== null) {
    try {
      const parsed: unknown = JSON.parse(structured);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      const data = (parsed as Record<string, unknown>).data;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const facts = data as Record<string, unknown>;
        if (facts.capacity_conflict === true) return null;
        collect(facts[component.category === "ram" ? "capacity_per_module_gb" : "vram_gb"]);
      }
    } catch { return null; }
  }
  const unique = [...new Set(capacities)];
  if (invalid || unique.length !== 1) return null;
  const total = unique[0] * (component.category === "ram" ? quantity : 1);
  return Number.isFinite(total) ? `${total} GB` : null;
}
