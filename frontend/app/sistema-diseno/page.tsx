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
  PriceTag,
  Verdict,
} from "../../components/uj";

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
            Así se ve cada pieza de la interfaz en todos sus estados. Los nombres, precios y tiendas son de
            ejemplo.
          </p>
        </header>

        <Seccion
          id="veredictos"
          titulo="Veredictos"
          bajada="Dicen si una pieza encaja. Si no hay respuesta clara, nunca muestran «Encaja»."
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
          titulo="Piezas"
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
            <PartCard categoria="Gabinete" beneficio="Para guardar y ventilar tus piezas" modelo="Gabinete mediano con ventana" />
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
                <Button peso="principal" disabled motivo="Elegí una pieza para seguir">
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
                etiqueta="Contanos qué piezas tiene tu PC"
                placeholder="Pegá acá la lista que copiaste"
                ayuda="Después de leerla, te pedimos que la revises antes de guardar."
              />
            </Estado>
          </div>
        </Seccion>

        <Seccion
          id="charla"
          titulo="Charla con el asistente"
          bajada="El asistente explica lo que dice el comparador de piezas; el veredicto no lo decide él."
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
