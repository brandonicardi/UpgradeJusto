import type { Metadata } from "next";
import MiPlan from "../mi-plan";
export const metadata: Metadata = { title: "Mi plan — UpgradeJusto" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <MiPlan initialId={id} />; }
