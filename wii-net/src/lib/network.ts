import os from "node:os";
import type { NetworkInterfaceInfo } from "./types";

/** Convert dotted IPv4 + netmask to CIDR prefix length. */
export function netmaskToPrefix(netmask: string): number {
  const parts = netmask.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    throw new Error(`Máscara inválida: ${netmask}`);
  }
  const bits = parts
    .map((n) => n.toString(2).padStart(8, "0"))
    .join("");
  if (!/^1*0*$/.test(bits)) {
    throw new Error(`Máscara inválida: ${netmask}`);
  }
  return bits.indexOf("0") === -1 ? 32 : bits.indexOf("0");
}

export function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    throw new Error(`IP inválido: ${ip}`);
  }
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

export function intToIpv4(n: number): string {
  return [
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ].join(".");
}

export function isPrivateOrLocalIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  const inRange = (base: string, prefix: number) => {
    const baseInt = ipv4ToInt(base);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (n & mask) === (baseInt & mask);
  };

  return (
    inRange("10.0.0.0", 8) ||
    inRange("172.16.0.0", 12) ||
    inRange("192.168.0.0", 16) ||
    inRange("169.254.0.0", 16) ||
    inRange("127.0.0.0", 8)
  );
}

export function parseCidr(cidr: string): { network: number; prefix: number; broadcast: number } {
  const trimmed = cidr.trim();
  const match = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(trimmed);
  if (!match) {
    throw new Error(`CIDR inválido: ${cidr}`);
  }
  const ip = match[1]!;
  const prefix = Number(match[2]);
  if (prefix < 8 || prefix > 30) {
    throw new Error("Prefixo CIDR deve estar entre /8 e /30 para varredura local.");
  }
  if (!isPrivateOrLocalIpv4(ip)) {
    throw new Error("Somente redes locais/privadas (RFC1918, link-local ou loopback) são permitidas.");
  }

  const ipInt = ipv4ToInt(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;

  // Ensure the whole range is private
  if (!isPrivateOrLocalIpv4(intToIpv4(network)) || !isPrivateOrLocalIpv4(intToIpv4(broadcast))) {
    throw new Error("O intervalo CIDR sai de redes privadas/locais.");
  }

  return { network, prefix, broadcast };
}

export function hostsInCidr(cidr: string, maxHosts?: number): string[] {
  const limit =
    maxHosts ??
    (Number(process.env.SCAN_MAX_HOSTS) > 0 ? Number(process.env.SCAN_MAX_HOSTS) : 1024);
  const { network, broadcast } = parseCidr(cidr);
  const usableStart = network + 1;
  const usableEnd = broadcast - 1;
  if (usableEnd < usableStart) {
    throw new Error("CIDR sem hosts utilizáveis.");
  }
  const count = usableEnd - usableStart + 1;
  if (count > limit) {
    throw new Error(
      `Rede muito grande (${count} hosts). Use um prefixo mais específico (máx. ${limit} hosts, tipicamente /22 ou menor).`,
    );
  }
  const hosts: string[] = [];
  for (let i = usableStart; i <= usableEnd; i++) {
    hosts.push(intToIpv4(i));
  }
  return hosts;
}

export function addressToCidr(address: string, netmask: string): string {
  const prefix = netmaskToPrefix(netmask);
  const { network } = parseCidr(`${address}/${prefix}`);
  return `${intToIpv4(network)}/${prefix}`;
}

/** List non-internal IPv4 interfaces suitable for LAN monitoring. */
export function listLocalInterfaces(): NetworkInterfaceInfo[] {
  const ifaces = os.networkInterfaces();
  const result: NetworkInterfaceInfo[] = [];

  for (const [name, entries] of Object.entries(ifaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family !== "IPv4" && (entry.family as unknown) !== 4) continue;
      if (entry.internal) continue;
      try {
        const cidr = addressToCidr(entry.address, entry.netmask);
        // Only expose private/local interfaces
        if (!isPrivateOrLocalIpv4(entry.address)) continue;
        result.push({
          name,
          address: entry.address,
          netmask: entry.netmask,
          cidr,
          family: "IPv4",
          internal: false,
          mac: entry.mac && entry.mac !== "00:00:00:00:00:00" ? entry.mac : undefined,
        });
      } catch {
        // skip malformed
      }
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function pickDefaultCidr(interfaces: NetworkInterfaceInfo[]): string | null {
  if (interfaces.length === 0) return null;
  // Prefer 192.168.* then 10.* then 172.16-31
  const score = (cidr: string) => {
    if (cidr.startsWith("192.168.")) return 0;
    if (cidr.startsWith("10.")) return 1;
    if (cidr.startsWith("172.")) return 2;
    return 3;
  };
  return [...interfaces].sort((a, b) => score(a.cidr) - score(b.cidr))[0]!.cidr;
}
