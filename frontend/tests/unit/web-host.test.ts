import { describe, expect, it } from "vitest";
import { resolveWebHost } from "../../lib/web-host";

describe("resolveWebHost", () => {
  it("usa 127.0.0.1 cuando UJ_WEB_HOST no está definido", () => {
    expect(resolveWebHost({})).toBe("127.0.0.1");
  });

  it("acepta 127.0.0.1 y 0.0.0.0", () => {
    expect(resolveWebHost({ UJ_WEB_HOST: "127.0.0.1" })).toBe("127.0.0.1");
    expect(resolveWebHost({ UJ_WEB_HOST: "0.0.0.0" })).toBe("0.0.0.0");
  });

  it.each(["", " ", "localhost", "::", "::1", "192.168.1.10", "0.0.0.0 ", "127.0.0.1\n"])(
    "se niega a arrancar con %j",
    value => {
      expect(() => resolveWebHost({ UJ_WEB_HOST: value })).toThrow(/UJ_WEB_HOST/);
    },
  );
});
