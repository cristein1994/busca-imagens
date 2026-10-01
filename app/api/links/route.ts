import { NextRequest, NextResponse } from "next/server";
import { createLink, listLinks } from "@/lib/db";
import { baseUrl, isValidHttpUrl, newCode, newToken } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const links = listLinks().map((l) => ({
    code: l.code,
    label: l.label,
    targetUrl: l.target_url,
    smartLogger: l.smart_logger === 1,
    createdAt: l.created_at,
    trackUrl: `${baseUrl()}/l/${l.code}`,
    imageUrl: `${baseUrl()}/i/${l.code}`,
    dashboardUrl: `${baseUrl()}/d/${l.code}?token=${l.token}`,
  }));
  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  let body: { url?: string; label?: string; smartLogger?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const url = (body.url || "").trim();
  const label = (body.label || "").trim() || null;
  const smartLogger = body.smartLogger !== false;

  if (!url || !isValidHttpUrl(url)) {
    return NextResponse.json(
      { error: "Informe uma URL http(s) válida" },
      { status: 400 },
    );
  }

  const code = newCode();
  const token = newToken();
  createLink({
    code,
    token,
    targetUrl: url,
    label: label ?? undefined,
    smartLogger,
  });

  return NextResponse.json({
    code,
    token,
    targetUrl: url,
    label,
    smartLogger,
    trackUrl: `${baseUrl()}/l/${code}`,
    imageUrl: `${baseUrl()}/i/${code}`,
    dashboardUrl: `${baseUrl()}/d/${code}?token=${token}`,
  });
}
