// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MiPlan from "../../app/tower-plans/mi-plan";
import { EmptyView, NextPurchase } from "../../app/tower-plans/mi-plan-sections";
import { emptyTower, towerKeys, type Tower } from "../../lib/towers";
import type { TowerPlanRead } from "../../lib/tower-plans";
import { button, byLabel, click, mount, settle, type, unmountAll } from "./support/dom";

const planId = "12345678-1234-4234-8234-123456789abc", pcId = "22222222-2222-4222-8222-222222222222", lineId = "33333333-3333-4333-8333-333333333333";
const keys = ["a".repeat(64), "b".repeat(64), "c".repeat(64)];
const storeUrl = "https://compragamer.com/producto/rtx-4060";

const line = (category: string, model: string, quantity = 1, id: string | null = null) => ({ line_id: id, category, component_id: null, declared_model: model, quantity });
function tower(lines: ReturnType<typeof line>[], revision = 1): Tower {
  const base = emptyTower(), status = { ...base.category_status };
  for (const category of new Set(lines.map(item => item.category))) status[category as keyof typeof status] = "present";
  return { ...base, id: pcId, name: "La de casa", revision, origin_schema: 2, category_status: status, lines: lines as Tower["lines"] };
}
const evaluation = (verdict: string, rules: { rule_id: string; state: string }[] = []) => ({ verdict, rule_results: rules, missing_fields: [], rules_version: "x", coverage: { complete: verdict === "compatible" } });
const offer = (amount: string, url: string | null) => ({ offer_id: "o", store: "compragamer", product_id: "p", component_id: "c", variant_key: "v", amount, currency: "ARS", condition: "cash", availability: "in_stock", observed_at: "2026-10-28T12:00:00Z", expires_at: "2027-01-01T00:00:00Z", source_url: url, status: "fresh" });
function stage(position: number, name: string, category: string, model: string, price: string | null, verdict: string, configuration: Tower, url: string | null = storeUrl) {
  return {
    position, name, budget_ars: "500000.00", materials: [], actions: [{ action: "replace_category", category, line_id: null, candidates: [{ component_id: null, declared_model: model, quantity: 1 }] }],
    evaluated_configuration: configuration, evaluation: evaluation(verdict), benefit: position === 2 ? { status: "supported", before: "100", after: "200", source: [], workload: null, label: "Reference score" } : { status: "unknown", before: null, after: null, source: [], workload: null },
    dependencies: [], offers: price ? [offer(price, url)] : [], cost: { total_ars: price }, cumulative_cost: { total_ars: price }, status: "ready", missing_fields: [], warnings: [],
  };
}
function makePlan(overrides: { spent?: string | null; remaining?: string | null; progress?: Record<string, string>; url?: string | null; pcRevision?: number; total?: string | null } = {}): TowerPlanRead {
  const base = tower([line("ram", "2 x 8 GB", 1), line("gpu", "GTX 1650", 1, lineId)]);
  const ram = tower([line("ram", "2 x 16 GB"), line("gpu", "GTX 1650", 1, lineId)]), gpu = tower([line("ram", "2 x 16 GB"), line("gpu", "RTX 4060")]);
  const snapshot = {
    kind: "tower_plan", schema_version: 2, name: "Mejora", generated_at: "2026-10-28T12:00:00Z", pc_revision: overrides.pcRevision ?? 1, base_configuration: base, objective: "gaming", workload: null, budget_ars: "600000.00", currency: "ARS", price_condition: "cash",
    versions: { catalog: "v1", rules: "r", policy: "p", inventory: "i", scope: "s", references: "f", identity: "d", calculation: "c" },
    stages: [stage(1, "Etapa 1", "ram", "2 x 16 GB", "92500.00", "compatible", ram), stage(2, "Placa de video nueva", "gpu", "RTX 4060", "389900.00", "compatible", gpu, overrides.url === undefined ? storeUrl : overrides.url), stage(3, "Disco más grande", "storage", "SSD de 1 TB", "60000.00", "requiere_verificacion", gpu)],
    cost: { total_ars: overrides.total === undefined ? "542400.00" : overrides.total }, benefit: { status: "unknown", before: null, after: null, source: [], workload: null }, status: "ready", label: "x", missing_fields: [], limitations: [],
  };
  return { kind: "tower_plan", schema_version: 2, id: planId, name: "Mejora", revision: 1, pc_id: pcId, created_at: "2026-10-28T12:00:00Z", updated_at: "2026-10-28T12:00:00Z", snapshot, stage_keys: keys, progress: overrides.progress ?? {}, spent_ars: overrides.spent === undefined ? "0.00" : overrides.spent, remaining_ars: overrides.remaining === undefined ? "542400.00" : overrides.remaining } as unknown as TowerPlanRead;
}

