"use client";

import type { YoutubeVideo } from "@/lib/types";

type Props = {
  videos: YoutubeVideo[];
  selectedId?: string;
  extractingId?: string | null;
  onSelect: (video: YoutubeVideo) => void;
};

function formatViews(n?: number) {
  if (n == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function VideoList({
  videos,
  selectedId,
  extractingId,
  onSelect,
}: Props) {
  return (
    <ul className="divide-y divide-ink/10">
      {videos.map((video, index) => {
        const active = video.id === selectedId;
        const busy = extractingId === video.id;
        return (
          <li
            key={video.id}
            className="animate-rise"
            style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
          >
            <button
              type="button"
              onClick={() => onSelect(video)}
              disabled={Boolean(extractingId)}
              className={`group flex w-full gap-4 py-5 text-left transition disabled:cursor-wait ${
                active ? "opacity-100" : "opacity-90 hover:opacity-100"
              }`}
            >
              <div className="relative h-20 w-32 shrink-0 overflow-hidden bg-ink/10 sm:h-24 sm:w-40">
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                ) : null}
                {video.duration ? (
                  <span className="absolute bottom-1 right-1 bg-ink/85 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-paper">
                    {video.duration}
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug text-ink sm:text-xl">
                  {video.title}
                </h3>
                <p className="mt-1 text-sm text-ink-soft/80">
                  {video.channelName}
                  {formatViews(video.viewCount)
                    ? ` · ${formatViews(video.viewCount)} views`
                    : null}
                  {video.date ? ` · ${video.date}` : null}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                  {busy
                    ? "Extraindo texto…"
                    : active
                      ? "Texto aberto"
                      : "Extrair texto"}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
