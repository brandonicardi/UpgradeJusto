import { expect, test } from "@playwright/test";
import { request } from "node:http";
import { randomInt, randomUUID } from "node:crypto";

test.use({ trace: "off", screenshot: "off", video: "off" });

function call(localAddress: string, action: string, cookie?: string, csrf?: string, body?: string): Promise<{ status: number; cookie?: string; csrf?: string }> {
  return new Promise((resolve, reject) => {
    const req = request(`http://127.0.0.1:3000/api/auth/${action}`, {
      localAddress, method: body ? "POST" : "GET",
      headers: {
        Origin: "http://127.0.0.1:3000", "Content-Type": "application/json",
        "X-Forwarded-For": "192.0.2.123", Forwarded: "for=192.0.2.123",
        "X-UJ-Socket-IP": "192.0.2.123", "X-UJ-Client-IP": "192.0.2.123",
        "X-UJ-Proxy-Timestamp": "0", "X-UJ-Proxy-Signature": "fake",
        ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
    }, res => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => {
        let token: string | undefined;
        try { token = JSON.parse(text).csrf_token; } catch { /* No echo of raw auth body. */ }
        resolve({ status: res.statusCode ?? 0, cookie: res.headers["set-cookie"]?.[0]?.split(";")[0], csrf: token });
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error("Gateway request timed out")));
    req.on("error", () => reject(new Error("Gateway socket request failed; verify loopback source binding/runtime")));
    req.end(body);
  });
}

test("gateway real descarta spoofing y separa límite de dos IP socket", async () => {
  test.setTimeout(120000);
  const subnet = `127.${randomInt(1, 255)}.${randomInt(1, 255)}`;
  const first = `${subnet}.2`, second = `${subnet}.3`;
  const a = await call(first, "csrf"), b = await call(second, "csrf");
  expect(a.status).toBe(200); expect(b.status).toBe(200);
  if (!a.cookie || !a.csrf || !b.cookie || !b.csrf) throw new Error("Gateway did not provide CSRF session");
  for (let i = 0; i < 21; i++) {
    const response = await call(first, "login", a.cookie, a.csrf, JSON.stringify({ email: `gateway-${randomUUID()}@example.test`, password: randomUUID() }));
    expect(response.status).toBe(i < 20 ? 401 : 429);
  }
  const other = await call(second, "login", b.cookie, b.csrf, JSON.stringify({ email: `gateway-${randomUUID()}@example.test`, password: randomUUID() }));
  expect(other.status).toBe(401);
});
