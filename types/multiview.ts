export type TileId = "tile-0" | "tile-1" | "tile-2" | "tile-3";
export type CategoryId = "live_classic" | "news" | "vod" | "ajn";
export type MultiViewLayout = "2x2" | "2x1" | "1x1";
export type MultiViewSourceType = "hls" | "mp4" | "audio" | "iframe";

export interface MultiViewTileConfig {
  instanceId: TileId;
  category: CategoryId;
  channelId: string | null;
  enabled: boolean;
}

export interface MultiViewPattern {
  id: string;
  name: string;
  layout: MultiViewLayout;
  panels: MultiViewTileConfig[];
}

export interface MultiViewSource {
  channelId: string;
  sourceType: MultiViewSourceType;
  sourceUrl: string;
  hasVideoTrack: boolean | "unknown";
  unmanagedBandwidth?: boolean;
}

export interface MultiViewRuntimeState {
  activePatternId: string | null;
  focusedPanelId: TileId | null;
  activeAudioPanelId: TileId | null;
  focusContext: "GRID" | "QUICK_CHANGE_MENU" | "PATTERN_MENU";
  panels: MultiViewTileConfig[];
}

export interface MultiViewResourcePolicy {
  maxActiveDecoders: number;
  maxActiveMediaPipelines: number;
  maxConcurrentIframes: number;
  staggeredStartDelayMs: number;
  backgroundQualityPolicy: "capped" | "adaptive";
  maxRetryAttempts: number;
  defaultMaxActiveDecoders: number;
}

export interface TileResourcePolicy {
  priorityTier: 1 | 2 | 3;
  targetResolution: "1080p" | "480p" | "poster";
  staggerDelayMs: number;
  sourceType: MultiViewSourceType | null;
  admitted: boolean;
  presentation: "active" | "poster_standby";
  consumesDecoder: boolean;
  consumesMediaPipeline: boolean;
  consumesIframeSlot: boolean;
}

export interface AudioArbitrationState {
  activeAudioTileId: TileId | null;
  isAudioLocked: boolean;
}
