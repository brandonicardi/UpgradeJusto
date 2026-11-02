import Link from "next/link";
import { catalogFetch, type CatalogPage } from "../../../../lib/catalog";
import LegacyImportPC from "../../import/legacy-proposal";
export const dynamic = "force-dynamic";
export default async function LegacyImport() {
  let catalog: CatalogPage | null = null;
  try { catalog = await catalogFetch<CatalogPage>("?page=1&page_size=50"); } catch { /* Explicit unavailable catalog. */ }
  return <><p>Extracción histórica de seis categorías, no torre completa. <Link href="/pcs/import">Usar extracción de torre</Link></p><LegacyImportPC catalog={catalog} /></>;
}
