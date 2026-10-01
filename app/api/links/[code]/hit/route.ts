import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, insertVisit, type VisitInput } from "@/lib/db";
import { lookupGeo } from "@/lib/geo";
import { parseUserAgent } from "@/lib/ua";
import { clientIp } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

type SmartBody = {
  language?: string;
  timezone?: string;
  screenSize?: string;
  orientation?: string;
  connectionType?: string;
  battery?: string;
  charging?: string;
  gpu?: string;
  incognito?: string;
  adblocker?: string;
  localIp?: string;
  vm?: string;
  source?: string;
};

export async function POST(req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  const link = getLinkByCode(code);
  if (!link) {
    return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });
  }

  let body: SmartBody = {};
  try {
    body = (await req.json()) as SmartBody;
  } catch {
    body = {};
  }

  const ip = clientIp(req.headers);
  const ua = req.headers.get("user-agent");
  const geo = await lookupGeo(ip);
  const parsed = parseUserAgent(ua);

  const visit: VisitInput = {
    code,
    ip,
    localIp: body.localIp ?? null,
    userAgent: ua,
    referer: req.headers.get("referer"),
    language: body.language || req.headers.get("accept-language"),
    country: geo.country,
    city: geo.city,
    region: geo.region,
    isp: geo.isp,
    hostname: geo.hostname,
    timezone: body.timezone || geo.timezone,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    botName: parsed.botName,
    screenSize: body.screenSize ?? null,
    orientation: body.orientation ?? null,
    connectionType: body.connectionType ?? null,
    battery: body.battery ?? null,
    charging: body.charging ?? null,
    gpu: body.gpu ?? null,
    incognito: body.incognito ?? null,
    adblocker: body.adblocker ?? null,
    vpnProxy: geo.vpnProxy,
    tor: geo.tor,
    vm: body.vm ?? null,
    source: body.source || "link",
  };

  const id = insertVisit(visit);
  return NextResponse.json({ ok: true, id, targetUrl: link.target_url });
}
