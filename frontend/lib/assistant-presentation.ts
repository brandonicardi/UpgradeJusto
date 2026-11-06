export function toolStatusLabel(status: string): string {
  return ({ running: "En curso", completed: "Completado", failed: "Falló", interrupted: "Interrumpido", pending: "Pendiente" } as Record<string, string>)[status] ?? "Estado sin confirmar";
}
// «Hoy», «Ayer» o día/mes, para la lista de charlas y el separador del historial.
export function conversationDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = (value: Date) => Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000);
  const apart = day(now) - day(date);
  if (apart === 0) return "Hoy";
  if (apart === 1) return "Ayer";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export function toolNameLabel(name: string): string {
  return ({ evaluate_pc: "Comprobar componentes", simulate_upgrade: "Simular una mejora", recommend_upgrades: "Comparar mejoras", search_documentation: "Consultar documentación", search_public_documents: "Consultar documentación" } as Record<string, string>)[name] ?? "Consulta al servidor";
}
