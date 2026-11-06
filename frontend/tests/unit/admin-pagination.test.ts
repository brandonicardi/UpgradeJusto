// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import Administration from "../../app/admin/page";
import { mount, unmountAll, click, button } from "./support/dom";

const pieza = (n: number) => ({ component_id: `cg-case-${n}`, category: "case", name: `Gabinete ${n}`, missing: ["gpu_limit_mm"], affected_pcs: n });
const tablero = (offset: number) => ({
  dataset_version: "retail-" + "a".repeat(64),
  metrics: { components: 412, missing_data: 23, without_recent_price: 0, stores: 6 },
  missing_data: { items: Array.from({ length: Math.min(10, 23 - offset) }, (_, i) => pieza(offset + i + 1)), total: 23, limit: 10, offset },
  old_prices: { items: [], total: 0, limit: 10, offset },
});

afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

it("pide los datos faltantes de a 10 y pasa de página con el servidor", async () => {
  const pedidos: string[] = [];
  const fetcher = vi.fn(async (path: string) => {
    if (path.includes("csrf")) return Response.json({ csrf_token: "synthetic" });
    if (path.startsWith("/api/admin/dashboard")) {
      pedidos.push(path);
      const offset = Number(new URL(path, "http://x").searchParams.get("offset"));
      return Response.json(tablero(offset));
    }
    if (path.startsWith("/api/admin/revisions")) return Response.json({ items: [], total: 0, offset: 0, limit: 100 });
    throw new Error("unexpected");
  });
  vi.stubGlobal("fetch", fetcher);
  const host = await mount(createElement(Administration));
  expect(host.querySelectorAll(".admin-table tbody tr")).toHaveLength(10);
  expect(host.textContent).toContain("Mostrando 1–10 de 23");
  expect(button(host, "Anteriores")?.disabled).toBe(true);
  // La fila elegida se marca con lima y queda lista para abrirla en el editor.
  await click(button(host, "Completar"));
  const elegida = host.querySelector<HTMLTableRowElement>('tr[aria-selected="true"]');
  expect(elegida?.classList.contains("is-selected")).toBe(true);
  expect(elegida?.textContent).toContain("Gabinete 1");
  expect(host.textContent).toContain("Administrar el catálogo");
  await click(button(host, "Siguientes"));
  expect(pedidos.some(path => path.includes("limit=10&offset=10"))).toBe(true);
  expect(host.textContent).toContain("Mostrando 11–20 de 23");
  expect(host.textContent).toContain("Gabinete 11");
  expect(host.textContent).not.toContain("Gabinete 1 ");
});
