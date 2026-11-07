"use client";
import { useId, useState } from "react";
import { Check, ChevronDown, CircleHelp, X } from "lucide-react";
import { pieceState, splitPieceChecks } from "../lib/catalog-piece";
import { towerRuleLabels, type TowerEvaluation } from "../lib/tower-compatibility";
type Rule = TowerEvaluation["rule_results"][number];
function Checks({ rules, id }: { rules: Rule[]; id?: string }) {
  return <ul className="piece-checks" id={id}>{rules.map((rule, index) => { const Icon = rule.state === "pass" ? Check : rule.state === "fail" ? X : CircleHelp; return <li key={`${rule.rule_id}-${index}`} data-state={rule.state}><Icon size={20} aria-hidden="true" /><span>{towerRuleLabels[rule.rule_id] ?? "Comprobación del componente"}<small>{pieceState[rule.state] ?? "Falta un dato"}</small></span></li>; })}</ul>;
}
/** Muestra primero lo que toca a esta pieza; el resto queda en un desplegable (abierto si alguna no encaja). */
export default function PieceChecks({ rules, category }: { rules: Rule[]; category: string }) {
  const { related, others } = splitPieceChecks(rules, category), listId = useId();
  const [open, setOpen] = useState(others.some(rule => rule.state === "fail"));
  return <>
    {related.length > 0 && <Checks rules={related} />}
    {others.length > 0 && <div className="piece-more">
      <button type="button" className="piece-more-toggle" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)}>{open ? "Ocultar las otras comprobaciones" : `Ver las otras comprobaciones (${others.length})`}<ChevronDown size={18} aria-hidden="true" /></button>
      <div hidden={!open}><Checks rules={others} id={listId} /></div>
    </div>}
  </>;
}
