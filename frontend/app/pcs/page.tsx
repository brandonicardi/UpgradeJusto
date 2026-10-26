import { catalogFetch, type CatalogPage } from "../../lib/catalog";
import PCs from "./pcs";

export const dynamic = "force-dynamic";
export default async function Page() {
  let catalog: CatalogPage | null = null;
  try { catalog = await catalogFetch<CatalogPage>("?page=1&page_size=50"); }
  catch { /* Explicit unavailable catalog; never substitute fixtures. */ }
  return <PCs catalog={catalog} />;
}
