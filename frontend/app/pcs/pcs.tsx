"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import PcsEmptyState from "../../components/pcs-empty-state";
import { Button } from "../../components/uj/button";
import { Field } from "../../components/uj/field";
import { Notice } from "../../components/uj/notice";
import { cargaDeLaPc, piezas } from "../../lib/mi-pc";
import { mainRoutes } from "../../lib/shell-nav";
import { emptyTower, towerInput, towerRequest, type AssemblyState, type Tower, type TowerCategory, type TowerInput, type TowerPage } from "../../lib/towers";
import AssemblyStateSelect from "./assembly-state";
import EditorDePieza, { type CambioDePieza } from "./mi-pc-editor";
import EncajeDeLaPc from "./mi-pc-encaje";
import PiezasDeLaPc from "./mi-pc-piezas";
import EstadoDeArmado from "./pc-assembly";
import "./pcs.css";

const rutaConviene = mainRoutes[1][0];

export default function PCs({ nueva: abrirNueva = false }: { nueva?: boolean }) {
  const [lista, setLista] = useState<TowerPage | null>(null), [seleccionadaId, setSeleccionadaId] = useState<string | null>(null), [borrador, setBorrador] = useState<TowerInput | null>(abrirNueva ? emptyTower() : null);
  const [editando, setEditando] = useState<TowerCategory | null>(null), [ocupado, setOcupado] = useState(true), [error, setError] = useState(""), [errorEditor, setErrorEditor] = useState(""), [aviso, setAviso] = useState<string | null>(null), [borrando, setBorrando] = useState(false);
  const bloqueo = useRef(false);
  const seleccionada = lista?.items.find(pc => pc.id === seleccionadaId) ?? null;

  useEffect(() => {
    let activo = true;
    towerRequest("?page=1&page_size=20").then(respuesta => respuesta.json()).then((datos: TowerPage) => {
      if (!activo) return;
      setLista(datos); setSeleccionadaId(actual => actual ?? datos.items[0]?.id ?? null);
    }).catch(() => { if (activo) setError("No pudimos traer tus PCs. Iniciá sesión o probá de nuevo en un rato."); }).finally(() => { if (activo) setOcupado(false); });
    return () => { activo = false; };
  }, []);

  async function operar(accion: () => Promise<void>) {
    if (bloqueo.current) return;
    bloqueo.current = true; setOcupado(true); setError(""); setErrorEditor("");
    try { await accion(); } catch (falla) { const mensaje = falla instanceof Error ? falla.message : "No pudimos completar la acción. No se guardó ningún cambio."; if (editando) setErrorEditor(mensaje); else setError(mensaje); }
    finally { bloqueo.current = false; setOcupado(false); }
  }
  async function recargar(pagina = 1, elegir?: string) {
    const datos: TowerPage = await (await towerRequest(`?page=${pagina}&page_size=20`)).json();
    setLista(datos); setSeleccionadaId(elegir ?? seleccionadaId ?? datos.items[0]?.id ?? null);
  }
  const elegir = (id: string) => { setSeleccionadaId(id); setBorrador(null); setEditando(null); setAviso(null); setBorrando(false); setError(""); setErrorEditor(""); };
  const abrir = (category: TowerCategory) => { setEditando(category); setAviso(null); setErrorEditor(""); };
  const cerrar = () => { setEditando(null); setErrorEditor(""); };

  /** Arma la PC completa con el cambio de una pieza y la valida; el servidor sigue siendo quien decide qué se guarda. */
  function conCambio(base: TowerInput, category: TowerCategory, cambio: CambioDePieza): TowerInput {
    // El contexto guardado (incluida una BIOS declarada antes) se conserva tal cual: no se pide de nuevo.
    const siguiente: TowerInput = {
      ...base, category_status: { ...base.category_status, [category]: cambio.status },
      lines: [...base.lines.filter(line => line.category !== category), ...cambio.lines],
    };
    towerInput({ ...siguiente, name: siguiente.name.trim() || "Mi PC" });
    return siguiente;
  }
  function guardarPieza(category: TowerCategory, cambio: CambioDePieza) {
    if (borrador) {
      try { setBorrador(conCambio(borrador, category, cambio)); cerrar(); } catch (falla) { setErrorEditor(falla instanceof Error ? falla.message : "Revisá los datos del componente."); }
      return;
    }
    if (!seleccionada) return;
    void operar(async () => {
      const entrada = towerInput(conCambio(seleccionada, category, cambio));
      const guardada: Tower = await (await towerRequest(`/${seleccionada.id}`, "PUT", { ...entrada, revision: seleccionada.revision })).json();
      setLista(actual => actual && { ...actual, items: actual.items.map(pc => pc.id === guardada.id ? guardada : pc) });
      setEditando(null); setAviso(`Guardamos ${piezas[category].articulo}`);
    });
  }
  function guardarNueva() {
    if (!borrador) return;
    void operar(async () => {
      const guardada: Tower = await (await towerRequest("", "POST", towerInput(borrador))).json();
      await recargar(1, guardada.id); setBorrador(null); setAviso(`Guardamos «${guardada.name}»`);
    });
  }
  /** Guarda sólo la declaración de armado; no toca piezas ni inventa el estado. */
  function guardarArmado(valor: AssemblyState) {
    if (!seleccionada) return;
    void operar(async () => {
      const entrada = towerInput({ ...seleccionada, context: { ...seleccionada.context, assembly_state: valor } });
      const guardada: Tower = await (await towerRequest(`/${seleccionada.id}`, "PUT", { ...entrada, revision: seleccionada.revision })).json();
      setLista(actual => actual && { ...actual, items: actual.items.map(pc => pc.id === guardada.id ? guardada : pc) });
      setAviso("Guardamos si tu PC ya está armada");
    });
  }

  const vista = borrador ?? seleccionada;
  const carga = vista ? cargaDeLaPc(vista) : null;
  const titulo = borrador ? (borrador.name.trim() || "Una PC nueva") : seleccionada?.name ?? "Mi PC";
  const subtitulo = borrador ? "Cargá los componentes que conozcas y guardala. Lo que no sepas queda para después."
    : seleccionada ? "Esto es lo que sabemos de tu PC."
      : lista && !lista.total ? "Cargá tu primera PC para empezar." : "Un momento, estamos buscando tus PCs.";
  const editor = (category: TowerCategory) => {
    const lines = vista!.lines.filter(line => line.category === category);
    return <EditorDePieza key={`${vista === borrador ? "nueva" : seleccionada!.id}-${category}-${seleccionada?.revision ?? 0}`} category={category} ocupado={ocupado} error={errorEditor} textoDeGuardar={borrador ? "Guardar este componente" : "Guardar cambios"}
      inicial={{ status: vista!.category_status[category], lines }} onCancelar={cerrar} onGuardar={cambio => guardarPieza(category, cambio)} />;
  };

  return <section className="pcs-screen" aria-busy={ocupado}>
    <div className="pcs-tabs" role="group" aria-label="Tus PCs">
      <span className="pcs-label">Tus PCs</span>
      {lista?.items.map(pc => <button key={pc.id} type="button" className="pcs-tab" disabled={ocupado} aria-pressed={!borrador && seleccionadaId === pc.id} onClick={() => elegir(pc.id)}>{pc.name}</button>)}
      <button type="button" className="pcs-add" disabled={ocupado} onClick={() => { setBorrador(emptyTower()); setEditando(null); setAviso(null); setError(""); }}><Plus aria-hidden="true" />Agregar otra PC</button>
      {lista && lista.total > lista.page_size && <nav aria-label="Páginas de PCs" className="pcs-pages"><button type="button" className="pcs-quiet" disabled={ocupado || lista.page <= 1} onClick={() => operar(() => recargar(lista.page - 1))}>Anterior</button><button type="button" className="pcs-quiet" disabled={ocupado || lista.page * lista.page_size >= lista.total} onClick={() => operar(() => recargar(lista.page + 1))}>Siguiente</button></nav>}
    </div>

    <header className="pcs-head">
      <div><h1>{titulo}</h1><p>{subtitulo}</p></div>
      {carga && !borrador && <div className="pcs-complete" role="group" aria-label={carga.etiqueta}>
        <div className="pcs-complete-top"><strong>{carga.cargadas} de {carga.total} componentes esenciales</strong><span>{carga.porConfirmarTexto}</span></div>
        <ul className="pcs-dots" aria-hidden="true">{carga.puntos.map((punto, index) => <li key={index} className={punto === "ok" ? "" : punto} />)}</ul>
        <p className="pcs-complete-opcional">{carga.opcionales}</p>
      </div>}
    </header>

    <p role="status" className="sr-only">{ocupado ? "Un momento…" : ""}</p>
    {error && <div className="pcs-notice"><Notice tono="no" titulo="No pudimos hacerlo">{error}</Notice></div>}

    <div className="pcs-body">
      <section aria-label="Componentes de tu PC" className="pcs-main">
        {aviso && <div className="pcs-notice"><Notice tono="encaja" titulo={aviso}>Ya podemos revisar si todo encaja de nuevo.</Notice></div>}
        {borrador && <div className="pcs-card pcs-new"><Field etiqueta="¿Cómo le decimos a esta PC?" maxLength={100} value={borrador.name} placeholder="Por ejemplo: La de casa" ayuda={borrador.name.trim() ? undefined : "Poné un nombre para poder guardarla."} onChange={event => setBorrador({ ...borrador, name: event.target.value })} /><AssemblyStateSelect value={borrador.context.assembly_state ?? null} onChange={assembly_state => setBorrador({ ...borrador, context: { ...borrador.context, assembly_state } })} disabled={ocupado} /></div>}
        {vista && <PiezasDeLaPc pc={vista} editando={editando} editor={editando ? editor(editando) : null} onEditar={ocupado ? undefined : abrir} />}
        {borrador && <div className="pcs-editor-actions pcs-new-actions"><Button peso="principal" disabled={ocupado || !borrador.name.trim()} onClick={guardarNueva}>Guardar mi PC</Button><Button peso="secundario" disabled={ocupado} onClick={() => { setBorrador(null); setEditando(null); setErrorEditor(""); }}>Cancelar</Button></div>}
        {seleccionada && !borrador && <details className="pcs-more"><summary>Más opciones de esta PC</summary>
          <p className="pcs-help">Borrar una PC no se puede deshacer.</p>
          {!borrando ? <Button peso="secundario" chico disabled={ocupado} onClick={() => setBorrando(true)}>Quiero borrar esta PC</Button>
            : <form className="pcs-delete" aria-label="Confirmar borrado" onSubmit={event => { event.preventDefault(); void operar(async () => { await towerRequest(`/${seleccionada.id}`, "DELETE"); setSeleccionadaId(null); setBorrando(false); await recargar(1); setAviso("Borramos esa PC"); }); }}>
              <label><input type="checkbox" required disabled={ocupado} />Confirmo que quiero borrar «{seleccionada.name}»</label>
              <div className="pcs-editor-actions"><Button peso="peligro" chico type="submit" disabled={ocupado}>Borrar definitivamente</Button><Button peso="secundario" chico disabled={ocupado} onClick={() => setBorrando(false)}>Cancelar</Button></div>
            </form>}
        </details>}
        {!vista && lista && !lista.total && <PcsEmptyState disabled={ocupado} onCreate={() => setBorrador(emptyTower())} />}
      </section>

      <aside className="pcs-side">
        {seleccionada && !borrador && <>
          <div className="pcs-card pcs-act"><h2>¿Qué querés hacer con esta PC?</h2><p>Te mostramos qué conviene cambiar según tu objetivo y presupuesto.</p><Link href={`${rutaConviene}?pc=${encodeURIComponent(seleccionada.id)}`}>Ver qué me conviene</Link></div>
          <EstadoDeArmado key={`${seleccionada.id}-${seleccionada.revision}-assembly`} pc={seleccionada} ocupado={ocupado} onGuardar={guardarArmado} />
          <EncajeDeLaPc key={`${seleccionada.id}-${seleccionada.revision}`} pc={seleccionada} />
        </>}
        <div className="pcs-card"><div className="pcs-links">
          <Link href="/tower-plans">Ver mi plan <ArrowRight aria-hidden="true" /></Link>
          <Link href="/chat">Preguntarle al asistente <ArrowRight aria-hidden="true" /></Link>
          <Link href="/pcs/import">Pegar una lista para actualizarla <ArrowRight aria-hidden="true" /></Link>
        </div></div>
      </aside>
    </div>

    <div className="pcs-foot"><span>Tu PC sólo cambia cuando tocás «Guardar cambios». Mirar sugerencias no la modifica.</span><span><Link href="/">Volver al inicio</Link></span></div>
  </section>;
}
