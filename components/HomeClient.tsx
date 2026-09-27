"use client";

import { useCallback, useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { VideoList } from "@/components/VideoList";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import type { TranscriptResult, YoutubeVideo } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "empty" | "error";

export function HomeClient({ configured }: { configured: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selected, setSelected] = useState<YoutubeVideo | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setStatus("loading");
    setErrorMessage("");
    setLastQuery(query);
    setSelected(null);
    setTranscript(null);
    setTranscriptError(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, maxResults: 8 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao buscar vídeos.");
      }
      const list = (data.videos ?? []) as YoutubeVideo[];
      setVideos(list);
      setStatus(list.length === 0 ? "empty" : "success");
    } catch (err) {
      setVideos([]);
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Erro inesperado na busca.",
      );
    }
  }, []);

  const handleSelect = useCallback(async (video: YoutubeVideo) => {
    setSelected(video);
    setTranscript(null);
    setTranscriptError(null);
    setExtractingId(video.id);

    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: video.url, language: "pt" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao extrair texto.");
      }
      const result = data.transcript as TranscriptResult;
      setTranscript({
        ...result,
        title: result.title || video.title,
      });
    } catch (err) {
      setTranscriptError(
        err instanceof Error ? err.message : "Falha ao extrair o texto.",
      );
    } finally {
      setExtractingId(null);
    }
  }, []);

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <header className="relative overflow-hidden pb-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(13,122,111,0.22),transparent_70%)]"
        />
        <p className="animate-rise text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
          YouTube → texto
        </p>
        <h1 className="animate-rise mt-3 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl">
          TextoTube
        </h1>
        <p className="animate-rise-delay mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Busque vídeos e extraia legendas ou transcrições em texto corrido —
          pronto para ler, copiar e reutilizar.
        </p>
        <div className="accent-line mt-6 h-0.5 w-40 bg-accent" aria-hidden />

        <SearchForm
          onSearch={handleSearch}
          loading={status === "loading"}
          disabled={!configured}
        />
      </header>

      {!configured ? (
        <div
          className="animate-rise border border-accent-hot/30 bg-paper-deep/60 p-5 text-sm text-ink-soft"
          role="alert"
        >
          <p className="font-semibold text-ink">Configure o token Apify</p>
          <p className="mt-2">
            Copie <code className="text-accent">.env.example</code> para{" "}
            <code className="text-accent">.env.local</code> e defina{" "}
            <code className="text-accent">APIFY_TOKEN</code>. Obtenha em{" "}
            <a
              className="underline decoration-accent underline-offset-2"
              href="https://console.apify.com/settings/integrations"
              target="_blank"
              rel="noopener noreferrer"
            >
              console.apify.com/settings/integrations
            </a>
            .
          </p>
        </div>
      ) : null}

      <main className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section aria-label="Resultados">
          {status === "idle" && configured ? (
            <p className="text-sm text-ink/50">
              Digite um termo e pressione Enter — ou cole a ideia do vídeo que
              você quer ler em texto.
            </p>
          ) : null}

          {status === "loading" ? (
            <div className="space-y-3" role="status" aria-live="polite">
              <div className="loading-bar h-1 w-full bg-ink/5" />
              <p className="text-sm text-ink-soft">
                Buscando vídeos para “{lastQuery}”…
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="border border-accent-hot/40 p-4 text-sm" role="alert">
              <p className="font-semibold text-ink">Erro na busca</p>
              <p className="mt-1 text-ink-soft">{errorMessage}</p>
            </div>
          ) : null}

          {status === "empty" ? (
            <p className="text-sm text-ink-soft">
              Sem resultados para “{lastQuery}”. Tente outro termo.
            </p>
          ) : null}

          {status === "success" ? (
            <>
              <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl text-ink">
                Resultados
                <span className="text-ink/45"> — {lastQuery}</span>
              </h2>
              <VideoList
                videos={videos}
                selectedId={selected?.id}
                extractingId={extractingId}
                onSelect={handleSelect}
              />
            </>
          ) : null}
        </section>

        <TranscriptPanel
          transcript={transcript}
          loading={Boolean(extractingId)}
          error={transcriptError}
          onClose={() => {
            setSelected(null);
            setTranscript(null);
            setTranscriptError(null);
          }}
        />
      </main>

      <footer className="mt-16 border-t border-ink/10 pt-6 text-xs text-ink/45">
        TextoTube usa Actors Apify (
        <a
          className="underline underline-offset-2 hover:text-accent"
          href="https://apify.com/streamers/youtube-scraper"
          target="_blank"
          rel="noopener noreferrer"
        >
          YouTube Scraper
        </a>{" "}
        + transcrição). Respeite os termos do YouTube e os direitos dos
        criadores.
      </footer>
    </div>
  );
}
