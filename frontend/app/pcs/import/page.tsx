import { catalogFetch, type CatalogPage } from "../../../lib/catalog";
import ImportPC from "./proposal";
export const dynamic = "force-dynamic";
export default async function Page() {
  let catalog: CatalogPage | null = null;
  try { catalog = await catalogFetch<CatalogPage>("?page=1&page_size=50"); } catch { /* Explicit unavailable, no fixtures. */ }
  return <ImportPC catalog={catalog} />;
}
