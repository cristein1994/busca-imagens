import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-side ICMP/ARP scanning must run in Node, not Edge
  serverExternalPackages: [],
};

export default nextConfig;