type Call = { url: string; method: string; body: Record<string, unknown> | null };
function stubApi(options: { plan: TowerPlanRead; list?: TowerPlanRead[]; pcRevision?: number; afterMark?: TowerPlanRead; recalculated?: TowerPlanRead; recalcStatus?: number }) {
  const calls: Call[] = [];
  const mock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input), method = init?.method ?? "GET", body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null;
    calls.push({ url, method, body });
    const json = (value: unknown, status = 200) => Response.json(value, { status });
    if (url === "/api/auth/csrf") return json({ csrf_token: "token" });
    if (url.startsWith("/api/tower-plans?")) return json({ kind: "tower_plan", schema_version: 2, items: options.list ?? [options.plan], total: 1, page: 1, page_size: 20 });
    if (url === `/api/tower-plans/${planId}` && method === "GET") return json(options.plan);
    if (url.includes("/progress") && method === "PUT") return json({ kind: "tower_plan_progress", plan_id: planId, revision: 1, progress: { [keys[0]]: "2026-10-30T12:00:00Z" } });
    if (url.includes("/progress") && method === "DELETE") return json({ kind: "tower_plan_progress", plan_id: planId, revision: 1, progress: {} });
    if (url === `/api/tower-plans/${planId}/recalculate`) return options.recalcStatus && options.recalcStatus !== 200 ? json({ detail: "x" }, options.recalcStatus) : json(options.recalculated ?? options.plan);
    if (url === `/api/towers/${pcId}` && method === "GET") return json(tower(options.plan.snapshot.base_configuration.lines as ReturnType<typeof line>[], options.pcRevision ?? 1));
    if (url === `/api/towers/${pcId}` && method === "PUT") return json({ ...tower([]), revision: (options.pcRevision ?? 1) + 1 });
    if (url.startsWith("/api/catalog/components?page=1&page_size=1")) return json({ dataset_version: "v1", items: [], total: 0, page: 1, page_size: 1 });
    return json({ detail: "no existe" }, 404);
  });
  vi.stubGlobal("fetch", mock);
  return { calls, mock };
}

beforeEach(() => { window.localStorage.clear(); });
afterEach(async () => { await unmountAll(); vi.unstubAllGlobals(); });

const text = (host: HTMLElement) => host.textContent ?? "";
const starts = (calls: Call[], method: string, fragment: string) => calls.filter(call => call.method === method && call.url.includes(fragment));

