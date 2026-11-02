import Link from "next/link";
import { catalogFetch, type CatalogPage } from "../../../lib/catalog";
import LegacyPCs from "../legacy-pcs";
export const dynamic = "force-dynamic";
export default async function LegacyPage() {
  let catalog: CatalogPage | null = null;
  try { catalog = await catalogFetch<CatalogPage>("?page=1&page_size=50"); } catch { /* Explicit unavailable state. */ }
  return <><p>Flujo histórico de seis categorías. No evalúa una torre completa. Las torres schema2 no se proyectan a este formato. <Link href="/pcs">Volver al editor de torre</Link></p><LegacyPCs catalog={catalog} /></>;
}
