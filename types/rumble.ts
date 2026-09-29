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

/**
 * Feed items consumed by the pure Rumble -> Guide adapter.
 * The optional fields preserve compatibility with the existing RSS metadata
 * contract while allowing adapter-level duration/description data when present.
 */
export type RumbleVideoItem = RumbleVideoMetadata & {
  id?: string;
  description?: string;
  duration?: number | null;
};

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
  videos?: RumbleVideoItem[];

  lastSyncedAt: string | null;
  syncStatus: ChannelSyncStatus;
  consecutiveFailures: number;
}
