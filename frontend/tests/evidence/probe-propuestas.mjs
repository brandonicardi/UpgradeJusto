// Muestra, sin ventana, qué propuestas devuelve hoy el servidor para la PC de demostración.
// Uso: node frontend/tests/evidence/probe-propuestas.mjs [gaming|general|productivity] [presupuesto]
import { lanzar, sesionDemo } from "./demo-session.mjs";

const objetivo = process.argv[2] ?? "gaming", presupuesto = process.argv[3] ?? "500000.00";
const browser = await lanzar();
try {
  const { api, datos } = await sesionDemo(browser);
  const cuerpo = await api.enviar(`/api/towers/${datos.pcId}/recommendations/preview`, { expected_pc_revision: datos.pcRevision, objective: objetivo, budget_ars: presupuesto, price_condition: "cash", mode: "automatic", workload: null, materials: [], alternatives: [] });
  console.log("propuestas", cuerpo.items?.length, "faltantes", JSON.stringify(cuerpo.missing_fields)?.slice(0, 200));
  for (const item of cuerpo.items ?? []) {
    console.log(JSON.stringify({ estado: item.status, veredicto: item.evaluation?.verdict, reglas: item.evaluation?.rule_results?.length, version: item.evaluation?.rules_version, acciones: item.actions?.map(a => `${a.action}:${a.category}`), total: item.cost?.total_ars, dentro: item.cost?.within_budget, ofertas: item.offers?.length, beneficio: item.benefit?.status }));
  }
  if (!cuerpo.items?.length) console.log(JSON.stringify(cuerpo).slice(0, 600));
} finally { await browser.close(); }
