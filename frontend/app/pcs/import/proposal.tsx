"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronLeft, CircleHelp, Info, Minus } from "lucide-react";
import { Button } from "../../../components/uj/button";
import { Field } from "../../../components/uj/field";
import { Notice } from "../../../components/uj/notice";
import { conteoDeMarcas, filasDeRevision, resumenParaGuardar, textoDeEjemplo } from "../../../lib/import-review";
import { currentImportStep, importSteps, type ImportStep } from "../../../lib/import-steps";
import { cargaDeLaPc } from "../../../lib/mi-pc";
import { mainRoutes } from "../../../lib/shell-nav";
import { createTowerExtraction, extractionDraft, type ExtractionState, type TowerExtraction, type TowerProposalDraft } from "../../../lib/tower-extraction";
import type { Tower } from "../../../lib/towers";
import AssemblyStateSelect from "../assembly-state";
import FilaDeRevisionView from "./revision";
import "./import.css";

const MENSAJE_INICIAL = "Nada se guarda sin tu confirmación.";
const rutaConviene = mainRoutes[1][0];

function Panel({ id, n, titulo, descripcion, bloqueado, headingRef, children }: { id: string; n: number; titulo: string; descripcion: string; bloqueado: boolean; headingRef: React.Ref<HTMLHeadingElement>; children: ReactNode }) {
  return <section className={`imp-panel${bloqueado ? " is-locked" : ""}`} id={id} aria-labelledby={`${id}-titulo`}>
    <div className="imp-panel-head"><span className="imp-n">PASO {n} DE 3</span><h2 id={`${id}-titulo`} ref={headingRef} tabIndex={-1}>{titulo}</h2><p>{descripcion}</p></div>
    {!bloqueado && <div className="imp-panel-body">{children}</div>}
  </section>;
}

