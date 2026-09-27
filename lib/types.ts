export type YoutubeVideo = {
  id: string;
  title: string;
  url: string;
  channelName: string;
  channelUrl?: string;
  duration?: string;
  viewCount?: number;
  date?: string;
  thumbnailUrl?: string;
  description?: string;
  hasSubtitles?: boolean;
};

export type TranscriptResult = {
  videoId: string;
  title?: string;
  url: string;
  language?: string;
  text: string;
  source: "subtitles" | "transcript" | "description";
};
