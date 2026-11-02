import { connection } from "next/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { towerShareProxy } from "../../../lib/tower-share-proxy";
import { parsePublicTowerShare, shareTokenPath } from "../../../lib/tower-share-dto";
import PublicTowerShareView from "../../../components/public-tower-share-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Plan público de torre", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { token } = await params;
  if (!shareTokenPath.test(token) || Object.keys(await searchParams).length) notFound();
  const incoming = await headers(), forwarded = new Headers();
  const socket = incoming.get("X-UJ-Socket-IP"); if (socket) forwarded.set("X-UJ-Socket-IP", socket);
  // Same public BFF transport policy and signed socket source. No session data.
  const response = await towerShareProxy(new Request(`http://127.0.0.1:3000/api/shared-tower-plans/${token}`, { headers: forwarded }));
  if (response.status === 404) notFound();
  if (!response.ok) return <section aria-label="Plan público no disponible"><h1>Plan público no disponible</h1><p>{response.status === 429 ? "Límite de consultas alcanzado. No se reintenta automáticamente." : "No se pudo consultar la copia. No se confirma disponibilidad ni compatibilidad."}</p>{response.headers.get("Retry-After") && <p>Esperá {response.headers.get("Retry-After")} segundos antes de decidir consultar de nuevo.</p>}</section>;
  return <PublicTowerShareView data={parsePublicTowerShare(await response.json())} />;
}
