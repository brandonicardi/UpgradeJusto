import { curationRequest, type AdminPage } from "./curation";
import { formatPieceARS, shortRetailDate } from "./retail-presentation";

export type DashboardCategory =
  | "cpu"
  | "motherboard"
  | "ram"
  | "gpu"
  | "psu"
  | "case"
  | "storage"
  | "cooler"
  | "fan";

export type MissingDataItem = {
  component_id: string;
  category: DashboardCategory;
  name: string;
  missing: string[];
  affected_pcs: number;
};

export type OldPriceItem = {
  component_id: string;
  category: DashboardCategory;
  name: string;
  amount: string;
  currency: string;
  store: string;
  observed_at: string;
  days: number;
};

export type DashboardMetrics = {
  components: number;
  missing_data: number;
  without_recent_price: number;
  stores: number;
};

export type AdminDashboard = {
  dataset_version: string;
  metrics: DashboardMetrics;
  missing_data: AdminPage<MissingDataItem>;
  old_prices: AdminPage<OldPriceItem>;
};

export type PublishPriceInput = {
  expected_active: string;
  component_id: string;
  amount: string;
  observed_on: string;
  source_url: string;
};

export type PublishPriceResult = {
  dataset_version: string;
  component_id: string;
  store: string;
  amount: string;
  observed_at: string;
};

// Nombres para personas, en singular, como en las maquetas.
export const dashboardCategoryLabels: Record<DashboardCategory, string> = {
  cpu: "Procesador",
  motherboard: "Placa madre",
  ram: "Memoria",
  gpu: "Placa de video",
  psu: "Fuente",
  case: "Gabinete",
  storage: "Almacenamiento",
  cooler: "Cooler",
  fan: "Ventiladores",
};

// Rótulos en castellano para cada atributo que el motor lee por categoría.
// Un atributo sin rótulo no se oculta ni se inventa: se muestra tal cual.
const missingAttributeLabels: Record<string, string> = {
  socket: "Conexión del procesador",
  memory_type: "Tipo de memoria",
  jedec_mts: "Velocidad de memoria (MT/s)",
  cpu_platform: "Plataforma del procesador",
  cpu_tdp_class_w: "Consumo del procesador (W)",
  cpu_stock_family: "Familia del procesador",
  module_type: "Formato de memoria",
  slots: "Lugares para memoria",
  max_total_gb: "Memoria máxima (GB)",
  ecc: "Memoria con corrección (ECC)",
  buffered: "Memoria con registro (buffered)",
  pcie_slot: "Ranuras PCIe",
  atx24_count: "Conector ATX de 24 pines",
  eps8_count: "Conectores de 8 pines",
  pcie8_count: "Cables PCIe de 8 pines de la fuente",
  form_factor: "Formato",
  tower_ports: "Puertos del gabinete",
  fan_headers: "Conectores de ventilador",
  shared_limits: "Límites compartidos",
  fan_total_current_ma: "Corriente total de ventiladores (mA)",
  capacity_gb: "Capacidad (GB)",
  pcie_interface: "Conexión PCIe",
  pcie_backward_compatible: "Compatible con PCIe anterior",
  length_mm: "Largo (mm)",
  recommended_psu_w: "Fuente recomendada (W)",
  nvidia_recommended_psu_w: "Fuente recomendada por NVIDIA (W)",
  psu_reference_platform: "Plataforma de referencia de la fuente",
  psu_reference_cpu_tdp_class_w: "Consumo de referencia del CPU (W)",
  psu_recommendation_basis: "Base de la recomendación de fuente",
  psu_reference_system: "Sistema de referencia de la fuente",
  gpu_power_kind: "Tipo de alimentación de la gráfica",
  gpu_power_count: "Cables de alimentación de la gráfica",
  tower_port_kind: "Tipo de puerto del gabinete",
  tower_port_form: "Forma del puerto del gabinete",
  continuous_power_w: "Potencia continua (W)",
  sata_power_count: "Conectores de energía SATA",
  gpu_limit_mm: "Largo máximo de placa de video (mm)",
  board_formats: "Formatos de placa madre",
  psu_formats: "Formatos de fuente",
  psu_limit_mm: "Largo máximo de fuente (mm)",
  storage_bays: "Bahías de almacenamiento",
  fan_positions: "Lugares para ventiladores",
  fan_supported_sizes_mm: "Tamaños de ventilador admitidos (mm)",
  storage_interface: "Conexión del almacenamiento",
  storage_form: "Formato del almacenamiento",
  cooler_sockets: "Zócalos que acepta",
  cooler_type: "Tipo de cooler",
  fan_count: "Cantidad de ventiladores",
  fan_voltage_mv: "Tensión del ventilador (mV)",
  fan_current_ma: "Corriente del ventilador (mA)",
  fan_connector: "Conector del ventilador",
  fan_size_mm: "Tamaño del ventilador (mm)",
};

export function missingAttributeLabel(attribute: string): string {
  return missingAttributeLabels[attribute] ?? attribute;
}

export function storeLabel(store: string): string {
  if (store === "compragamer") return "Compra Gamer";
  if (store === "venex") return "Venex";
  return store;
}

// `dd/mm · hace N días` para la lista de precios viejos. Sin datos no se inventa.
export function oldPriceDateLabel(observedAt: string, days: number): string {
  const date = shortRetailDate(observedAt);
  const elapsed = Number.isFinite(days) && days >= 0 ? (days === 1 ? "hace 1 día" : `hace ${days} días`) : "antigüedad por confirmar";
  return `${date} · ${elapsed}`;
}

// El importe viene del servidor; si no está completo, «Importe no disponible», nunca cero.
export function oldPriceAmountLabel(amount: string): string {
  return formatPieceARS(amount);
}

// Conteo de PCs afectadas: un número real del servidor. Nunca se calcula acá.
export function affectedPcsLabel(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "Sin dato";
  return count === 1 ? "1 PC" : `${count} PCs`;
}

// Normaliza el monto a como lo espera el servidor (hasta 2 decimales, sin miles).
// Devuelve null si no es un importe positivo; nunca convierte un error en cero.
export function normalizePriceAmount(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s/g, "");
  const normalized = trimmed.replace(",", ".");
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) return null;
  if (Number(normalized) <= 0) return null;
  return normalized;
}

// `ARS $ 389.900` para el resumen; vacío si el importe no es válido.
export function formatInputARS(raw: string): string {
  const normalized = normalizePriceAmount(raw);
  if (normalized === null) return "";
  const [integer, decimal = ""] = normalized.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `ARS $ ${grouped}${decimal ? `,${decimal}` : ""}`;
}

// Cliente tipado del tablero. Nunca decide compatibilidad ni envía user_id.
export function dashboardRequest(limit = 100, offset = 0): Promise<AdminDashboard> {
  return curationRequest(`/api/admin/dashboard?limit=${limit}&offset=${offset}`).then((response) => response.json());
}

export function publishPriceRequest(input: PublishPriceInput): Promise<PublishPriceResult> {
  return curationRequest("/api/admin/prices", "POST", input).then((response) => response.json());
}
