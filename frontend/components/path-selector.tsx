import Link from "next/link";
export default function PathSelector({ active }: { active?: "existing" | "scratch" }) {
  return <section className="v0-path-selector" aria-label="Elegí tu punto de partida"><div><p className="eyebrow">Punto de partida</p><h2>¿Cómo querés empezar?</h2><p>El camino cambia según si ya tenés componentes para conservar.</p></div><div className="v0-path-options"><Link href="/pcs" aria-current={active === "existing" ? "page" : undefined}><strong>Ya tengo una PC</strong><span>Revisar tus componentes y planificar una mejora.</span></Link><Link href="/build" aria-current={active === "scratch" ? "page" : undefined}><strong>Quiero armar una desde cero</strong><span>Elegir componentes, ver faltantes y cuidar el presupuesto.</span></Link></div></section>;
}
