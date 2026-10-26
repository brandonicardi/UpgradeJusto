import { catalogFetch, type CatalogPage } from "../../lib/catalog";
import Plans from "./plans";
export const dynamic = "force-dynamic";
export default async function Page() {
  let catalog: CatalogPage | null = null;
  try { catalog = await catalogFetch<CatalogPage>("?page_size=50"); } catch { /* Visible unavailable state, no fallback. */ }
  return <Plans catalog={catalog} />;
}
