"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { BudgetSlider, Button } from "./uj";
import { formatearMonto } from "./uj/monto";
import { convieneHref, homeBudget, homeGoals, type GoalKey } from "../lib/home-goals";

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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (goal) router.push(convieneHref(goal, budget));
  }

  return <form onSubmit={submit} aria-label="Empezar" className="grid gap-space-6 rounded-lg bg-papel-alto p-space-5 shadow-sombra-2 min-[641px]:p-space-6">
    <div className="grid gap-space-4">
      <span className={PASO}>Paso 1 de 2</span>
      <h2 id="inicio-objetivo" className="m-0 font-display text-titular-m">¿Qué querés que tu PC haga mejor?</h2>
      <div role="group" aria-labelledby="inicio-objetivo" className="flex flex-wrap gap-space-3">
        {homeGoals.map(item => {
          const marcado = goal === item.key;
          return <button key={item.key} type="button" aria-pressed={marcado} onClick={() => setGoal(item.key)} className={OBJETIVO}>
            <span aria-hidden="true" className={`grid size-[22px] flex-none place-items-center rounded-pill border-[1.5px] border-solid ${marcado ? "border-pino bg-pino text-sobre-pino" : "border-linea-fuerte text-transparent"}`}><Check className="size-[14px]" strokeWidth={3} /></span>
            {item.text}
          </button>;
        })}
      </div>
    </div>

    <div className="grid gap-space-4">
      <span className={PASO}>Paso 2 de 2</span>
      <BudgetSlider enTarjeta min={homeBudget.min} max={homeBudget.max} paso={homeBudget.step} moneda={homeBudget.currency} valor={budget} atajos={[...homeBudget.presets]} onCambio={setBudget} />
    </div>

    <div className="grid gap-space-2">
      <div className="grid [&>button]:min-h-14 [&>button]:w-full [&>button]:text-[17px]">
        <Button peso="principal" type="submit" disabled={!goal}>{goal ? `Ver qué me conviene con ${formatearMonto(budget)}` : "Elegí qué querés mejorar"}</Button>
      </div>
      <span className="text-center text-chico text-tinta-suave">Mirar sugerencias no cambia nada de tu PC guardada.</span>
    </div>
  </form>;
}
