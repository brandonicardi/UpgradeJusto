import type { NextConfig } from "next";

// Capability URLs must not enter Next's default development request logs.
const config: NextConfig = { poweredByHeader: false, logging: false, async headers() {
  return ["/shared-tower-plans/:path*", "/api/shared-tower-plans/:path*", "/tower-plans/:id/shares", "/api/tower-plans/:id/shares/:path*"].map(source => ({ source, headers: [
    { key: "Cache-Control", value: "no-store, max-age=0" }, { key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ] }));
} };
export default config;
