import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, insertVisit } from "@/lib/db";
import { lookupGeo } from "@/lib/geo";
import { clientIp } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  const link = getLinkByCode(code);

  if (!link) {
    return new NextResponse("Link não encontrado", { status: 404 });
  }

  const ip = clientIp(req.headers);
  const geo = await lookupGeo(ip);

  insertVisit({
    code,
    ip,
    userAgent: req.headers.get("user-agent"),
    referer: req.headers.get("referer"),
    language: req.headers.get("accept-language"),
    country: geo.country,
    city: geo.city,
    isp: geo.isp,
  });

  return NextResponse.redirect(link.target_url, 302);
}
