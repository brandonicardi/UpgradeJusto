export function toolStatusLabel(status: string): string {
  return ({ running: "En curso", completed: "Completado", failed: "Falló", interrupted: "Interrumpido", pending: "Pendiente" } as Record<string, string>)[status] ?? "Estado sin confirmar";
}
export function toolNameLabel(name: string): string {
  return ({ evaluate_pc: "Comprobar componentes", simulate_upgrade: "Simular una mejora", recommend_upgrades: "Comparar mejoras", search_documentation: "Consultar documentación", search_public_documents: "Consultar documentación" } as Record<string, string>)[name] ?? "Consulta al servidor";
}
