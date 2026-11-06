import type { Metadata } from "next";
import Conviene from "./conviene";
import { parseConvieneQuery } from "../../lib/home-goals";
import "./conviene.css";

export const metadata: Metadata = { title: "Lo que te conviene — UpgradeJusto", description: "El cambio que más te conviene para tu PC, con precio, fecha y tienda, y si encaja." };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (name: string) => { const value = params[name]; return typeof value === "string" ? value : null; };
  const query = parseConvieneQuery({ get: one });
  return <Conviene goalKey={query?.goal.key ?? null} budget={query?.budget ?? null} pcId={one("pc")} />;
}
