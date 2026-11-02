import { towerCategories, type TowerCategory } from "../lib/towers";

// Category illustration adapted from the approved v0 export. It is never a
// photograph, model identity, attribute or evidence about a selected product.
export default function HardwareArt({ category }: { category: TowerCategory }) {
  const type = { motherboard: "board", storage: "ssd", cooler: "cooler", fan: "fan", cpu: "cpu", ram: "ram", gpu: "gpu", psu: "psu", case: "case" }[category];
  return <div className={`hardware-art art-${type}`} role="img" aria-label={`Ilustración de categoría: ${towerCategories[category]}`}>
    {type === "gpu" && <><i className="gpu-body" /><i className="gpu-fan" /><i className="gpu-fan second" /></>}
    {type === "board" && <><i className="board-chip" /><i className="board-slots" /></>}
    {type === "ram" && <><i className="ram-stick" /><i className="ram-stick second" /></>}
    {type === "cpu" && <i className="cpu-chip">CPU</i>}
    {type === "psu" && <><i className="psu-box" /><i className="psu-grille" /></>}
    {type === "case" && <><i className="case-frame" /><i className="case-window" /><i className="case-fan" /></>}
    {type === "ssd" && <><i className="ssd-card" /><i className="ssd-chip" /></>}
    {type === "cooler" && <><i className="cooler-stack" /><i className="cooler-fan" /></>}
    {type === "fan" && <><i className="fan-ring" /><i className="fan-blades" /></>}
  </div>;
}
