import { NextResponse } from "next/server";
import { extractTranscript, hasApifyToken } from "@/lib/apify";

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

  let body: { url?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
    return NextResponse.json(
      { error: "Informe uma URL válida do YouTube." },
      { status: 400 },
    );
  }

  const language = body.language?.trim() || "pt";

  try {
    const transcript = await extractTranscript(url, language);
    return NextResponse.json({ transcript });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Falha ao extrair o texto do vídeo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
