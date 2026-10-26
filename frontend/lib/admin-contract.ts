import type { Collection } from "./curation";
export const attributeKeys = {
  cpu: ["socket", "cores", "threads", "memory_type", "tdp"],
  motherboard: ["form_factor", "memory_type", "dimm_slots", "max_memory", "installed_bios"],
  ram: ["capacity_per_module", "rank", "memory_type", "latency", "voltage", "module_type", "height"],
  gpu: ["length", "height", "thickness", "slots", "vram", "interface", "power_connector", "recommended_psu"],
  psu: ["continuous_power", "length", "pcie_cables", "temperature_rating", "dimensions", "standard", "spare_pcie_cable_count", "evidence_note"],
  case: ["motherboard_formats", "psu_limit", "gpu_length_limit", "gpu_height_limit", "cooler_height_limit", "slots"],
};
const evidence = { source_id: "REEMPLAZAR_FUENTE_REAL", url: "https://example.test/reemplazar", locator: "REEMPLAZAR_LOCALIZADOR_REAL", consulted_on: "YYYY-MM-DD" };
const observation = { value: "REEMPLAZAR_VALOR_DOCUMENTADO", status: "documented", evidence: [evidence] };
export const adminExamples: Record<Collection, object> = {
  components: { category: "cpu", name: "REEMPLAZAR_MODELO_REAL", attributes: { socket: null, cores: null, threads: null, memory_type: null, tdp: null }, sources: [{ id: "REEMPLAZAR_FUENTE_REAL", url: "https://example.test/reemplazar" }] },
  prices: { component_id: "REEMPLAZAR_ID_REAL", amount: "REEMPLAZAR_DECIMAL", currency: "ARS", date: "YYYY-MM-DD", source: "REEMPLAZAR_PROCEDENCIA_Y_CONDICIONES" },
  sources: { source_id: evidence.source_id, url: evidence.url, consulted_on: evidence.consulted_on, locator: evidence.locator },
  cpu_support: { cpu_component_id: "REEMPLAZAR_CPU_REAL", motherboard_component_id: "REEMPLAZAR_PLACA_REAL", cpu_socket: observation, motherboard_socket: observation, applicable_revision: observation, row: { cpu_model: "REEMPLAZAR_MODELO_EXACTO", motherboard_model: "REEMPLAZAR_MODELO_EXACTO", applicable_revision: "REEMPLAZAR_REVISION_EXACTA", minimum_bios: "REEMPLAZAR_BIOS_DOCUMENTADA", earlier_bios: [], evidence: [evidence] } },
};