describe("Mi plan: lo que responde la pantalla", () => {
  it("arriba va la próxima compra con el cambio, el precio con fecha y tienda, la ganancia rotulada y la plata del servidor", async () => {
    stubApi({ plan: makePlan({ progress: { [keys[0]]: "2026-10-20T15:00:00Z" }, spent: "92500.00", remaining: "449900.00" }) });
    const host = await mount(<MiPlan />); await settle();
    const next = host.querySelector('section[aria-label="Tu próxima compra"]') as HTMLElement;
    expect(next).not.toBeNull();
    expect(host.querySelector(".mp")?.firstElementChild?.nextElementSibling).toBe(next);
    for (const word of ["2 de 3", "Placa de video nueva", "Hoy tenés", "GTX 1650", "Comprás", "RTX 4060", "Encaja", "$ 389.900", "Contado · visto el 28/10 en Compra Gamer", "Rinde cerca del doble", "Según datos de referencia. No son FPS.", "Ya la compré", "Ver en la tienda", "Elegir otro componente"]) expect(text(next)).toContain(word);
    expect(next.querySelector(`a[href="${storeUrl}"]`)?.textContent).toBe("Ver en la tienda");
    const money = host.querySelector('section[aria-label="Plata del plan"]') as HTMLElement;
    for (const word of ["Todo el plan", "$ 542.400", "Ya gastaste", "$ 92.500", "Te falta", "$ 449.900", "1 de 3 compras", "Actualizar precios"]) expect(text(money)).toContain(word);
    expect(text(host)).toContain("Todas tus compras");
    expect(text(host)).toContain("Compra 1"); expect(text(host)).not.toMatch(/Etapa|etapa|pieza|Dar de baja|Cálculo guardado|snapshot/);
    expect(text(host)).toContain("Borrar este plan");
  });

  it("sin enlace de tienda no hay botón «Ver en la tienda»; sin dato de ganancia no se dice nada", async () => {
    stubApi({ plan: makePlan({ url: null, progress: { [keys[0]]: "2026-10-20T15:00:00Z" }, spent: "92500.00", remaining: "449900.00" }) });
    const host = await mount(<MiPlan />); await settle();
    const next = host.querySelector('section[aria-label="Tu próxima compra"]') as HTMLElement;
    expect(text(next)).not.toContain("Ver en la tienda"); expect(next.querySelector("a")).toBeNull();
    const plain = renderToStaticMarkup(<NextPurchase plan={(() => { const p = makePlan(); return p; })()} index={0} names={{ status: "active", entries: new Map() }} busy={false} canChange onBuy={() => {}} onOther={() => {}} />);
    expect(plain).not.toContain("Según datos de referencia");
  });

  it("si falta un precio, lo gastado y lo que falta dicen «Falta un precio» y no cero", async () => {
    stubApi({ plan: makePlan({ progress: { [keys[0]]: "2026-10-20T15:00:00Z" }, spent: null, remaining: null, total: null }) });
    const host = await mount(<MiPlan />); await settle();
    const money = text(host.querySelector('section[aria-label="Plata del plan"]') as HTMLElement);
    expect(money).toContain("Sin total"); expect(money.match(/Falta un precio/g)).toHaveLength(2); expect(money).not.toContain("$ 0");
  });

  it("«Falta un dato» explica qué falta y lleva a completarlo", async () => {
    stubApi({ plan: makePlan() });
    const host = await mount(<MiPlan />); await settle();
    const item = [...host.querySelectorAll("li")].find(li => li.textContent?.includes("Disco más grande")) as HTMLElement;
    expect(item.textContent).toContain("Falta un dato"); expect(item.textContent).toContain("Todavía no pudimos comprobar si encaja con tu PC");
    expect(item.querySelector('a[href="/pcs"]')?.textContent).toBe("Completar el dato");
  });

  it("sin planes muestra cómo funciona y el camino a «Ver qué me conviene»", async () => {
    stubApi({ plan: makePlan(), list: [] });
    const vacio = await mount(<MiPlan />); await settle();
    expect(text(vacio)).toContain("Todavía no tenés un plan"); expect(vacio.querySelector('a[href="/"]')?.textContent).toBe("Ver qué me conviene");
    const html = renderToStaticMarkup(<EmptyView />);
    for (const word of ["Todavía no tenés un plan", "Contanos qué querés", "Elegí lo que te conviene", "Comprá a tu ritmo"]) expect(html).toContain(word);
    expect(html).toContain('href="/"');
  });

  it("«¿Cuánto podés apartar?» estima los meses y recuerda el monto solo en el navegador", async () => {
    const { calls } = stubApi({ plan: makePlan({ progress: { [keys[0]]: "2026-10-20T15:00:00Z" }, spent: "92500.00", remaining: "449900.00" }) });
    const host = await mount(<MiPlan />); await settle();
    expect(text(host)).toContain("Escribí cuánto podés apartar por mes.");
    await type(byLabel(host, "Por mes"), "$ 100.000");
    expect(text(host)).toContain("Terminás en unos 5 meses."); expect(text(host)).toContain("Es una estimación");
    expect(window.localStorage.getItem("uj:mi-plan:aporte-mensual")).toBe("$ 100.000");
    expect(calls.every(call => call.method === "GET" || call.url.includes("csrf"))).toBe(true);
  });
});

