import { NextRequest, NextResponse } from "next/server";
import { lookupIpDetails } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ip = (req.nextUrl.searchParams.get("ip") || "").trim();
  if (!ip) {
    return NextResponse.json({ error: "Informe ?ip=" }, { status: 400 });
  }
  const data = await lookupIpDetails(ip);
  return NextResponse.json(data);
}
