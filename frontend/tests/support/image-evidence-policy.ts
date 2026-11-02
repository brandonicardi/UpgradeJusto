import { vendorImageURL } from "../../lib/retail-presentation";

// Evidence only. Fixed exact HOST boundary, including after redirects; this is
// not a promise to reintercept every redirected full URL or a product policy.
export const imageEvidenceHosts = Object.freeze(["imagenes.compragamer.com", "venex.com.ar", "www.venex.com.ar"]);
export const imageEvidenceBypass = `${imageEvidenceHosts.join(",")},<-loopback>`;

export function imageEvidenceURL(value: string, method: string, resourceType: string): string | null {
  if (method !== "GET" || resourceType !== "image" || /[?#\\\s]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password || !imageEvidenceHosts.includes(url.hostname)) return null;
    return vendorImageURL(url.href);
  } catch { return null; }
}

export function imageEvidenceHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => {
    const key = name.toLowerCase();
    // Cookie/Host are browser-controlled, not overridable by route.continue.
    // Omission here is NOT a cookie isolation mechanism: the fresh context and
    // browser origin scoping provide that. Never add vendor-private cookies.
    return !["authorization", "proxy-authorization", "referer", "cookie", "host"].includes(key)
      && !key.startsWith("x-uj-") && !key.includes("csrf") && !key.includes("xsrf");
  }));
}