describe("Mi plan: comprar y actualizar Mi PC", () => {
  it("marcar una compra no toca Mi PC; sin confirmar, ‘Ahora no’ deja todo igual", async () => {
    const { calls } = stubApi({ plan: makePlan() });
    const host = await mount(<MiPlan />); await settle();
    await click(button(host, "Ya la compré: Compra 1"));
    const put = starts(calls, "PUT", "/progress");
    expect(put).toHaveLength(1); expect(put[0].body).toBeNull(); expect(put[0].url).toBe(`/api/tower-plans/${planId}/stages/${keys[0]}/progress`);
    expect(text(host)).toContain("¿Actualizamos Mi PC?"); expect(button(host, "Sí, actualizar Mi PC")).not.toBeNull();
    await click(button(host, "Ahora no"));
    expect(starts(calls, "PUT", "/api/towers")).toHaveLength(0);
    expect(text(host)).not.toContain("¿Actualizamos Mi PC?"); expect(text(host)).toContain("Todas tus compras");
  });

  it("al confirmar, guarda la PC con la revisión leída y sin user_id; el plan sigue legible", async () => {
    const { calls } = stubApi({ plan: makePlan() });
    const host = await mount(<MiPlan />); await settle();
    await click(button(host, "Ya la compré: Compra 1"));
    await click(button(host, "Sí, actualizar Mi PC"));
    const puts = starts(calls, "PUT", `/api/towers/${pcId}`);
    expect(puts).toHaveLength(1);
    const body = puts[0].body!;
    expect(body.revision).toBe(1); expect(body).not.toHaveProperty("user_id"); expect(body).not.toHaveProperty("owner_id");
    expect(Object.keys(body.category_status as object)).toEqual(expect.arrayContaining([...towerKeys]));
    expect((body.lines as { declared_model: string }[]).map(item => item.declared_model)).toContain("2 x 16 GB");
    expect(text(host)).toContain("Listo, actualizamos Mi PC"); expect(text(host)).toContain("Todas tus compras");
  });

  it("si la PC cambió desde que se armó el plan, no se ofrece pisarla", async () => {
    const { calls } = stubApi({ plan: makePlan(), pcRevision: 2 });
    const host = await mount(<MiPlan />); await settle();
    await click(button(host, "Ya la compré: Compra 1"));
    expect(text(host)).toContain("Tu PC cambió desde que armaste el plan"); expect(button(host, "Sí, actualizar Mi PC")).toBeNull();
    expect(starts(calls, "PUT", "/api/towers")).toHaveLength(0);
  });

  it("si falla la actualización, Mi PC sigue igual y se dice", async () => {
    const { mock } = stubApi({ plan: makePlan() });
    const host = await mount(<MiPlan />); await settle();
    await click(button(host, "Ya la compré: Compra 1"));
    const original = mock.getMockImplementation()!;
    mock.mockImplementation(async (input, init) => String(input) === `/api/towers/${pcId}` && init?.method === "PUT" ? Response.json({ detail: "x" }, { status: 500 }) : original(input, init));
    await click(button(host, "Sí, actualizar Mi PC"));
    expect(text(host)).toContain("No pudimos actualizar Mi PC"); expect(text(host)).toContain("Tu PC sigue igual");
  });

  it("el plan terminado ofrece actualizar Mi PC con los cambios y lo gastado en total", async () => {
    const done = Object.fromEntries(keys.map(key => [key, "2026-10-30T12:00:00Z"]));
    const { calls } = stubApi({ plan: makePlan({ progress: done, spent: "542400.00", remaining: "0.00" }) });
    const host = await mount(<MiPlan />); await settle(); await settle();
    for (const word of ["¡Listo, terminaste tu plan!", "Compraste todo lo que tenías planeado.", "¿Actualizamos Mi PC?", "Gastaste en total", "$ 542.400", "Sí, actualizar Mi PC", "Ahora no", "Nada cambia en tu PC guardada hasta que lo confirmes."]) expect(text(host)).toContain(word);
    expect(text(host)).toContain("Placa de video"); expect(starts(calls, "PUT", "/api/towers")).toHaveLength(0);
    await click(button(host, "Ahora no"));
    expect(text(host)).not.toContain("¿Actualizamos Mi PC?"); expect(starts(calls, "PUT", "/api/towers")).toHaveLength(0);
  });
});

