import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // fengari is a CommonJS Lua VM — keep it on the Node server, not the Edge bundle
  serverExternalPackages: ["fengari"],
  turbopack: {
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
  agentRules: false,
};

export default nextConfig;
