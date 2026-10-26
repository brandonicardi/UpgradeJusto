import { Agent, createServer, request, type IncomingHttpHeaders } from "node:http";
import { randomInt } from "node:crypto";
import type { Socket } from "node:net";

export const applicationOrigin = "http://127.0.0.1:3000";

export function allowedProxyTarget(target: string | undefined, host: string | undefined): URL | null {
  if (!target?.startsWith(`${applicationOrigin}/`) || host !== "127.0.0.1:3000") return null;
  try {
    const url = new URL(target);
    return url.origin === applicationOrigin && !url.username && !url.password && !url.hash ? url : null;
  } catch { return null; }
}

function upstreamHeaders(incoming: IncomingHttpHeaders): IncomingHttpHeaders {
  const headers = { ...incoming };
  const connection = String(headers.connection ?? "").split(",").map(value => value.trim().toLowerCase());
  for (const key of [...connection, "connection", "proxy-connection", "proxy-authorization", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade"]) delete headers[key];
  return headers;
}

export async function createSocketProxy() {
  // Test-owned transport address. Never disclose it or replace product identity headers.
  const source = `127.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
  const agent = new Agent({ keepAlive: false });
  const sockets = new Set<Socket>();
  const stats = { forwarded: 0, connected: 0, sourceVerified: true, closed: false,
    rejectedApplicationConnect: 0, rejectedOtherConnect: 0, rejectedHmrUpgrade: 0, rejectedOtherUpgrade: 0 };
  const track = (socket: Socket) => { sockets.add(socket); socket.once("close", () => sockets.delete(socket)); };
  const server = createServer((incoming, outgoing) => {
    const target = allowedProxyTarget(incoming.url, incoming.headers.host);
    if (!target || incoming.method === "CONNECT") {
      outgoing.writeHead(403, { Connection: "close" }); outgoing.end(); return;
    }
    stats.forwarded++;
    const upstream = request({
      hostname: "127.0.0.1", port: 3000, localAddress: source, agent,
      method: incoming.method, path: target.pathname + target.search,
      headers: upstreamHeaders(incoming.headers),
    }, response => {
      outgoing.writeHead(response.statusCode ?? 502, upstreamHeaders(response.headers));
      response.pipe(outgoing);
    });
    upstream.once("socket", socket => {
      track(socket);
      socket.once("connect", () => {
        stats.connected++;
        stats.sourceVerified = stats.sourceVerified && socket.localAddress === source;
      });
    });
    upstream.setTimeout(20000, () => upstream.destroy(new Error("Test proxy upstream timeout")));
    upstream.once("error", () => {
      if (!outgoing.headersSent) { outgoing.writeHead(502, { Connection: "close" }); outgoing.end("Test proxy upstream unavailable"); }
      else outgoing.destroy();
    });
    incoming.once("aborted", () => upstream.destroy());
    outgoing.once("close", () => upstream.destroy());
    incoming.pipe(upstream);
  });
  server.on("connection", track);
  server.on("connect", (incoming, socket) => {
    if (incoming.url === "127.0.0.1:3000") stats.rejectedApplicationConnect++;
    else stats.rejectedOtherConnect++;
    socket.end("HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
  });
  server.on("upgrade", (incoming, socket) => {
    const target = allowedProxyTarget(incoming.url, incoming.headers.host);
    if (target?.pathname === "/_next/webpack-hmr") stats.rejectedHmrUpgrade++;
    else stats.rejectedOtherUpgrade++;
    socket.end("HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
  });
  server.on("clientError", (_error, socket) => socket.destroy());
  async function close() {
    if (stats.closed) return;
    stats.closed = true;
    agent.destroy();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", () => reject(new Error("Test proxy listener failed")));
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test proxy listener unavailable");
    return { server: `http://127.0.0.1:${address.port}`, stats, close };
  } catch {
    await close(); throw new Error("Test proxy initialization failed; no direct fallback");
  }
}
