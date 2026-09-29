import type { RumbleChannelContract } from "../types/rumble";

export const RUMBLE_SEED_CHANNELS: RumbleChannelContract[] = [
  {
    id: "real-americas-voice",
    cleanTitle: "Real America's Voice",
    type: "channel",
    canonicalUrl: "https://rumble.com/user/RealAmericasVoice",
    feedUrl: "https://rumble.com/c/RealAmericasVoice/feed",
    fallbackEmbedUrl: "https://rumble.com/embed/user/RealAmericasVoice",
    overview:
      "A conservative news and opinion network featuring live news broadcasts, commentary, and investigative reports.",
    keyShows: [
      "Steve Bannon's War Room",
      "The Water Cooler",
      "Human Events Daily",
      "The American Sunrise Show",
    ],
    isLive: true,
    lastSyncedAt: null,
    syncStatus: "idle",
    consecutiveFailures: 0,
  },
  {
    id: "alex-jones-show-live",
    cleanTitle: "The Alex Jones Show Live",
    type: "channel",
    canonicalUrl: "https://rumble.com/c/TheAlexJonesShowLive",
    feedUrl: "https://rumble.com/c/TheAlexJonesShowLive/feed",
    fallbackEmbedUrl: "https://rumble.com/embed/c/TheAlexJonesShowLive",
    overview:
      "Flagship broadcast hosted by Alex Jones covering alternative commentary, current events, and geopolitical analysis.",
    keyShows: ["The Alex Jones Show"],
    isLive: true,
    lastSyncedAt: null,
    syncStatus: "idle",
    consecutiveFailures: 0,
  },
  {
    id: "rt-news-247",
    cleanTitle: "RT News (Livestream 24/7)",
    type: "video_stream",
    canonicalUrl: "https://rumble.com/v35waq4-rt-news-livestream-247.html",
    fallbackEmbedUrl: "https://rumble.com/embed/v33ad4k/?pub=4",
    overview:
      "24/7 continuous news coverage from RT, delivering international news updates and geopolitical reporting.",
    keyShows: ["RT News Live Broadcast"],
    isLive: true,
    lastSyncedAt: null,
    syncStatus: "idle",
    consecutiveFailures: 0,
  },
];
