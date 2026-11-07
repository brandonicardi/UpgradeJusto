import { RemoteProductName } from "./remote-product-selector";
import { towerCategories } from "../lib/towers";
import type { TowerExtraction } from "../lib/tower-extraction";

export default function TowerExtractionEvidence({ preview }: { preview: TowerExtraction }) {
  return <section aria-label="Evidencia de extracción de torre" className="surface stack"><h2>Qué pudo reconocer</h2><p>Es una propuesta, no compatibilidad. Un fragmento no demuestra medidas, consumo ni capacidad.</p>
    {preview.evidence.map(item => <section key={item.category}><h3>{towerCategories[item.category]}</h3><p>{item.status === "present" ? "Componente identificado para revisar" : item.status === "absent" ? "Ausencia declarada en el texto" : "Por confirmar"}</p>{item.absence_excerpt && <blockquote>{item.absence_excerpt}</blockquote>}
      {item.lines.map((line, index) => <details key={index}><summary>Fragmento {index + 1} · {line.resolution === "needs_review" ? "Necesita revisión" : line.resolution === "catalog" ? "Posible referencia de catálogo" : "Modelo declarado"} · cantidad {line.quantity === null ? "desconocida; completá explícitamente" : line.quantity}</summary><blockquote className="whitespace-pre-wrap">{line.excerpt}</blockquote>{line.quantity_excerpt && <p>Cantidad mencionada: {line.quantity_excerpt}</p>}<p>Modelo declarado: {line.declared_model ?? "No informado"}</p><ul>{line.candidate_ids.map(id => <li key={id}><RemoteProductName id={id} category={item.category} /></li>)}</ul></details>)}
    </section>)}
    {preview.warnings.length > 0 && <details><summary>Advertencias de la extracción</summary><ul>{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
    <details><summary>Faltantes y versión del catálogo</summary><pre className="hardware-example">{JSON.stringify(preview.missing_fields, null, 2)}</pre><p>Versión técnica: {preview.catalog_revision}</p></details>
  </section>;
}
