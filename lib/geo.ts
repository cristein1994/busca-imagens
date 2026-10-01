export type GeoInfo = {
  country: string | null;
  city: string | null;
  isp: string | null;
};

const cache = new Map<string, { at: number; data: GeoInfo }>();
const TTL_MS = 1000 * 60 * 60 * 6;

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
  if (!ip || isPrivateIp(ip)) {
    return { country: null, city: null, isp: null };
  }

  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,isp`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) throw new Error(`geo ${res.status}`);
    const json = (await res.json()) as {
      status?: string;
      country?: string;
      city?: string;
      isp?: string;
    };
    const data: GeoInfo =
      json.status === "success"
        ? {
            country: json.country ?? null,
            city: json.city ?? null,
            isp: json.isp ?? null,
          }
        : { country: null, city: null, isp: null };
    cache.set(ip, { at: Date.now(), data });
    return data;
  } catch {
    return { country: null, city: null, isp: null };
  }
}
