import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Button,
  ChatBubble,
  ChatComposer,
  ChatSuggestions,
  Field,
  Notice,
  PartCard,
  PcSlots,
  PlanSteps,
  PriceTag,
  Verdict,
} from "../../components/uj";
import { Mejora, ObjetivoUnico, ObjetivoVarios, Presupuesto } from "./demos";

export const metadata: Metadata = {
  title: "Sistema de diseño | UpgradeJusto",
  robots: { index: false, follow: false },
};

const PRECIO_A = {
  monto: 389900,
  condicion: "Contado",
  moneda: "ARS",
  fecha: "2026-10-28",
  tienda: "Tienda de ejemplo A",
  enlace: "https://example.com/tienda-a",
};

const PRECIO_B = {
  monto: 92500,
  moneda: "ARS",
  fecha: "2026-10-27",
  tienda: "Tienda de ejemplo B",
  enlace: "https://example.com/tienda-b",
};

const PRECIO_C = {
  monto: 74800,
  moneda: "ARS",
  fecha: "2026-10-26",
  tienda: "Tienda de ejemplo A",
  enlace: "https://example.com/tienda-a",
};

// Los totales y las diferencias son datos de ejemplo: la vitrina no suma ni resta precios.
// Este total corresponde a las tres etapas con precio de «Con todos los precios».
// Si a una etapa le falta el precio, la API no devuelve total y no se muestra ninguno.
const TOTAL_DEL_PLAN = {
  monto: 557200,
  moneda: "ARS",
  fecha: "2026-10-28",
  tienda: "las tiendas de cada etapa",
};

const MEJORA_BASE = {
  titulo: "Cambiá la placa de video",
  actual: "GTX 1650 · 4 GB",
  nueva: "RTX 4060 · 8 GB",
  motivos: ["Es el componente que más frena tus juegos hoy.", "Tu fuente de 550 W alcanza y entra en tu gabinete."],
  precio: PRECIO_A,
  veredicto: "compatible",
};

const GRILLA = "grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] items-start gap-space-5";

function Seccion({ id, titulo, bajada, children }: { id: string; titulo: string; bajada: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-space-5">
      <header className="grid gap-space-2">
        <h2 id={id} className="font-display text-titular-m!">
          {titulo}
        </h2>
        <p className="max-w-[60ch] text-cuerpo text-tinta-suave">{bajada}</p>
      </header>
      {children}
    </section>
  );
}

function Estado({ nombre, children }: { nombre: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start justify-items-start gap-space-2">
      <span className="text-etiqueta text-tinta-suave">{nombre}</span>
      {children}
    </div>
  );
}

