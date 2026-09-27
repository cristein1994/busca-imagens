import { ApifyClient } from "apify-client";
import type { TranscriptResult, YoutubeVideo } from "./types";

const SEARCH_ACTOR = "streamers/youtube-scraper";
const TRANSCRIPT_ACTOR = "starvibe/youtube-video-transcript";

export function hasApifyToken(): boolean {
  return Boolean(process.env.APIFY_TOKEN?.trim());
}

function client(): ApifyClient {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "APIFY_TOKEN não configurado. Defina em .env.local (veja .env.example).",
    );
  }
  return new ApifyClient({ token });
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function pickThumbnail(item: Record<string, unknown>): string | undefined {
  const thumbnails = item.thumbnailUrl ?? item.thumbnails;
  if (typeof thumbnails === "string") return thumbnails;
  if (Array.isArray(thumbnails) && thumbnails.length > 0) {
    const last = thumbnails[thumbnails.length - 1];
    if (typeof last === "string") return last;
    if (last && typeof last === "object" && "url" in last) {
      return asString((last as { url?: unknown }).url);
    }
  }
  const id = asString(item.id);
  if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return undefined;
}

function mapVideo(item: Record<string, unknown>): YoutubeVideo | null {
  const url = asString(item.url) ?? asString(item.videoUrl);
  const title = asString(item.title);
  if (!url || !title) return null;

  const id =
    asString(item.id) ??
    asString(item.videoId) ??
    url.match(/[?&]v=([^&]+)/)?.[1] ??
    url;

  return {
    id,
    title,
    url,
    channelName:
      asString(item.channelName) ??
      asString(item.channelTitle) ??
      asString(item.channel) ??
      "Canal desconhecido",
    channelUrl: asString(item.channelUrl) ?? asString(item.ownerChannelUrl),
    duration: asString(item.duration) ?? asString(item.length),
    viewCount: asNumber(item.viewCount) ?? asNumber(item.views),
    date: asString(item.date) ?? asString(item.uploadDate),
    thumbnailUrl: pickThumbnail(item),
    description: asString(item.text) ?? asString(item.description),
    hasSubtitles: Boolean(item.subtitles ?? item.hasSubtitles),
  };
}

export async function searchYoutubeVideos(
  query: string,
  maxResults = 8,
): Promise<YoutubeVideo[]> {
  const run = await client().actor(SEARCH_ACTOR).call(
    {
      searchQueries: [query],
      maxResults,
      maxResultsShorts: 0,
      maxResultStreams: 0,
      transcriptionAndSubtitle: "NONE",
    },
    { waitSecs: 120 },
  );

  const { items } = await client()
    .dataset(run.defaultDatasetId!)
    .listItems({ limit: maxResults });

  return items
    .map((item) => mapVideo(item as Record<string, unknown>))
    .filter((v): v is YoutubeVideo => v !== null);
}

function extractPlaintextFromSubtitles(item: Record<string, unknown>): string | undefined {
  const subtitles = item.subtitles;
  if (!Array.isArray(subtitles)) return undefined;

  const chunks: string[] = [];
  for (const sub of subtitles) {
    if (!sub || typeof sub !== "object") continue;
    const record = sub as Record<string, unknown>;
    const plaintext = asString(record.plaintext);
    if (plaintext) chunks.push(plaintext);
  }
  return chunks.length ? chunks.join("\n\n") : undefined;
}

export async function extractTranscript(
  url: string,
  language = "pt",
): Promise<TranscriptResult> {
  // Prefer cheap dedicated transcript actor first
  try {
    const run = await client().actor(TRANSCRIPT_ACTOR).call(
      {
        youtube_url: url,
        language,
        include_transcript_text: true,
      },
      { waitSecs: 90 },
    );

    const { items } = await client()
      .dataset(run.defaultDatasetId!)
      .listItems({ limit: 1 });

    const item = (items[0] ?? {}) as Record<string, unknown>;
    const text =
      asString(item.transcript_text) ??
      asString(item.transcript) ??
      asString(item.text) ??
      (Array.isArray(item.transcript)
        ? item.transcript
            .map((row) =>
              row && typeof row === "object"
                ? asString((row as { text?: unknown }).text)
                : undefined,
            )
            .filter(Boolean)
            .join(" ")
        : undefined);

    if (text) {
      return {
        videoId:
          asString(item.video_id) ??
          url.match(/[?&]v=([^&]+)/)?.[1] ??
          url,
        title: asString(item.title),
        url,
        language: asString(item.language) ?? language,
        text,
        source: "transcript",
      };
    }
  } catch {
    // Fall through to official scraper with captions
  }

  const run = await client().actor(SEARCH_ACTOR).call(
    {
      startUrls: [{ url }],
      maxResults: 1,
      transcriptionAndSubtitle: "ALWAYS_SUBTITLES",
      subtitlesLanguage: language === "pt" ? "pt" : language,
      subtitlesFormat: "plaintext",
      preferAutoGeneratedSubtitles: true,
    },
    { waitSecs: 120 },
  );

  const { items } = await client()
    .dataset(run.defaultDatasetId!)
    .listItems({ limit: 1 });

  const item = (items[0] ?? {}) as Record<string, unknown>;
  const fromSubs = extractPlaintextFromSubtitles(item);
  const description = asString(item.text) ?? asString(item.description);

  if (fromSubs) {
    return {
      videoId: asString(item.id) ?? url.match(/[?&]v=([^&]+)/)?.[1] ?? url,
      title: asString(item.title),
      url,
      language,
      text: fromSubs,
      source: "subtitles",
    };
  }

  if (description) {
    return {
      videoId: asString(item.id) ?? url.match(/[?&]v=([^&]+)/)?.[1] ?? url,
      title: asString(item.title),
      url,
      language,
      text: description,
      source: "description",
    };
  }

  throw new Error(
    "Não foi possível extrair legendas/transcrição para este vídeo.",
  );
}
