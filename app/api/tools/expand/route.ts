import { NextRequest, NextResponse } from "next/server";
import { isValidHttpUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = (req.nextUrl.searchParams.get("url") || "").trim();
  if (!url || !isValidHttpUrl(url)) {
    return NextResponse.json({ error: "URL http(s) inválida" }, { status: 400 });
  }

  const hops: { url: string; status: number | null }[] = [];
  let current = url;

  for (let i = 0; i < 8; i++) {
    try {
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "PULSE-Expander/1.0" },
      });
      hops.push({ url: current, status: res.status });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) break;
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    } catch {
      hops.push({ url: current, status: null });
      break;
    }
  }

  return NextResponse.json({
    input: url,
    final: hops[hops.length - 1]?.url || url,
    hops,
  });
}
