import Link from "next/link";
import HardwareGuide from "./hardware-guide";
import type { TowerComponent } from "../lib/tower-catalog";
import { TowerProductPhoto } from "./tower-product-summary";
import { catalogBoundOffers } from "../lib/catalog-offers";
import { formatRetailARS, displayRetailDate, retailSourceURL } from "../lib/retail-presentation";
import { towerCategories, towerKeys } from "../lib/towers";
import HardwareArt from "./hardware-art";
import PathSelector from "./path-selector";

export default function BeginnerEntry({ sample = null }: { sample?: TowerComponent | null }) {
  const offer = sample ? catalogBoundOffers(sample).find(offer => offer.amount !== null) : null;
  return <div className="beginner-entry">
    <PathSelector />
    <header className="beginner-heading"><p className="eyebrow">Tu PC y próxima mejora</p><h1>Mejorá lo que ya tenés.</h1><p>Aprovechá tus piezas o empezá un armado desde cero, según tu objetivo y presupuesto.</p></header>
    <div className="home-workbench"><section className="home-configuration" aria-label="Empezar una configuración"><header><h2>Elegí por dónde empezar</h2><p>No hay piezas seleccionadas. Esta lista no representa una PC guardada.</p></header><div className="home-inventory">{towerKeys.map(category => <Link key={category} href={`/build#purchase-${category}`} className="home-inventory-row"><span className="unselected-photo"><HardwareArt category={category} /></span><span><strong>{towerCategories[category]}</strong><small>Sin elegir</small></span><span className="home-row-action">Elegir</span></Link>)}</div><p className="compact-help">Si ya tenés una PC, <Link href="/pcs">cargá tus piezas</Link> para comparar sólo lo que querés cambiar. No todas las categorías requieren una compra.</p></section><aside className="home-hardware-preview"><h2>Explorá una pieza real</h2>{sample ? <><TowerProductPhoto part={sample} /><p>{sample.name}</p>{offer && <><p className="home-sample-price">{formatRetailARS(offer.amount)}</p><small>{offer.store === "compragamer" ? "Compra Gamer" : "Venex"} · {offer.condition === "cash" ? "Contado" : "Lista (no cuotas)"}<br />Precio guardado el {displayRetailDate(offer.observed_at)}; verificá vigencia y stock.</small>{retailSourceURL(offer.source_url) && <a href={retailSourceURL(offer.source_url)!} target="_blank" rel="noopener noreferrer">Fuente del precio</a>}</>}<Link href={`/catalog/${encodeURIComponent(sample.id)}`}>Ver ficha y procedencia</Link><p className="compact-help">Muestra publicada, no una recomendación ni una PC de ejemplo.</p></> : <><p>No se pudo cargar una pieza. No mostramos fotos ni precios inventados.</p><Link href="/catalog">Ver catálogo real</Link></>}</aside></div>
    <details className="entry-help"><summary>Necesito ayuda para identificar mi PC o pegar una lista</summary>
    <section className="beginner-start" aria-labelledby="beginner-start-title"><h2 id="beginner-start-title" tabIndex={-1}>¿Cómo querés empezar?</h2>
      <ul className="beginner-choices">
        <li><p className="beginner-recommendation" id="beginner-help-note">Recomendado si recién empezás</p><a className="beginner-choice beginner-choice-primary" href="#hardware-guide-title" aria-describedby="beginner-help-note"><span>Necesito ayuda</span><span aria-hidden="true">›</span></a><p>Seguí la guía de Windows y anotá los datos que aparezcan, sin abrir la PC.</p></li>
        <li><Link className="beginner-choice" href="/pcs"><span>Conozco mis componentes</span><span aria-hidden="true">›</span></Link><p>Elegí tus piezas del catálogo o retomá una PC que ya guardaste.</p></li>
        <li><Link className="beginner-choice" href="/pcs/import" aria-describedby="beginner-paste-note"><span>Quiero pegar una lista</span><span aria-hidden="true">›</span></Link><p id="beginner-paste-note">Pegá sólo hardware, sin datos personales. Verás un ejemplo antes de escribir y revisarás la propuesta antes de guardar.</p></li>
      </ul>
    </section>
    <section className="beginner-route" aria-label="Recorrido de tu mejora"><h2>De tu PC a una mejora con sentido</h2><ol><li><strong>Tu PC</strong><span>Lo que sabés y lo que falta.</span></li><li><strong>Tu objetivo</strong><span>Qué querés mejorar y cuánto podés gastar.</span></li><li><strong>Una propuesta</strong><span>Cambios, coste y condiciones para revisar.</span></li><li><strong>Tu plan</strong><span>Organizá las compras por etapas.</span></li></ol><p>Podés empezar con información incompleta. Un dato por confirmar no se convierte en compatibilidad ni en coste cero.</p></section>
    <HardwareGuide />
    <a className="beginner-back" href="#beginner-start-title">Volver a las opciones para empezar</a>
    </details>
    <p className="beginner-catalog">¿Sólo querés mirar piezas? <Link href="/catalog">Explorar el catálogo</Link></p>
  </div>;
}
