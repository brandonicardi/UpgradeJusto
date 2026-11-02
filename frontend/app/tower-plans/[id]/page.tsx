import TowerPlans from "../workspace";
import Link from "next/link";
import { shareUUID } from "../../../lib/tower-share-dto";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><TowerPlans initialId={id} />{shareUUID.test(id) && <Link href={`/tower-plans/${id}/shares`} prefetch={false}>Gestionar enlaces públicos de esta torre</Link>}</>; }
