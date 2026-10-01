import { NextRequest, NextResponse } from "next/server";
import { countVisits, getLinkByCode, getVisits } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token") || "";
  const afterId = Number(req.nextUrl.searchParams.get("afterId") || "0");

  const link = getLinkByCode(code);
  if (!link) {
    return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });
  }
  if (!token || token !== link.token) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const visits = getVisits(code, Number.isFinite(afterId) ? afterId : 0);
  return NextResponse.json({
    code: link.code,
    label: link.label,
    targetUrl: link.target_url,
    createdAt: link.created_at,
    total: countVisits(code),
    visits: visits.map((v) => ({
      id: v.id,
      ip: v.ip,
      userAgent: v.user_agent,
      referer: v.referer,
      language: v.language,
      country: v.country,
      city: v.city,
      isp: v.isp,
      createdAt: v.created_at,
    })),
  });
}
