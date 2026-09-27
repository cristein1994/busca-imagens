import { NextResponse } from "next/server";
import { hasApifyToken, searchYoutubeVideos } from "@/lib/apify";

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!hasApifyToken()) {
    return NextResponse.json(
      {
        error:
          "APIFY_TOKEN não configurado. Copie .env.example para .env.local e defina o token.",
      },
      { status: 503 },
    );
  }

  let body: { query?: string; maxResults?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "Informe um termo de busca." },
      { status: 400 },
    );
  }

  const maxResults = Math.min(Math.max(body.maxResults ?? 8, 1), 15);

  try {
    const videos = await searchYoutubeVideos(query, maxResults);
    return NextResponse.json({ videos, query });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao buscar vídeos no YouTube.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