export default function ImportTower() {
  const [text, setText] = useState(""), [preview, setPreview] = useState<TowerExtraction | null>(null), [draft, setDraft] = useState<TowerProposalDraft | null>(null), [saved, setSaved] = useState<Tower | null>(null), [reviewing, setReviewing] = useState<ImportStep>(2), [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [state, setState] = useState<ExtractionState>({ phase: "idle", message: MENSAJE_INICIAL, blocked: null });
  const controller = useRef<ReturnType<typeof createTowerExtraction> | null>(null);
  useEffect(() => {
    controller.current = createTowerExtraction({ onState: setState, onPreview: next => {
      setPreview(next); setReviewing(2);
      setDraft(next ? (() => { const base = extractionDraft(next); return base.name.trim() === "Torre extraída" ? { ...base, name: "Mi PC" } : base; })() : null);
    }, onSaved: setSaved });
    return () => { controller.current?.dispose(); controller.current = null; };
  }, []);

  // El enlace «/pcs/import#ayuda» abre la ayuda y lleva hasta ella. El desplazamiento espera
  // un cuadro a que la ayuda esté abierta: recién ahí tiene su altura definitiva.
  useEffect(() => {
    const abrirSiCorresponde = () => {
      if (window.location.hash !== "#ayuda") return;
      setAyudaAbierta(true);
      requestAnimationFrame(() => document.getElementById("ayuda")?.scrollIntoView?.({ block: "center" }));
    };
    abrirSiCorresponde();
    window.addEventListener("hashchange", abrirSiCorresponde);
    return () => window.removeEventListener("hashchange", abrirSiCorresponde);
  }, []);

  const busy = state.phase === "extracting" || state.phase === "confirming";
  const step = currentImportStep(!!(preview && draft), !!saved, reviewing);
  const h1 = useRef<HTMLHeadingElement | null>(null), h2 = useRef<HTMLHeadingElement | null>(null), h3 = useRef<HTMLHeadingElement | null>(null), anterior = useRef(step);
  // Al cambiar de paso el foco pasa al encabezado de ese paso, para que el teclado no pierda el contexto.
  useEffect(() => {
    if (anterior.current !== step) { const destino = { 1: h1, 2: h2, 3: h3 }[step].current; destino?.focus(); destino?.scrollIntoView?.({ behavior: "smooth", block: "start" }); }
    anterior.current = step;
  }, [step]);

  const filas = preview && draft ? filasDeRevision(preview, draft) : [];
  const conteo = conteoDeMarcas(filas), resumen = draft ? resumenParaGuardar(filas, draft) : [];
  const faltanCantidades = !!draft?.lines.some(line => line.quantity === null);
  const descartar = () => controller.current?.cancel();
  const mensaje = state.phase === "idle" && state.message !== MENSAJE_INICIAL ? state.message : "";
  const carga = saved ? cargaDeLaPc(saved) : null;

  return <section className="imp-screen" aria-busy={busy}>
    <Link className="imp-back" href="/pcs"><ChevronLeft aria-hidden="true" />Volver a Mi PC</Link>
    <section className="imp-hero"><h1>Contanos qué tiene tu PC</h1><p>Pegá lo que tengas a mano y nosotros lo ordenamos. Antes de guardar, revisás todo y corregís lo que haga falta.</p></section>
    <ol className="import-steps imp-progress" aria-label="Pasos para agregar tu PC">{importSteps.map(item => <li key={item.n} aria-current={item.n === step ? "step" : undefined} className={item.n < step || (saved && item.n === 3) ? "is-done" : undefined}><b aria-hidden="true">{item.n}</b>{item.label}</li>)}</ol>

    <div className="imp-layout">
      <div className="imp-main">
        <Panel id="p1" n={1} titulo="Pegá lo que sepas de tu PC" descripcion="Sirve cualquier cosa: la factura, un mensaje de quien te la armó o lo que muestra Windows. No hace falta que esté completo ni ordenado." bloqueado={false} headingRef={h1}>
          <form className="imp-form" aria-label="Pegar la lista de tu PC" onSubmit={event => { event.preventDefault(); void controller.current?.extract(text); }}>
            <label className="imp-paste-field"><span className="imp-label">Tu lista</span>
              <textarea className="imp-paste" name="text" maxLength={12000} placeholder="Por ejemplo: Procesador Ryzen 5 5600, 16 GB de memoria, placa de video GTX 1650…" value={text} disabled={busy} onChange={event => setText(event.target.value)} aria-describedby="imp-paste-help" />
              <span className="imp-help" id="imp-paste-help">No pegues contraseñas, números de tarjeta ni datos personales.</span></label>
            <div className="imp-actions">
              <Button peso="principal" type="submit" disabled={busy || !text.trim()}>Ordenar mi lista</Button>
              <Button peso="quieto" disabled={busy} onClick={() => setText(textoDeEjemplo)}>Probar con un ejemplo</Button>
              {state.phase === "extracting" && <span className="imp-reading" role="status">Leyendo tu lista…<button type="button" className="imp-quiet" onClick={() => controller.current?.cancel()}>Cancelar</button></span>}
            </div>
            <p className={mensaje ? "imp-help" : "sr-only"} role="status">{mensaje || MENSAJE_INICIAL}</p>
          </form>
          <details className="imp-where" id="ayuda" open={ayudaAbierta} onToggle={event => setAyudaAbierta(event.currentTarget.open)}>
            <summary>¿No sabés de dónde sacar la lista?</summary>
            <ol>
              <li>En Windows, abrí <strong>Configuración → Sistema → Información</strong>. Ahí ves el procesador y la memoria.</li>
              <li>Abrí el <strong>Administrador de tareas</strong> (Ctrl + Shift + Esc) y entrá a <strong>Rendimiento</strong>. Ahí aparecen la placa de video y los discos.</li>
              <li>Copiá lo que veas y pegalo arriba. Lo que falte lo completamos después.</li>
            </ol>
          </details>
        </Panel>

        <Panel id="p2" n={2} titulo="Revisá lo que entendimos" descripcion="Cada pieza muestra de qué parte de tu texto la sacamos. Corregí lo que esté mal. Lo que no sepas, dejalo así: no lo vamos a adivinar." bloqueado={!(preview && draft)} headingRef={h2}>
          {preview && draft && <>
            <div className="imp-count" role="group" aria-label="Resumen">
              <span className="imp-tag imp-tag-leida"><Check aria-hidden="true" strokeWidth={2.25} />{conteo.leidas} las leímos bien</span>
              <span className="imp-tag imp-tag-revisar"><CircleHelp aria-hidden="true" strokeWidth={2.25} />{conteo.revisar} para revisar</span>
              <span className="imp-tag imp-tag-sin_dato"><Minus aria-hidden="true" strokeWidth={2.25} />{conteo.sinDato} no estaban</span>
            </div>
            <div className="imp-info" role="status"><Info aria-hidden="true" strokeWidth={2.25} /><div><strong>Todavía no guardamos nada</strong><p>Esto es una propuesta. Tu PC se guarda recién cuando confirmes en el paso 3.</p></div></div>
            <form aria-label="Propuesta editable de tu PC" className="imp-review" onSubmit={event => { event.preventDefault(); if (!faltanCantidades) setReviewing(3); }}>
              <ul className="imp-rows">{filas.map(fila => <FilaDeRevisionView key={fila.category} fila={fila} draft={draft} deshabilitado={busy} onDraft={setDraft} />)}</ul>
              {faltanCantidades && <p className="imp-help" role="status">Falta indicar cuántas son en algunas piezas. Completalo para seguir.</p>}
              <div className="imp-actions">
                <Button peso="principal" type="submit" disabled={busy || faltanCantidades}>Está bien, seguir</Button>
                {!busy && state.blocked !== "uncertain" && <Button peso="quieto" onClick={descartar}>Volver a pegar</Button>}
              </div>
            </form>
          </>}
        </Panel>

        <Panel id="p3" n={3} titulo="Guardala" descripcion="Fijate el resumen y confirmá. Después vas a poder cambiar cualquier pieza desde Mi PC." bloqueado={!(preview && draft && (step === 3 || saved))} headingRef={h3}>
          {preview && draft && <>
            <AssemblyStateSelect value={draft.context.assembly_state ?? null} disabled={busy || !!saved} onChange={assembly_state => setDraft({ ...draft, context: { ...draft.context, assembly_state } })} />
            <Field etiqueta="¿Cómo le decimos a esta PC?" maxLength={100} value={draft.name} disabled={busy || !!saved} onChange={event => setDraft({ ...draft, name: event.target.value })} />
            <ul className="imp-summary" aria-label="Lo que se va a guardar">{resumen.map((linea, index) => <li key={index}><Check aria-hidden="true" strokeWidth={2.25} /><span>{linea.destacado && <strong>{linea.destacado}</strong>}{linea.resto}</span></li>)}</ul>
            {!saved && <div className="imp-actions">
              <Button peso="principal" disabled={busy || !!state.blocked || !draft.name.trim()} onClick={() => void controller.current?.confirm(draft, preview.catalog_revision, true)}>Sí, guardar mi PC</Button>
              <Button peso="secundario" disabled={busy} onClick={() => setReviewing(2)}>Volver a revisar</Button>
              {state.phase === "confirming" && <button type="button" className="imp-quiet" onClick={() => controller.current?.cancel()}>Dejar de esperar</button>}
            </div>}
            {state.phase === "confirming" && <p className="imp-help" role="status">Guardando tu PC…</p>}
            {state.blocked === "catalog" && <Notice tono="revisar" titulo="El catálogo cambió">Tus correcciones se conservan. <Link href="/catalog">Mirá el catálogo</Link> y, cuando quieras, volvé a pegar tu lista para armar una propuesta nueva.</Notice>}
            {state.blocked === "uncertain" && <div className="imp-uncertain"><Notice tono="revisar" titulo="No sabemos si se guardó">Primero <Link href="/pcs">revisá Mi PC</Link>: puede que ya esté guardada. No vamos a reenviar nada solos.</Notice><Button peso="secundario" chico disabled={busy} onClick={() => controller.current?.allowExplicitRetry()}>Ya la revisé: quiero guardar de nuevo</Button></div>}
            {saved && <div className="imp-saved" role="status">
              <Notice tono="encaja" titulo={`Listo, guardamos «${saved.name}»`}>Tiene {carga?.cargadas ?? 0} de {carga?.total ?? 7} piezas esenciales{carga && carga.porConfirmar > 0 ? " y a algunas les falta un dato" : ""}. Cuando quieras, {carga && carga.porConfirmar > 0 ? "las completás" : "la revisás"} desde Mi PC.</Notice>
              <div className="imp-actions"><Link className="imp-link-btn imp-link-principal" href={rutaConviene}>Ver qué me conviene</Link><Link className="imp-link-btn imp-link-secundario" href="/pcs">Ir a Mi PC</Link>
                <button type="button" className="imp-quiet" onClick={() => { setSaved(null); controller.current?.cancel(); setText(""); }}>Agregar otra PC con otra lista</button></div>
            </div>}
          </>}
        </Panel>
      </div>

      <aside className="imp-side" aria-label="Cómo funciona">
        <div className="imp-card imp-trust"><h2>Vos tenés la última palabra</h2>
          <ul><li><Check aria-hidden="true" strokeWidth={2.25} />Solo leemos las piezas de tu texto.</li><li><Check aria-hidden="true" strokeWidth={2.25} />Te mostramos de dónde salió cada dato.</li><li><Check aria-hidden="true" strokeWidth={2.25} />Nada se guarda hasta que confirmes.</li></ul></div>
        <div className="imp-card"><h2>¿Y si no sé algo?</h2><p>No pasa nada. Lo dejamos como «sin dato» y te avisamos cuando haga falta. Nunca lo completamos por nuestra cuenta.</p></div>
        <div className="imp-card"><h2>¿Preferís otra forma?</h2><p>Si conocés las piezas, podés elegirlas una por una del catálogo.</p><Link className="imp-link-btn imp-link-secundario imp-chico" href="/pcs?nueva=1">Elegir pieza por pieza</Link></div>
      </aside>
    </div>
  </section>;
}
