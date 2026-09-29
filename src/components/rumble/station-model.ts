import type { RumbleSyncChannelState } from "../../rumble/sync-circuit-breaker.ts";

export function getRumbleStatusLabel(
  status: RumbleSyncChannelState["syncStatus"],
): string {
  switch (status) {
    case "syncing":
      return "SYNCING";
    case "degraded":
      return "DEGRADED";
    case "circuit_open":
      return "FALLBACK";
    default:
      return "LIVE";
  }
}

export function isRumbleFallbackState(state: RumbleSyncChannelState): boolean {
  return state.activeEmbedUrl === state.fallbackEmbedUrl;
}

export function getRumbleDisplayTitle(state: RumbleSyncChannelState): string {
  return state.currentVideo?.title || state.cleanTitle;
}

export function sortRumbleChannels(
  channels: RumbleSyncChannelState[],
): RumbleSyncChannelState[] {
  return [...channels].sort((a, b) => a.cleanTitle.localeCompare(b.cleanTitle));
}
