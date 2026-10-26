import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { IncomingMessage } from "node:http";

export function normalizeIP(value: unknown): string | null {
  if (typeof value !== "string" || value.includes("%") || !isIP(value)) return null;
  if (isIP(value) === 4) return value;
  const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(canonical);
  if (!mapped) return canonical;
  const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function isUntrustedGatewayHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === "forwarded" || lower === "x-forwarded-for" || lower.startsWith("x-uj-");
}

export function stampSocketIP(request: IncomingMessage): boolean {
  for (const name of Object.keys(request.headers)) {
    if (isUntrustedGatewayHeader(name)) delete request.headers[name];
  }
  const retained: string[] = [];
  for (let i = 0; i < request.rawHeaders.length; i += 2) {
    if (!isUntrustedGatewayHeader(request.rawHeaders[i])) retained.push(request.rawHeaders[i], request.rawHeaders[i + 1]);
  }
  request.rawHeaders = retained;
  const ip = normalizeIP(request.socket.remoteAddress);
  if (!ip) return false;
  request.headers["x-uj-socket-ip"] = ip;
  request.rawHeaders.push("X-UJ-Socket-IP", ip);
  return true;
}

export function signedProxyHeaders(ipValue: unknown, method: string, pathname: string, secret: string | undefined, now = Date.now()): Record<string, string> | null {
  const ip = normalizeIP(ipValue);
  const extractionPath = method === "POST" && ["/api/pcs/extract", "/api/pcs/extract/confirm"].includes(pathname);
  const administrationPath = adminGatewayPath(pathname, method);
  const compatibilityPath = /^\/api\/pcs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/compatibility\/(evaluate|simulate)$/.test(pathname);
  const recommendationsPath = /^\/api\/pcs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/recommendations\/preview$/.test(pathname);
  const plansPath = (pathname === "/api/plans" && ["GET", "POST"].includes(method)) || (/^\/api\/plans\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(pathname) && ["GET", "PUT", "DELETE"].includes(method));
  const shareRoot = "\\/api\\/plans\\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\/shares";
  const sharesPath = (new RegExp(`^${shareRoot}$`).test(pathname) && ["GET", "POST"].includes(method)) || (new RegExp(`^${shareRoot}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`).test(pathname) && method === "DELETE");
  const publicPath = /^\/api\/shared-plans\/[A-Za-z0-9_-]{43}$/.test(pathname) && method === "GET";
  const conversationRoot = "/api/conversations";
  const conversationDetail = /^\/api\/conversations\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(pathname);
  const conversationMessages = /^\/api\/conversations\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/messages$/.test(pathname);
  const conversationsPath = (pathname === conversationRoot && ["GET", "POST"].includes(method)) || (conversationDetail && ["GET", "DELETE"].includes(method)) || (conversationMessages && ["GET", "POST"].includes(method));
  const allowedPath = /^\/api\/auth\/[a-z]+$/.test(pathname) || /^\/api\/pcs(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/.test(pathname) || (method === "POST" && (compatibilityPath || recommendationsPath)) || plansPath || sharesPath || publicPath || conversationsPath;
  if (!ip || !secret || Buffer.byteLength(secret, "utf8") < 32 || !/^[A-Z]+$/.test(method) || !(extractionPath || administrationPath || allowedPath)) return null;
  const timestamp = String(Math.floor(now / 1000));
  const canonical = `${timestamp}\n${method}\n${pathname}\n${ip}`;
  return {
    "X-UJ-Client-IP": ip,
    "X-UJ-Proxy-Timestamp": timestamp,
    "X-UJ-Proxy-Signature": createHmac("sha256", secret).update(canonical, "utf8").digest("hex"),
  };
}

export function adminGatewayPath(pathname: string, method: string): boolean {
  // Backend generates these IDs; only components retain the fourteen seed IDs.
  const revision = "(?:sprint31b-a-v1|revision-[0-9a-f]{32})";
  const row = "row-[0-9a-f]{32}";
  const root = "/api/admin/revisions";
  if (pathname === root) return ["GET", "POST"].includes(method);
  if (new RegExp(`^${root}/${revision}/publish$`).test(pathname)) return method === "POST";
  if (new RegExp(`^${root}/${revision}/(components|prices|sources|cpu_support)$`).test(pathname)) return ["GET", "POST"].includes(method);
  const componentRow = new RegExp(`^${root}/${revision}/components/(?:${row}|P0[1-9]|P1[0-4])$`).test(pathname);
  const otherRow = new RegExp(`^${root}/${revision}/(prices|sources|cpu_support)/${row}$`).test(pathname);
  return (componentRow || otherRow) && ["PATCH", "DELETE"].includes(method);
}
