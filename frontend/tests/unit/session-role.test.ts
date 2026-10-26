import { describe, expect, it, vi } from "vitest";
import { createRoleProbe } from "../../lib/session-role";

describe("visibilidad de navegación, permisos siempre servidor", () => {
  it("sólo HTTP 200 habilita el enlace", async () => {
    for (const status of [200, 401, 403, 404, 503]) {
      const observed: boolean[] = [];
      const request = vi.fn(async () => new Response(null, { status }));
      const probe = createRoleProbe(allowed => observed.push(allowed), request);
      await probe.refresh(); expect(observed).toEqual([status === 200]); probe.dispose();
    }
  });
  it("invalida inmediatamente y descarta HTTP 200 obsoleto tras logout", async () => {
    const observed: boolean[] = [];
    let release!: (response: Response) => void;
    const request = vi.fn(() => new Promise<Response>(resolve => { release = resolve; }));
    const probe = createRoleProbe(allowed => observed.push(allowed), request);
    const old = probe.refresh(); probe.invalidate();
    expect(observed).toEqual([false]);
    release(new Response(null, { status: 200 })); await old;
    expect(observed).toEqual([false]);
    const current = probe.refresh(); release(new Response(null, { status: 200 })); await current;
    expect(observed).toEqual([false, true]); probe.dispose();
  });
  it("fallos ocultan y una ruta desmontada no recibe permisos tardíos", async () => {
    const observed: boolean[] = [];
    const failure = createRoleProbe(allowed => observed.push(allowed), vi.fn(async () => { throw new Error("synthetic transport failure"); }));
    await failure.refresh(); expect(observed).toEqual([false]);
    let release!: (response: Response) => void;
    const pending = createRoleProbe(allowed => observed.push(allowed), vi.fn(() => new Promise<Response>(resolve => { release = resolve; })));
    const waiting = pending.refresh(); pending.dispose(); release(new Response(null, { status: 200 })); await waiting;
    expect(observed).toEqual([false]);
  });
});
