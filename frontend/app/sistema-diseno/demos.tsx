"use client";

import { useState } from "react";
import { BudgetSlider, GoalPicker, Notice, UpgradeCard } from "../../components/uj";
import type { UpgradeCardProps } from "../../components/uj";

const OBJETIVOS = [
  { valor: "jugar", texto: "Jugar mejor" },
  { valor: "trabajar", texto: "Trabajar más rápido" },
  { valor: "editar", texto: "Editar fotos y video" },
  { valor: "navegar", texto: "Estudiar y navegar" },
];

const ATAJOS = [
  { valor: "250000", texto: "$ 250 mil" },
  { valor: "500000", texto: "$ 500 mil" },
  { valor: "1000000", texto: "$ 1 millón" },
];

export function ObjetivoUnico() {
  const [valor, setValor] = useState<string | null>("jugar");
  return <GoalPicker pregunta="¿Qué querés que tu PC haga mejor?" opciones={OBJETIVOS} valor={valor} onCambio={setValor} />;
}

export function ObjetivoVarios() {
  const [valor, setValor] = useState<string[]>(["jugar", "editar"]);
  return (
    <GoalPicker
      multiple
      pregunta="Elegí todo lo que hacés con tu PC"
      opciones={OBJETIVOS}
      valor={valor}
      onCambio={setValor}
    />
  );
}

export function Presupuesto() {
  const [valor, setValor] = useState("400000");
  return (
    <BudgetSlider min="100000" max="1500000" paso="50000" moneda="ARS" valor={valor} atajos={ATAJOS} onCambio={setValor} />
  );
}

type DatosDeMejora = Pick<UpgradeCardProps, "titulo" | "actual" | "nueva" | "motivos" | "precio" | "diferencia" | "veredicto">;

/** `conOpciones` muestra el botón «Ver otras opciones»; sin él, la tarjeta no lo muestra. */
export function Mejora({ conOpciones, ...datos }: DatosDeMejora & { conOpciones?: boolean }) {
  const [aviso, setAviso] = useState<"sumada" | "opciones" | null>(null);
  return (
    <div className="grid w-full min-w-0 max-w-[620px] gap-space-3">
      <UpgradeCard
        {...datos}
        onSumar={() => setAviso("sumada")}
        onVerOpciones={conOpciones ? () => setAviso("opciones") : undefined}
      />
      {aviso === "sumada" && (
        <Notice tono="encaja" titulo="Lo sumaste a tu plan">
          «{datos.titulo}» ya está en tu plan. Podés revisarlo cuando quieras.
        </Notice>
      )}
      {aviso === "opciones" && (
        <Notice tono="info" titulo="Acá te mostraríamos otras opciones">
          En la app real, este botón lleva a la lista de alternativas.
        </Notice>
      )}
    </div>
  );
}