describe("Mi plan: actualizar precios", () => {
  it("pide confirmar, recalcula con las revisiones esperadas y cuenta si el plan subió y qué dejó de encajar", async () => {
    const before = makePlan({ progress: { [keys[0]]: "2026-10-20T15:00:00Z" }, spent: "92500.00", remaining: "449900.00" });
    const after = makePlan({ total: "600000.00", progress: { [keys[0]]: "2026-10-20T15:00:00Z" }, spent: "92500.00", remaining: "507500.00" });
    after.snapshot.stages[1].evaluation = evaluation("requiere_verificacion") as never;
    after.revision = 2;
    const { calls } = stubApi({ plan: before, recalculated: after });
    const host = await mount(<MiPlan />); await settle();
    await click(button(host, "Actualizar precios"));
    expect(starts(calls, "POST", "/recalculate")).toHaveLength(0);
    expect(text(host)).toContain("¿Buscamos los precios de hoy?");
    await click(button(host, "Buscar precios nuevos"));
    const posts = starts(calls, "POST", "/recalculate");
    expect(posts).toHaveLength(1);
    const body = posts[0].body!;
    expect(body.expected_plan_revision).toBe(1); expect(body.expected_pc_revision).toBe(1); expect(body.expected_catalog_version).toBe("v1"); expect(body).not.toHaveProperty("user_id");
    expect((body.stages as unknown[]).length).toBe(3);
    expect(text(host)).toContain("Actualizamos los precios de tu plan"); expect(text(host)).toContain("Los precios subieron: el plan pasó de $ 542.400 a $ 600.000.");
    expect(text(host)).toContain("Dejó de encajar: Placa de video nueva");
    expect(text(host)).toContain("$ 507.500");
    expect(starts(calls, "PUT", "/api/towers")).toHaveLength(0);
  });

  it("ante un conflicto lo explica, recarga y no reintenta solo", async () => {
    const { calls } = stubApi({ plan: makePlan(), recalcStatus: 409 });
    const host = await mount(<MiPlan />); await settle();
    await click(button(host, "Actualizar precios"));
    await click(button(host, "Buscar precios nuevos")); await settle();
    expect(starts(calls, "POST", "/recalculate")).toHaveLength(1);
    expect(text(host)).toContain("Algo cambió mientras mirabas"); expect(text(host)).not.toContain("Actualizamos los precios de tu plan");
    expect(calls.filter(call => call.url === `/api/tower-plans/${planId}` && call.method === "GET").length).toBeGreaterThanOrEqual(2);
  });
});
