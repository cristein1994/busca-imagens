export type GeoInfo = {
  country: string | null;
  city: string | null;
  region: string | null;
  isp: string | null;
  hostname: string | null;
  timezone: string | null;
  vpnProxy: string | null;
  tor: string | null;
  hosting: string | null;
};

const cache = new Map<string, { at: number; data: GeoInfo }>();
const TTL_MS = 1000 * 60 * 60 * 6;

function empty(): GeoInfo {
  return {
    country: null,
    city: null,
    region: null,
    isp: null,
    hostname: null,
    timezone: null,
    vpnProxy: null,
    tor: null,
    hosting: null,
  };
}

function isPrivateIp(ip: string) {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

export async function lookupGeo(ip: string | null | undefined): Promise<GeoInfo> {
  if (!ip || isPrivateIp(ip)) return empty();

  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const fields =
      "status,country,regionName,city,isp,org,as,reverse,timezone,proxy,hosting,query";
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) throw new Error(`geo ${res.status}`);
    const json = (await res.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
      isp?: string;
      org?: string;
      reverse?: string;
      timezone?: string;
      proxy?: boolean;
      hosting?: boolean;
    };

    if (json.status !== "success") {
      const data = empty();
      cache.set(ip, { at: Date.now(), data });
      return data;
    }

    const isp = json.isp || json.org || null;
    const asLower = (json.org || json.isp || "").toLowerCase();
    const tor =
      asLower.includes("tor") || asLower.includes("exit node") ? "yes" : "no";

    const data: GeoInfo = {
      country: json.country ?? null,
      city: json.city ?? null,
      region: json.regionName ?? null,
      isp,
      hostname: json.reverse || null,
      timezone: json.timezone ?? null,
      vpnProxy: json.proxy ? "yes" : "no",
      tor,
      hosting: json.hosting ? "yes" : "no",
    };
    cache.set(ip, { at: Date.now(), data });
    return data;
  } catch {
    return empty();
  }
}

export async function lookupIpDetails(ip: string) {
  const geo = await lookupGeo(ip);
  return { ip, ...geo };
}
