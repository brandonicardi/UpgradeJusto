import type { NextConfig } from "next";

// Capability URLs must not enter Next's default development request logs.
const config: NextConfig = { poweredByHeader: false, logging: false };
export default config;
