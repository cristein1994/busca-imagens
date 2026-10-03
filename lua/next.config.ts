import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // fengari is a CommonJS Lua VM — keep it on the Node server, not the Edge bundle
  serverExternalPackages: ["fengari"],
};

export default nextConfig;
