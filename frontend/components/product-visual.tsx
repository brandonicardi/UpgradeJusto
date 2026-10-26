import { categories, type Category } from "../lib/catalog";
import { categoryIllustrations, productVisualManifest } from "../lib/product-visuals";

export default function ProductVisual({ category, componentId }: { category: Category; componentId?: string }) {
  return <div className="product-visual" data-model-key={componentId ? productVisualManifest[componentId]?.modelKey ?? componentId : category} title="Ilustración de categoría; no es una foto del producto">
    {/* eslint-disable-next-line @next/next/no-img-element -- Authored local SVG, closed category manifest; no remote images. */}
    <img src={categoryIllustrations[category]} width={40} height={40} alt={`Ilustración de categoría: ${categories[category]}`} />
  </div>;
}