export default function SistemaDisenoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-w-0 rounded-md bg-papel px-space-4 py-space-6 font-sans-uj text-tinta min-[900px]:px-space-7 min-[900px]:py-space-7">
      <div className="grid min-w-0 gap-space-7">
        <header className="grid max-w-[60ch] gap-space-3">
          <h1 className="font-display text-titular-l! min-[600px]:text-titular-xl!">Sistema de diseño</h1>
          <p className="text-cuerpo-l text-tinta-suave">
            Así se ve cada componente de la interfaz en todos sus estados. Los nombres, precios y tiendas son de
            ejemplo.
          </p>
        </header>

        <Seccion
          id="veredictos"
          titulo="Veredictos"
          bajada="Dicen si un componente encaja. Si no hay respuesta clara, nunca muestran «Encaja»."
        >
          <div className={GRILLA}>
            <Estado nombre="Encaja">
              <Verdict estado="compatible" />
            </Estado>
            <Estado nombre="Falta un dato">
              <Verdict estado="requiere_verificacion" />
            </Estado>
            <Estado nombre="No encaja">
              <Verdict estado="incompatible" />
            </Estado>
            <Estado nombre="Sin respuesta todavía">
              <Verdict estado={null} />
            </Estado>
          </div>
        </Seccion>

        <Seccion
          id="avisos"
          titulo="Avisos"
          bajada="Explican el porqué y qué hacer después. El rojo se anuncia solo a quien usa lector de pantalla."
        >
          <div className="grid gap-space-4">
            <Notice tono="encaja" titulo="Revisamos todo lo que aplica y encaja">
              Podés sumarlo a tu plan.
            </Notice>
            <Notice tono="revisar" titulo="Falta saber cuánto mide tu gabinete por dentro">
              Esta placa mide 30 cm. Medí desde el frente hasta donde se atornilla la placa y contanos.
            </Notice>
            <Notice tono="no" titulo="Tu fuente no alcanza para esta placa">
              Necesita al menos 650 W y la tuya tiene 450 W. Te sugerimos sumarla al plan.
            </Notice>
            <Notice tono="info" titulo="Los precios son los últimos que vimos">
              Antes de comprar, confirmá el precio y que haya stock en la tienda.
            </Notice>
          </div>
        </Seccion>

        <Seccion
          id="precios"
          titulo="Precios"
          bajada="Siempre con moneda, fecha y tienda. Si falta alguno de esos datos, decimos que no hay precio."
        >
          <div className={GRILLA}>
            <Estado nombre="Completo">
              <PriceTag {...PRECIO_A} />
            </Estado>
            <Estado nombre="Con condición">
              <PriceTag {...PRECIO_B} condicion="Con transferencia" />
            </Estado>
            <Estado nombre="Sin precio">
              <PriceTag />
            </Estado>
          </div>
        </Seccion>

        <Seccion
          id="piezas"
          titulo="Componentes"
          bajada="El nombre simple va primero y el modelo técnico después. Sin foto, se muestra el ícono de la categoría."
        >
          <div className="grid gap-space-4">
            <PartCard
              categoria="Placa de video"
              beneficio="Para jugar en alta calidad"
              modelo="GeForce RTX 4060 · 8 GB"
              precio={PRECIO_A}
              veredicto="compatible"
              href="#piezas"
            />
            <PartCard
              categoria="Memoria"
              beneficio="Para tener muchas cosas abiertas"
              modelo="2 × 16 GB DDR4 3200"
              precio={PRECIO_B}
              veredicto="requiere_verificacion"
            />
            <PartCard
              categoria="Fuente"
              beneficio="Para que todo tenga energía"
              modelo="Fuente de 450 W"
              precio={{ ...PRECIO_B, monto: 58900 }}
              veredicto="incompatible"
            />
            <PartCard categoria="Gabinete" beneficio="Para guardar y ventilar tus componentes" modelo="Gabinete mediano con ventana" />
          </div>
        </Seccion>

        <Seccion
          id="botones"
          titulo="Botones"
          bajada="Uno principal por pantalla. Si no se puede avanzar, el botón dice qué falta."
        >
          <div className="grid gap-space-5">
            <div className={GRILLA}>
              <Estado nombre="Principal">
                <Button peso="principal" icono={<ArrowRight className="size-4" strokeWidth={2.25} />}>
                  Ver qué me conviene
                </Button>
              </Estado>
              <Estado nombre="Secundario">
                <Button peso="secundario">Guardar para después</Button>
              </Estado>
              <Estado nombre="Quieto">
                <Button peso="quieto">Cancelar</Button>
              </Estado>
            </div>
            <div className={GRILLA}>
              <Estado nombre="Chico principal">
                <Button peso="principal" chico>
                  Sumar al plan
                </Button>
              </Estado>
              <Estado nombre="Chico secundario">
                <Button peso="secundario" chico>
                  Ver detalle
                </Button>
              </Estado>
              <Estado nombre="Deshabilitado con motivo">
                <Button peso="principal" disabled motivo="Elegí un componente para seguir">
                  Sumar al plan
                </Button>
              </Estado>
            </div>
          </div>
        </Seccion>

        <Seccion
          id="campos"
          titulo="Campos"
          bajada="La etiqueta siempre se ve. Cuando hay un error, decimos cómo arreglarlo."
        >
          <div className={GRILLA}>
            <Estado nombre="Normal">
              <Field etiqueta="¿Cómo se llama tu PC?" placeholder="Por ejemplo: La de casa" />
            </Estado>
            <Estado nombre="Con ayuda">
              <Field
                etiqueta="¿Cómo se llama tu PC?"
                placeholder="Por ejemplo: La de casa"
                ayuda="Es solo para que la reconozcas después."
              />
            </Estado>
            <Estado nombre="Con error">
              <Field
                etiqueta="Tu correo"
                type="email"
                defaultValue="nombre@"
                error="Le falta el final, por ejemplo @gmail.com"
              />
            </Estado>
            <Estado nombre="Varias líneas">
              <Field
                multilinea
                etiqueta="Contanos qué componentes tiene tu PC"
                placeholder="Pegá acá la lista que copiaste"
                ayuda="Después de leerla, te pedimos que la revises antes de guardar."
              />
            </Estado>
          </div>
        </Seccion>

        <Seccion
          id="mi-pc"
          titulo="Mi PC"
          bajada="Los nueve componentes, siempre en el mismo orden. Lo que falta se puede agregar y lo que está en duda dice qué dato falta."
        >
          <PcSlots
            hrefAgregar={() => "#mi-pc"}
            piezas={{
              cpu: { nombre: "Ryzen 5 5600" },
              motherboard: { nombre: "Placa B450M" },
              ram: { nombre: "16 GB", enDuda: true, falta: "la velocidad" },
              gpu: { nombre: "GTX 1650 · 4 GB" },
              psu: { nombre: "Fuente de 450 W" },
              storage: { nombre: "SSD de 480 GB" },
            }}
          />
        </Seccion>

        <Seccion
          id="objetivo"
          titulo="Objetivo de uso"
          bajada="Entre tres y cinco opciones con palabras de todos los días. Puede ser una sola elección o varias."
        >
          <div className="grid gap-space-6">
            <Estado nombre="Una sola opción">
              <ObjetivoUnico />
            </Estado>
            <Estado nombre="Varias opciones">
              <ObjetivoVarios />
            </Estado>
          </div>
        </Seccion>

        <Seccion
          id="presupuesto"
          titulo="Presupuesto"
          bajada="Se mueve con la barra, con los atajos o escribiendo el monto. Si el monto no sirve, decimos qué rango vale."
        >
          <Presupuesto />
        </Seccion>

        <Seccion
          id="mejoras"
          titulo="Mejora recomendada"
          bajada="Una sola acción por tarjeta. «Ver otras opciones» aparece solo cuando hay otras opciones para mostrar."
        >
          <div className="grid gap-space-6">
            <Estado nombre="Te sobra presupuesto">
              <Mejora {...MEJORA_BASE} diferencia={{ monto: "10100", moneda: "ARS" }} conOpciones />
            </Estado>
            <Estado nombre="Te falta presupuesto">
              <Mejora
                {...MEJORA_BASE}
                titulo="Sumá más memoria"
                actual="16 GB · 2666 MHz"
                nueva="32 GB · 3200 MHz"
                motivos={["Podés tener muchas cosas abiertas sin que se trabe."]}
                precio={PRECIO_B}
                diferencia={{ monto: "-40000", moneda: "ARS" }}
                conOpciones
              />
            </Estado>
            <Estado nombre="Sin otras opciones">
              <Mejora
                {...MEJORA_BASE}
                titulo="Cambiá el disco"
                actual="HDD de 1 TB"
                nueva="SSD de 1 TB"
                motivos={["Tu PC prende y abre programas mucho más rápido."]}
                precio={PRECIO_C}
                diferencia={{ monto: "0", moneda: "ARS" }}
              />
            </Estado>
          </div>
        </Seccion>

        <Seccion
          id="plan"
          titulo="Plan por etapas"
          bajada="Cada etapa dice si ya está hecha, si es la de ahora o si falta. Sin dato, no inventamos precio ni respuesta."
        >
          <div className={GRILLA}>
            <Estado nombre="Con todos los precios">
              <PlanSteps
                total={TOTAL_DEL_PLAN}
                etapas={[
                  { nombre: "Más memoria", costo: PRECIO_B, estado: "hecha", veredicto: "compatible" },
                  { nombre: "Placa de video nueva", costo: PRECIO_A, estado: "actual", veredicto: "compatible" },
                  { nombre: "Fuente más potente", costo: PRECIO_C, estado: "pendiente", veredicto: "compatible" },
                ]}
              />
            </Estado>
            <Estado nombre="Con una etapa sin precio">
              <PlanSteps
                etapas={[
                  { nombre: "Más memoria", costo: PRECIO_B, estado: "hecha", veredicto: "compatible" },
                  { nombre: "Placa de video nueva", costo: PRECIO_A, estado: "actual", veredicto: "compatible" },
                  { nombre: "Fuente más potente", costo: PRECIO_C, estado: "pendiente" },
                  { nombre: "Disco más grande", estado: "pendiente" },
                ]}
              />
            </Estado>
          </div>
        </Seccion>

        <Seccion
          id="charla"
          titulo="Charla con el asistente"
          bajada="El asistente explica lo que dice el comparador de componentes; el veredicto no lo decide él."
        >
          <div className="grid max-w-[560px] gap-space-3">
            <ChatBubble autor="persona">¿Le puedo poner una RTX 4060 a mi PC?</ChatBubble>
            <ChatBubble autor="asistente" veredicto="compatible">
              Sí. Revisé tu fuente, tu placa madre y el espacio del gabinete, y entra sin cambiar nada más.
            </ChatBubble>
            <ChatSuggestions sugerencias={["¿Cuánto me sale?", "¿Qué otra opción hay?", "Sumalo a mi plan"]} />
            <ChatComposer />
          </div>
        </Seccion>
      </div>
    </div>
  );
}
