import { isBasicStock, type Evaluation } from "./compatibility";
export const componentChecks: Record<string, { label: string; action: string }> = {
  B01: { label: "Procesador y placa", action: "Revisá el modelo exacto del procesador, el socket y la versión de BIOS de la placa." },
  B02: { label: "Memoria RAM", action: "Revisá tipo, formato, número de módulos y capacidad admitida por la placa." },
  B03: { label: "Conexión de la gráfica", action: "Confirmá la interfaz de la gráfica y la ranura de la placa." },
  B04: { label: "Espacio para la gráfica", action: "Compará el largo nominal de la gráfica con el espacio admitido por el gabinete." },
  B05: { label: "Potencia de la fuente", action: "Revisá la recomendación del fabricante para uso sin overclock y la fuente elegida." },
  B06: { label: "Alimentación y cables", action: "Confirmá conectores nativos, cables y condiciones documentadas de alimentación." },
  B07: { label: "Gabinete y formatos", action: "Confirmá formato de placa y fuente, y largo nominal de la fuente en el gabinete." },
};
export function centralEvaluationLabel(result: { verdict: string; scope?: Pick<NonNullable<Evaluation["scope"]>, "id" | "operating_regime"> }): string {
  if (!isBasicStock(result)) return result.verdict === "compatible" ? "Compatible según evaluación guardada" : result.verdict === "incompatible" ? "Incompatible según evaluación guardada" : "Falta información en la evaluación guardada";
  return result.verdict === "compatible" ? "Compatible para uso sin overclock" : result.verdict === "incompatible" ? "Incompatible" : "Falta información";
}
export const scopeBrief = "Comprobación básica de componentes. Revisá montaje y refrigeración antes de instalar.";
export function evaluationBrief(result: { scope?: Pick<NonNullable<Evaluation["scope"]>, "id" | "operating_regime"> }): string {
  return isBasicStock(result) ? scopeBrief : "Evaluación conservada con su alcance original. Revisá sus condiciones y los datos pendientes antes de instalar.";
}
export function installationActions(warnings: string[], additionalChecks: readonly { id: string; reason: string; status: string }[] = []): string[] {
  const conflictLabel = "La documentación de la fuente es contradictoria: revisá las especificaciones y el cableado antes de instalar.";
  const conflicts = additionalChecks.filter(check => check.id === "psu_12v_documentation_conflict" && ["unknown", "fail", "outside_scope"].includes(check.status) && check.reason.trim().length > 0);
  const actions = warnings.filter(warning => /cooler|disipador|refrigeraci|contradic|conflict|12.?v/i.test(warning)).map(warning => conflicts.some(check => check.reason === warning) || (/contradic|conflict/i.test(warning) && /psu|fuente|12.?v|rm750/i.test(warning)) ? conflictLabel : /cooler|disipador|refrigeraci/i.test(warning) ? "Refrigeración pendiente: confirmá un disipador adecuado y su montaje antes de instalar." : "Hay condiciones documentadas pendientes: revisalas antes de instalar.");
  return [...new Set([...(conflicts.length ? [conflictLabel] : []), ...actions])];
}
