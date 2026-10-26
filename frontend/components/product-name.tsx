import { productName } from "../lib/presentation";
export default function ProductName({ name }: { name: string }) {
  const parts = productName(name);
  return <><span>{parts.title}</span>{parts.sku && <small className="product-sku">Variante {parts.sku}</small>}</>;
}
