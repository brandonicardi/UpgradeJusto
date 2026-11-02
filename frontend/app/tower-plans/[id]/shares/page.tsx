import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import TowerShareManager from "../../../../components/tower-share-manager";
import { shareUUID } from "../../../../lib/tower-share-dto";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compartir mi plan de torre", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { await connection(); const { id } = await params; if (!shareUUID.test(id)) notFound(); return <TowerShareManager key={id} planId={id} />; }
