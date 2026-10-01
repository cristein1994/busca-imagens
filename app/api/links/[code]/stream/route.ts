import { NextRequest } from "next/server";
import { countVisits, getLinkByCode, getVisits } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { code } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token") || "";
  let afterId = Number(req.nextUrl.searchParams.get("afterId") || "0");

  const link = getLinkByCode(code);
  if (!link || !token || token !== link.token) {
    return new Response("unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("hello", { total: countVisits(code), afterId });

      timer = setInterval(() => {
        try {
          const visits = getVisits(code, afterId);
          if (visits.length) {
            afterId = visits[visits.length - 1].id;
            send("visits", {
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
          } else {
            send("ping", { total: countVisits(code), at: Date.now() });
          }
        } catch {
          // keep stream alive
        }
      }, 1500);

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
