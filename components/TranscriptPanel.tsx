"use client";

import { useEffect, useState } from "react";
import type { TranscriptResult } from "@/lib/types";

type Props = {
  transcript: TranscriptResult | null;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
};

const sourceLabel: Record<TranscriptResult["source"], string> = {
  transcript: "Transcrição",
  subtitles: "Legendas",
  description: "Descrição (sem legendas)",
};

export function TranscriptPanel({
  transcript,
  loading,
  error,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [transcript?.videoId, transcript?.text]);

  async function copyText() {
    if (!transcript?.text) return;
    await navigator.clipboard.writeText(transcript.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!loading && !transcript && !error) return null;

  return (
    <aside className="animate-rise sticky top-6 flex max-h-[min(80vh,760px)] flex-col border-l-2 border-accent/40 bg-paper/70 p-5 backdrop-blur-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Conteúdo em texto
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-tight text-ink">
            {loading
              ? "Extraindo…"
              : transcript?.title || "Transcrição do vídeo"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-sm text-ink/55 transition hover:text-ink"
          aria-label="Fechar painel"
        >
          Fechar
        </button>
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-live="polite">
          <div className="loading-bar h-1 w-full rounded-full bg-ink/5" />
          <p className="text-sm text-ink-soft">
            Buscando legendas e transcrição em português…
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-accent-hot" role="alert">
          {error}
        </p>
      ) : null}

      {transcript && !loading ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink/55">
            <span>{sourceLabel[transcript.source]}</span>
            {transcript.language ? <span>· {transcript.language}</span> : null}
            <a
              href={transcript.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-accent/40 underline-offset-4 hover:text-accent"
            >
              Abrir no YouTube
            </a>
            <button
              type="button"
              onClick={copyText}
              className="ml-auto bg-ink px-3 py-1.5 font-semibold tracking-wide text-paper transition hover:bg-accent"
            >
              {copied ? "Copiado" : "Copiar texto"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
              {transcript.text}
            </p>
          </div>
        </>
      ) : null}
    </aside>
  );
}
