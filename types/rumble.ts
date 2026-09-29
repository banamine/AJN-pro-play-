export type RumbleChannelType = "channel" | "video_stream";

export type ChannelSyncStatus =
  | "idle"
  | "syncing"
  | "degraded"
  | "circuit_open";

export interface RumbleVideoMetadata {
  videoId: string;
  title: string;
  embedUrl: string;
  publishDate: string;
  isLive: boolean;
  thumbnailUrl: string;
}

export interface RumbleChannelContract {
  id: string;
  cleanTitle: string;
  type: RumbleChannelType;

  canonicalUrl: string;
  feedUrl?: string;
  fallbackEmbedUrl: string;

  overview: string;
  keyShows: string[];

  isLive: boolean;
  currentVideo?: RumbleVideoMetadata | null;

  lastSyncedAt: string | null;
  syncStatus: ChannelSyncStatus;
  consecutiveFailures: number;
}
