import { hardwareGuideSources, hardwareTextExample } from "../lib/hardware-guide";

function OfficialLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (abre en otra pestaña)</span></a>;
}
export function HardwareExample() {
  return <section className="hardware-example-block" aria-label="Ejemplo de lista de componentes">
    <h2>Así puede verse una lista de piezas</h2>
    <p>Es sólo un ejemplo de formato, no tu PC ni una configuración comprobada. Reemplazá los datos por los tuyos; dejá por confirmar lo que no sepas.</p>
    <pre className="hardware-example" data-hardware-example>{hardwareTextExample}</pre>
  </section>;
}
export default function HardwareGuide({ id = "hardware-guide" }: { id?: string }) {
  return <section id={id} className="hardware-guide" aria-labelledby={`${id}-title`} tabIndex={-1}>
    <header><h2 id={`${id}-title`} tabIndex={-1}>Encontrá las piezas sin abrir la PC</h2><p>No necesitás saber todo para empezar. Anotá sólo los datos que aparezcan en tu equipo.</p></header>
    <details><summary>Procesador y memoria: empezá por Configuración</summary><div className="guide-task">
      <ol><li>Abrí <strong>Configuración</strong> de Windows.</li><li>Entrá en <strong>Sistema</strong> y buscá <strong>Información</strong>.</li><li>En las especificaciones del dispositivo, anotá el <strong>procesador</strong> y la <strong>RAM instalada</strong>, si aparecen.</li></ol>
      <p>La RAM total no dice cuántos módulos tenés ni su modelo. No deduzcas esa cantidad.</p>
      <OfficialLink href={hardwareGuideSources.device}>Cómo encontrar información del dispositivo en Microsoft</OfficialLink>
    </div></details>
    <details><summary>Gráfica, memoria y discos: Administrador de tareas</summary><div className="guide-task">
      <ol><li>Presioná <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Esc</kbd>.</li><li>Abrí <strong>Rendimiento</strong>.</li><li>Revisá <strong>CPU</strong> y <strong>Memoria</strong>. Según el equipo y Windows, también pueden aparecer <strong>GPU</strong> y <strong>Discos</strong>.</li><li>Copiá el modelo y la capacidad sólo cuando estén identificados. Si aparecen varias unidades, anotá cada una por separado.</li></ol>
      <p>Que no veas un dato aquí no significa que ese componente no exista. Dejalo por confirmar.</p>
      <OfficialLink href={hardwareGuideSources.specifications}>Guía de Microsoft para consultar las especificaciones</OfficialLink>
    </div></details>
    <details><summary>Placa madre y BIOS: Información del sistema</summary><div className="guide-task">
      <ol><li>Presioná <kbd>Windows</kbd> + <kbd>R</kbd>, escribí <code>msinfo32</code> y aceptá.</li><li>En <strong>Resumen del sistema</strong>, buscá el fabricante y producto de la placa base, y la versión de BIOS.</li><li>Anotá sólo lo que esté disponible. Algunos equipos no informan el modelo completo de la placa.</li></ol>
      <p>Es una consulta de información: no cambies la BIOS ni descargues una actualización para completar esta guía.</p>
      <OfficialLink href={hardwareGuideSources.systemInformation}>Referencia oficial de Información del sistema</OfficialLink>
    </div></details>
    <details><summary>¿Y la fuente, el gabinete o un modelo que no aparece?</summary><div className="guide-task">
      <p>Windows puede no informar el modelo exacto de la fuente o del gabinete. Si no lo conocés, escribí <strong>modelo por confirmar</strong>. No abras la fuente ni desarmes el equipo para completar estos datos.</p>
      <p><strong>“No sé cuál es” no significa “no tengo ese componente”.</strong> Tampoco completes medidas, consumo o capacidad a partir de una foto o de un nombre parecido.</p>
      <p>Opcional: si ya usás CPU-Z, sus pestañas de procesador y placa pueden aportar datos. No es un requisito ni hace falta instalarlo para continuar.</p>
      <OfficialLink href={hardwareGuideSources.cpuZ}>Información oficial de CPU-Z, opcional</OfficialLink>
    </div></details>
    <p className="guide-privacy">Compartí sólo información de hardware. No pegues informes completos con nombres de usuario o del equipo, números de serie, rutas, correos ni claves.</p>
  </section>;
}
