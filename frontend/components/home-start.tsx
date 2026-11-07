"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { BudgetSlider, Button } from "./uj";
import { formatearMonto } from "./uj/monto";
import { buildHref, convieneHref, homeBudget, homeGoals, type GoalKey, type HomePath } from "../lib/home-goals";

const CAMINOS: ReadonlyArray<{ key: HomePath; titulo: string; texto: string }> = [
  { key: "mejorar", titulo: "Mejorar la PC que tengo", texto: "Te decimos qué cambiar, cuánto cuesta y si encaja." },
  { key: "armar", titulo: "Armar mi primera PC", texto: "Te ayudamos a elegir piezas que encajan entre sí." },
];

const OBJETIVO =
  "inline-flex min-h-11 cursor-pointer items-center gap-space-2 rounded-pill border-[1.5px] border-solid border-linea-fuerte bg-papel-alto " +
  "py-space-2 pr-space-5 pl-space-4 text-left font-sans-uj text-[15px] font-semibold leading-6 text-tinta " +
  "aria-pressed:border-pino aria-pressed:bg-pino-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
const PASO = "text-etiqueta text-tinta-suave";

/** Tarjeta «Empezar» del inicio: qué querés mejorar y cuánto querés gastar. Solo arma el pedido; no decide nada. */
export default function HomeStart() {
  const router = useRouter();
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [budget, setBudget] = useState<string>(homeBudget.initial);
  const [camino, setCamino] = useState<HomePath>("mejorar");
  const armar = camino === "armar";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal) return;
    router.push(armar ? buildHref(goal, budget) : convieneHref(goal, budget));
  }

  return <form onSubmit={submit} aria-label="Empezar" className="grid gap-space-6 rounded-lg bg-papel-alto p-space-5 shadow-sombra-2 min-[641px]:p-space-6">
    <div className="grid gap-space-3">
      <h2 id="inicio-camino" className="m-0 font-display text-titular-m">¿Qué querés hacer?</h2>
      <div role="group" aria-labelledby="inicio-camino" className="grid gap-space-3 min-[641px]:grid-cols-2">
        {CAMINOS.map(item => {
          const marcado = camino === item.key;
          return <button key={item.key} type="button" aria-pressed={marcado} onClick={() => setCamino(item.key)} className={`${OBJETIVO} !rounded-md !py-space-3 text-left`}>
            <span aria-hidden="true" className={`grid size-[22px] flex-none place-items-center rounded-pill border-[1.5px] border-solid ${marcado ? "border-pino bg-pino text-sobre-pino" : "border-linea-fuerte text-transparent"}`}><Check className="size-[14px]" strokeWidth={3} /></span>
            <span className="grid gap-space-1"><b className="font-semibold">{item.titulo}</b><span className="text-chico font-normal text-tinta-suave">{item.texto}</span></span>
          </button>;
        })}
      </div>
    </div>

    <div className="grid gap-space-4">
      <span className={PASO}>Paso 1 de 2</span>
      <h2 id="inicio-objetivo" className="m-0 font-display text-titular-m">{armar ? "¿Para qué la vas a usar?" : "¿Qué querés que tu PC haga mejor?"}</h2>
      <div role="group" aria-labelledby="inicio-objetivo" className="flex flex-wrap gap-space-3">
        {homeGoals.map(item => {
          const marcado = goal === item.key;
          return <button key={item.key} type="button" aria-pressed={marcado} onClick={() => setGoal(item.key)} className={OBJETIVO}>
            <span aria-hidden="true" className={`grid size-[22px] flex-none place-items-center rounded-pill border-[1.5px] border-solid ${marcado ? "border-pino bg-pino text-sobre-pino" : "border-linea-fuerte text-transparent"}`}><Check className="size-[14px]" strokeWidth={3} /></span>
            {armar ? item.textoArmar : item.text}
          </button>;
        })}
      </div>
    </div>

    <div className="grid gap-space-4">
      <span className={PASO}>Paso 2 de 2</span>
      <BudgetSlider enTarjeta min={homeBudget.min} max={homeBudget.max} minimoAdmitido={homeBudget.admitido.min} maximoAdmitido={homeBudget.admitido.max} paso={homeBudget.step} moneda={homeBudget.currency} valor={budget} atajos={[...homeBudget.presets]} onCambio={setBudget} />
    </div>

    <div className="grid gap-space-2">
      <div className="grid [&>button]:min-h-14 [&>button]:w-full [&>button]:text-[17px]">
        <Button peso="principal" type="submit" disabled={!goal}>{goal ? `${armar ? "Armar mi PC" : "Ver qué me conviene"} con ${formatearMonto(budget)}` : armar ? "Elegí para qué la vas a usar" : "Elegí qué querés mejorar"}</Button>
      </div>
      <span className="text-center text-chico text-tinta-suave">{armar ? "Te proponemos una PC completa y podés cambiar cualquier pieza." : "Mirar sugerencias no cambia nada de tu PC guardada."}</span>
    </div>
  </form>;
}
