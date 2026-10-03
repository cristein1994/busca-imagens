import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, insertVisit } from "@/lib/db";
import { lookupGeo } from "@/lib/geo";
import { findLoggerImage } from "@/lib/image-asset";
import { parseUserAgent } from "@/lib/ua";
import { clientIp } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

// 1x1 transparent GIF (fallback when no custom photo is attached)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

async function logImageHit(req: NextRequest, code: string) {
  const link = getLinkByCode(code);
  if (!link) return;

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

export async function GET(req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  await logImageHit(req, code);

  const custom = findLoggerImage(code);
  if (custom) {
    const body = fs.readFileSync(custom.path);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": custom.mime,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        "Content-Disposition": "inline",
      },
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
