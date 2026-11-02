import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TowerProductSummary, { TowerProductPhoto } from "../../components/tower-product-summary";
import { displayImage, displayRetailDate, formatRetailARS, offerDisplayStatus, retailSourceURL, stockLabel, vendorImageURL } from "../../lib/retail-presentation";
import type { RetailOffer, TowerComponent } from "../../lib/tower-catalog";

// Synthetic metadata for pure tests only; never published/catalog fixtures.
const photoURL = "https://imagenes.compragamer.com/productos/test-only.jpg";
const now = Date.parse("2026-10-26T12:00:00Z");
function part(): TowerComponent {
  return { id: "synthetic", name: "Pieza sintética", category: "storage", attributes: {}, prices: [], sources: [], image: photoURL,
    image_evidence: { url: photoURL, alt: "Foto sintética de prueba", source_url: "https://compragamer.com/", retrieved_at: "2026-10-26T10:00:00Z", rights_note: null, exact_variant: true, status: "verified", photo_bytes_verified: false } };
}
function offer(): RetailOffer {
  return { offer_id: "test-only", store: "compragamer", product_id: "test-only", component_id: "synthetic", variant_key: "test-only", amount: "123456.78", currency: "ARS", condition: "cash", availability: "unknown", stock_quantity: null, source_url: "https://compragamer.com/", observed_at: "2026-10-26T10:00:00Z", expires_at: "2026-10-27T10:00:00Z", status: "fresh" };
}
describe("presentación retail central38B, sin cotización cliente", () => {
  it("presents dates in Argentina time while preserving a date-only calendar day", () => {
    expect(displayRetailDate("2026-10-26T13:53:41.862Z")).toContain("26 oct 2026");
    expect(displayRetailDate("2026-10-26T13:53:41.862Z")).toContain("10:53");
    expect(displayRetailDate("2026-10-26")).toBe("26 oct 2026");
    expect(displayRetailDate("invalid")).toBe("Fecha no disponible");
  });
  it("admite Venex apex/www exactos para fuente y foto sin permitir impostores, userinfo, puertos ni SVG", () => {
    for (const host of ["venex.com.ar", "www.venex.com.ar"]) {
      const source = `https://${host}/test-only`, image = `https://${host}/products_images/test-only.webp`;
      expect(retailSourceURL(source)).toBe(source); expect(vendorImageURL(image)).toBe(image);
      const item = part(); item.image = image;
      item.image_evidence = { ...item.image_evidence!, url: image, source_url: source };
      item.offers = [{ ...offer(), store: "venex", source_url: source }];
      expect(displayImage(item)).toBe(image);
      const html = renderToStaticMarkup(<TowerProductSummary part={item} now={now} />);
      expect(html).toContain(`src="${image}"`); expect(html).toContain(`href="${source}"`);
      for (const invalid of [`https://${host}.evil.test/products_images/a.jpg`, `https://shop.${host}/products_images/a.jpg`, `https://user:pass@${host}/products_images/a.jpg`, `https://${host}:8443/products_images/a.jpg`]) {
        expect(vendorImageURL(invalid)).toBeNull(); expect(retailSourceURL(invalid)).toBeNull();
      }
      for (const invalid of [`https://${host}/products_images/a.svg`, `https://${host}/products_images/a%2Esvg`, `http://${host}/products_images/a.jpg`, `https://${host}/other/a.jpg`]) expect(vendorImageURL(invalid)).toBeNull();
    }
  });
  it("admite sólo rutas raster HTTPS cerradas de proveedores", () => {
    expect(vendorImageURL(photoURL)).toBe(photoURL);
    expect(vendorImageURL("https://venex.com.ar/products_images/test-only.webp")).not.toBeNull();
    for (const url of ["data:image/png;base64,test", "http://imagenes.compragamer.com/productos/a.jpg", "https://imagenes.compragamer.com/productos/a.svg", "https://imagenes.compragamer.com/productos/a%2Esvg", "https://imagenes.compragamer.com.evil.test/productos/a.jpg", "https://user:pass@imagenes.compragamer.com/productos/a.jpg", "https://127.0.0.1/productos/a.jpg", "https://venex.com.ar/other/a.jpg", "https://imagenes.compragamer.com:8443/productos/a.jpg"]) expect(vendorImageURL(url)).toBeNull();
    expect(retailSourceURL("javascript:alert(1)")).toBeNull(); expect(retailSourceURL("https://evil.test/")).toBeNull();
  });
  it("no exige bytes verificados para URL asociada; sí evidencia, variante y estado", () => {
    const item = part(); expect(displayImage(item)).toBe(photoURL);
    expect(displayImage(item, photoURL)).toBeNull();
    expect(displayImage({ ...item, image: null })).toBeNull();
    for (const status of ["unavailable", "quarantined"] as const) expect(displayImage({ ...item, image_evidence: { ...item.image_evidence!, status } })).toBeNull();
    expect(displayImage({ ...item, image_evidence: { ...item.image_evidence!, exact_variant: false } })).toBeNull();
    expect(displayImage({ ...item, image_evidence: undefined })).toBeNull();
  });
  it("fallback compacto y alt honestos; metadatos legacy opcionales", () => {
    const item = part(); delete item.image; delete item.image_evidence;
    const html = renderToStaticMarkup(<TowerProductPhoto part={item} />);
    expect(html).toContain("Sin foto disponible de Pieza sintética"); expect(html).not.toContain("<img");
    const populated = renderToStaticMarkup(<TowerProductSummary part={part()} now={now} />);
    expect(populated).toContain('width="72" height="72"'); expect(populated).toContain("Foto sintética de prueba");
    expect(populated).toContain("Bytes de la foto no verificados"); expect(populated).toContain("Identificación técnica y atributos pendientes");
    expect(populated).not.toContain("fotocomprobada");
  });
  it("preserva decimales exactos y desconocidos sin convertir null en cero", () => {
    expect(formatRetailARS("123456.78")).toBe("ARS 123.456,78");
    expect(formatRetailARS("900719925474099300.19")).toBe("ARS 900.719.925.474.099.300,19");
    expect(formatRetailARS("0.00")).toBe("ARS 0,00");
    for (const value of [null, undefined, "", "1e3", "12.345", "NaN"]) expect(formatRetailARS(value)).toBe("Importe no disponible");
    expect(stockLabel(offer())).toBe("Stock por confirmar");
    expect(stockLabel({ ...offer(), availability: "in_stock" })).toContain("cantidad desconocida");
    expect(displayRetailDate(null)).toBe("Fecha no disponible");
  });
  it("fresh y stale son distintos; vence sin recotizar y no reactiva estados servidor", () => {
    expect(offerDisplayStatus(offer(), now)).toBe("fresh");
    expect(offerDisplayStatus(offer(), Date.parse(offer().expires_at))).toBe("stale");
    expect(offerDisplayStatus({ ...offer(), status: "stale" }, now)).toBe("stale");
    expect(offerDisplayStatus({ ...offer(), expires_at: "invalid" }, now)).toBe("unavailable");
    const item = { ...part(), offers: [{ ...offer(), status: "stale" as const, condition: "list" as const, amount: null }] };
    const html = renderToStaticMarkup(<TowerProductSummary part={item} now={now} />);
    expect(html).toContain("Lista (no cuotas)"); expect(html).toContain("Consulta vencida; no es precio vigente");
    expect(html).toContain("Importe no disponible"); expect(html).toContain("Stock por confirmar"); expect(html).toContain("Observado:");
    expect(html).toContain("Las ofertas no sustituyen los precios históricos ni constituyen un presupuesto completo"); expect(html).toContain("No se calculó compatibilidad");
    expect(item.offers[0].amount).toBeNull(); expect(item.prices).toEqual([]);
  });
});
