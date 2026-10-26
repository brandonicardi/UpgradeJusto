import { expect, type Browser, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { applicationOrigin, type createSocketProxy } from "./socket-proxy";

// Diagnostic only: anonymous navigation/session GET, never login/register/CSRF POST.
// Historical investigation helper only. No E2E test/config imports or invokes it.
// Never replace the auth acceptance test with this comparison.

type Signature = { bytes: number; digest: string; type: string; encoding: string; prefix: string };

export async function diagnoseHydration(page: Page, browser: Browser, proxyStats: Awaited<ReturnType<typeof createSocketProxy>>["stats"]) {
  // Explicitly unproxied control, with its own empty cookie jar.
  const directContext = await browser.newContext({ baseURL: applicationOrigin });
  const direct = await directContext.newPage();
  const bodies: Promise<void>[] = [];
  const bounded = async <T,>(work: Promise<T>, milliseconds: number): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([work, new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Diagnostic deadline")), milliseconds);
      })]);
    } finally { if (timer) clearTimeout(timer); }
  };
  function observe(target: Page, label: string) {
    const scripts = new Map<string, Signature>();
    const counts: Record<string, number> = {};
    const count = (kind: string) => {
      counts[kind] = (counts[kind] ?? 0) + 1;
      console.info("Anonymous runtime counts", JSON.stringify({ label, counts }));
    };
    target.setDefaultNavigationTimeout(8000);
    // Inspect only allowlisted public diagnostic categories, never print message text/args.
    const classifyConsole = (text: string) => {
      if (/content security policy|violates.*(?:script-src|connect-src)|refused to (?:execute|load|connect)/i.test(text)) return "csp-restriction";
      if (/cross.origin.*(?:block|denied)|allowedDevOrigins|unauthorized.*origin/i.test(text)) return "dev-origin-restriction";
      if (/websocket.*(?:fail|error|closed)|(?:fail|error).*websocket/i.test(text)) return "websocket-failure";
      if (/\[HMR\]|hot.module.replacement|webpack.hmr|hot reload/i.test(text)) return "hmr-public-message";
      if (/hydration|hydrating/i.test(text)) return "hydration-public-message";
      return null;
    };
    let publicMessages = 0;
    target.on("console", message => {
      const kind = classifyConsole(message.text());
      if (kind && publicMessages++ < 30) count(kind);
    });
    target.on("worker", () => count("worker-created"));
    target.on("websocket", socket => {
      count("websocket-created");
      socket.on("socketerror", () => count("websocket-error"));
    });
    target.on("pageerror", error => count(/hydrati/i.test(error.message) ? "hydration-error"
      : /syntax|unexpected token/i.test(error.name + error.message) ? "syntax-error" : "other-pageerror"));
    target.on("domcontentloaded", () => count("domcontentloaded"));
    target.on("load", () => count("load"));
    target.on("request", request => {
      if (request.url() === `${applicationOrigin}/api/auth/session`) count("automatic-session-request");
    });
    target.on("requestfailed", request => {
      const url = new URL(request.url());
      if (url.origin === applicationOrigin && url.pathname.startsWith("/_next/")) count("next-requestfailed");
    });
    target.on("response", response => {
      if (response.request().isNavigationRequest() && response.url() === `${applicationOrigin}/account`) {
        const headers = response.headers();
        const fingerprint = (value: string | undefined) => value === undefined ? null
          : createHash("sha256").update(value).digest("hex");
        console.info("Anonymous document policy", JSON.stringify({ label,
          cspDigest: fingerprint(headers["content-security-policy"]),
          cspReportOnlyDigest: fingerprint(headers["content-security-policy-report-only"]),
          contentType: /html/i.test(headers["content-type"] ?? "") ? "html" : "other",
        }));
      }
      if (response.url() === `${applicationOrigin}/api/auth/session`) count(`session-status-${response.status()}`);
      const url = new URL(response.url());
      if (url.origin !== applicationOrigin || !url.pathname.startsWith("/_next/static/") || !url.pathname.endsWith(".js")) return;
      count(`js-status-${response.status()}`);
      bodies.push((async () => {
        try {
          const body = await bounded(response.body(), 4000);
          const headers = response.headers();
          const type = headers["content-type"] ?? "";
          const encoding = headers["content-encoding"] ?? "identity";
          const first = body.subarray(0, 100).toString("utf8").trimStart();
          scripts.set(url.pathname, {
            bytes: body.length, digest: createHash("sha256").update(body).digest("hex"),
            type: /javascript|ecmascript/i.test(type) ? "javascript" : /html/i.test(type) ? "html" : "other",
            encoding: ["gzip", "br", "deflate", "identity"].includes(encoding) ? encoding : "other",
            prefix: !body.length ? "empty" : first.startsWith("<") ? "markup"
              : body[0] === 0x1f && body[1] === 0x8b ? "gzip-bytes" : "text-or-other",
          });
          count("js-body-read");
        } catch { count("js-body-unavailable"); }
      })());
    });
    return { scripts, counts };
  }
  const proxied = observe(page, "proxy");
  const control = observe(direct, "direct");
  try {
    console.info("Anonymous comparison stage", "navigation:begin");
    await Promise.all([page.goto("/account"), direct.goto("/account")]);
    console.info("Anonymous comparison stage", "navigation:done");
    // Observation only: retain both states even if one never hydrates.
    await Promise.all([page, direct].map(target => target.getByRole("button", { name: "Crear cuenta", exact: true })
      .waitFor({ state: "visible", timeout: 2000 })));
    const enabled = await Promise.all([page, direct].map(async target => {
      try {
        await expect(target.getByRole("button", { name: "Crear cuenta", exact: true })).toBeEnabled({ timeout: 4000 });
        return true;
      } catch { return false; }
    }));
    await Promise.all(bodies);
    const runtime = await Promise.all([page, direct].map(target => bounded(target.evaluate(() => {
      const global = window as unknown as Record<string, unknown>;
      const button = Array.from(document.querySelectorAll("button")).find(node => node.textContent === "Crear cuenta");
      return {
        readyState: document.readyState,
        nextFlightQueue: Array.isArray(global.__next_f),
        nextFlightEntries: Array.isArray(global.__next_f) ? global.__next_f.length : null,
        nextFlightPushNative: Array.isArray(global.__next_f) ? global.__next_f.push === Array.prototype.push : null,
        turbopackQueue: Array.isArray(global.TURBOPACK),
        webpackQueue: Array.isArray(global.webpackChunk_N_E),
        webpackEntries: Array.isArray(global.webpackChunk_N_E) ? global.webpackChunk_N_E.length : null,
        webpackPushNative: Array.isArray(global.webpackChunk_N_E) ? global.webpackChunk_N_E.push === Array.prototype.push : null,
        nextRuntimePresent: typeof global.next === "object",
        serviceWorkerControlled: !!navigator.serviceWorker?.controller,
        scripts: Array.from(document.scripts).map(script => ({
          external: !!script.src, module: script.type === "module", async: script.async,
          defer: script.defer, noncePresent: !!script.nonce, integrityPresent: !!script.integrity,
        })),
        reactAttached: !!button && Object.keys(button).some(key => key.startsWith("__reactFiber$") || key.startsWith("__reactProps$")),
        disabled: button?.disabled ?? null,
      };
    }), 3000)));
    const keys = [...new Set([...proxied.scripts.keys(), ...control.scripts.keys()])].sort();
    const comparison = keys.map((key, index) => {
      const proxy = proxied.scripts.get(key), direct = control.scripts.get(key);
      // Index only; never print asset paths, body text, URLs or request headers.
      return { index, proxy: proxy ?? null, direct: direct ?? null,
        equal: !!proxy && !!direct && proxy.digest === direct.digest };
    });
    console.info("Anonymous comparison result", JSON.stringify({
      enabled: { proxy: enabled[0], direct: enabled[1] },
      runtime: { proxy: runtime[0], direct: runtime[1] },
      counts: { proxy: proxied.counts, direct: control.counts }, scripts: comparison,
      transportRejections: {
        applicationConnect: proxyStats.rejectedApplicationConnect, otherConnect: proxyStats.rejectedOtherConnect,
        hmrUpgrade: proxyStats.rejectedHmrUpgrade, otherUpgrade: proxyStats.rejectedOtherUpgrade,
      },
    }));
    expect(enabled, "Anonymous controls must hydrate in both transports").toEqual([true, true]);
  } finally { await directContext.close(); }
}
