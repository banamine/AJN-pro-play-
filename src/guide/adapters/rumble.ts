import type { EpgChannelSchedule, EpgProgram } from "../../../types/guide";
import type {
  RumbleChannelContract,
  RumbleVideoItem,
} from "../../../types/rumble";

/** Default duration for VOD items when no subsequent program exists (30 minutes in ms). */
const DEFAULT_VOD_DURATION_MS = 30 * 60 * 1000;

/**
 * Safely parses ISO 8601 or RFC 822 date strings into epoch milliseconds.
 * Falls back to injected now on invalid/NaN date input.
 */
function parsePublishDate(
  dateStr: string | undefined,
  fallbackEpoch: number,
): number {
  if (!dateStr) return fallbackEpoch;
  const parsed = Date.parse(dateStr);
  return Number.isNaN(parsed) ? fallbackEpoch : parsed;
}

/**
 * Synthesizes a deterministic fallback program when live stream data or feeds
 * are unavailable. The stable ID prevents virtualized UI key thrashing.
 */
function createFallbackProgram(
  state: RumbleChannelContract,
  now: number,
): EpgProgram {
  const startTime = state.lastSyncedAt
    ? parsePublishDate(state.lastSyncedAt, now)
    : now;

  return {
    id: `rumble-fallback-${state.id}`,
    channelId: state.id,
    title: `${state.cleanTitle || state.id} (Live Stream)`,
    description:
      state.overview || "Continuous broadcast via Rumble fallback embed.",
    startTime,
    endTime: null,
    type: "live_event",
    thumbnailUrl: state.currentVideo?.thumbnailUrl,
    sourceMetadata: {
      isFallback: true,
      syncStatus: state.syncStatus,
      fallbackEmbedUrl: state.fallbackEmbedUrl,
    },
  };
}

/**
 * Maps one Rumble video item to the normalized EPG program contract.
 */
function mapRumbleVideoToProgram(
  video: RumbleVideoItem,
  channelId: string,
  now: number,
): EpgProgram {
  const startTime = parsePublishDate(video.publishDate, now);

  return {
    id: video.id || video.videoId || `rumble-video-${startTime}`,
    channelId,
    title: video.title || "Untitled Broadcast",
    description: video.description,
    startTime,
    endTime: null,
    type: video.isLive ? "live_event" : "vod_block",
    thumbnailUrl: video.thumbnailUrl,
    sourceMetadata: {
      embedUrl: video.embedUrl,
      duration: video.duration,
    },
  };
}

/**
 * Transforms Rumble channel sync state into an immutable EPG schedule.
 * The input state is never mutated.
 */
export function adaptRumbleStateToEpgSchedule(
  state: RumbleChannelContract,
  now: number,
): EpgChannelSchedule {
  const isCircuitOpen = state.syncStatus === "circuit_open";
  const hasNoVideo =
    !state.currentVideo &&
    (!state.videos || state.videos.length === 0);

  if (isCircuitOpen || hasNoVideo) {
    return {
      channelId: state.id,
      lastUpdated: now,
      programs: [createFallbackProgram(state, now)],
    };
  }

  const rawItems: RumbleVideoItem[] = [];
  if (state.currentVideo) rawItems.push(state.currentVideo);
  if (Array.isArray(state.videos)) rawItems.push(...state.videos);

  const uniqueItemsMap = new Map<string, RumbleVideoItem>();
  for (const item of rawItems) {
    const key = item.id || item.videoId || item.embedUrl || item.publishDate;
    if (key && !uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, item);
    }
  }

  const mappedPrograms = Array.from(uniqueItemsMap.values())
    .map((video) => mapRumbleVideoToProgram(video, state.id, now))
    .sort((a, b) => a.startTime - b.startTime);

  const finalPrograms = mappedPrograms.map((program, index) => {
    if (program.type === "live_event") {
      return { ...program, endTime: null };
    }

    const nextProgram = mappedPrograms[index + 1];
    if (nextProgram) {
      return { ...program, endTime: nextProgram.startTime };
    }

    return {
      ...program,
      endTime: program.startTime + DEFAULT_VOD_DURATION_MS,
    };
  });

  return {
    channelId: state.id,
    lastUpdated: now,
    programs: finalPrograms,
  };
}
