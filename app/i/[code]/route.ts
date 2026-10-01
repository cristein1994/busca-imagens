import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, insertVisit } from "@/lib/db";
import { lookupGeo } from "@/lib/geo";
import { parseUserAgent } from "@/lib/ua";
import { clientIp } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  const link = getLinkByCode(code);

  if (link) {
    const ip = clientIp(req.headers);
    const ua = req.headers.get("user-agent");
    const geo = await lookupGeo(ip);
    const parsed = parseUserAgent(ua);
    insertVisit({
      code,
      ip,
      userAgent: ua,
      referer: req.headers.get("referer"),
      language: req.headers.get("accept-language"),
      country: geo.country,
      city: geo.city,
      region: geo.region,
      isp: geo.isp,
      hostname: geo.hostname,
      timezone: geo.timezone,
      browser: parsed.browser,
      os: parsed.os,
      device: parsed.device,
      botName: parsed.botName,
      vpnProxy: geo.vpnProxy,
      tor: geo.tor,
      source: "image",
    });
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
