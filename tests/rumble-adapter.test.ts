import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptRumbleStateToEpgSchedule,
} from "../src/guide/adapters/rumble";

function makeState(
  overrides: Partial<{
    syncStatus: "idle" | "syncing" | "degraded" | "circuit_open";
    currentVideo: any;
    videos: any[];
    lastSyncedAt: string | null;
    cleanTitle: string;
    overview: string;
    fallbackEmbedUrl: string;
  }> = {},
): any {
  return {
    id: "test-channel",
    cleanTitle: "Test Channel",
    type: "channel",
    canonicalUrl: "https://rumble.com/c/test-channel",
    feedUrl: "https://rumble.com/c/test-channel/feed",
    fallbackEmbedUrl: "https://rumble.com/embed/c/test-channel",
    overview: "Test channel overview",
    keyShows: ["Test Show"],
    isLive: true,
    currentVideo: null,
    lastSyncedAt: null,
    syncStatus: "idle",
    consecutiveFailures: 0,
    activeEmbedUrl: "https://rumble.com/embed/c/test-channel",
    circuit: {
      state: "closed",
      consecutiveFailures: 0,
      backoffExponent: 0,
      nextProbeAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      probeInFlight: false,
    },
    generation: 0,
    lastSyncError: null,
    videos: [],
    ...overrides,
  };
}

const NOW = Date.parse("2026-09-29T16:00:00Z");

test("Circuit Breaker Open synthesizes one unbounded fallback program", () => {
  const schedule = adaptRumbleStateToEpgSchedule(
    makeState({ syncStatus: "circuit_open", currentVideo: null }),
    NOW,
  );

  assert.equal(schedule.programs.length, 1);
  assert.equal(schedule.programs[0].type, "live_event");
  assert.equal(schedule.programs[0].endTime, null);
  assert.equal(schedule.programs[0].sourceMetadata?.isFallback, true);
  assert.equal(schedule.programs[0].sourceMetadata?.syncStatus, "circuit_open");
});

test("Missing Current Video with empty feed synthesizes a fallback program", () => {
  const schedule = adaptRumbleStateToEpgSchedule(
    makeState({ currentVideo: null, videos: [] }),
    NOW,
  );

  assert.equal(schedule.programs.length, 1);
  assert.equal(schedule.programs[0].sourceMetadata?.isFallback, true);
  assert.equal(schedule.programs[0].channelId, "test-channel");
});

test("RFC 822 publish date parses to the expected epoch", () => {
  const schedule = adaptRumbleStateToEpgSchedule(
    makeState({
      currentVideo: {
        videoId: "rfc-822",
        title: "RFC Broadcast",
        embedUrl: "https://rumble.com/embed/rfc-822",
        publishDate: "Tue, 29 Sep 2026 15:00:00 GMT",
        isLive: false,
        thumbnailUrl: "",
      },
    }),
    NOW,
  );

  assert.equal(schedule.programs[0].startTime, 1790694000000);
});

test("Malformed publish date falls back to injected now", () => {
  const schedule = adaptRumbleStateToEpgSchedule(
    makeState({
      currentVideo: {
        videoId: "bad-date",
        title: "Malformed Date",
        embedUrl: "https://rumble.com/embed/bad-date",
        publishDate: "invalid-date-string",
        isLive: false,
        thumbnailUrl: "",
      },
    }),
    NOW,
  );

  assert.equal(schedule.programs[0].startTime, NOW);
  assert.equal(Number.isNaN(schedule.programs[0].startTime), false);
});

test("Out-of-order RSS items are returned in strict chronological order", () => {
  const schedule = adaptRumbleStateToEpgSchedule(
    makeState({
      currentVideo: null,
      videos: [
        {
          videoId: "newer",
          title: "Newer",
          embedUrl: "https://rumble.com/embed/newer",
          publishDate: "2026-09-29T15:00:00Z",
          isLive: false,
          thumbnailUrl: "",
        },
        {
          videoId: "older",
          title: "Older",
          embedUrl: "https://rumble.com/embed/older",
          publishDate: "2026-09-29T14:00:00Z",
          isLive: false,
          thumbnailUrl: "",
        },
      ],
    }),
    NOW,
  );

  assert.deepEqual(
    schedule.programs.map((program) => program.startTime),
    [
      Date.parse("2026-09-29T14:00:00Z"),
      Date.parse("2026-09-29T15:00:00Z"),
    ],
  );
});

test("Two consecutive VOD items use the succeeding program start as endTime", () => {
  const start = Date.parse("2026-09-29T14:00:00Z");
  const schedule = adaptRumbleStateToEpgSchedule(
    makeState({
      currentVideo: null,
      videos: [
        {
          videoId: "vod-2",
          title: "VOD 2",
          embedUrl: "https://rumble.com/embed/vod-2",
          publishDate: new Date(start + 60 * 60 * 1000).toISOString(),
          isLive: false,
          thumbnailUrl: "",
        },
        {
          videoId: "vod-1",
          title: "VOD 1",
          embedUrl: "https://rumble.com/embed/vod-1",
          publishDate: new Date(start).toISOString(),
          isLive: false,
          thumbnailUrl: "",
        },
      ],
    }),
    NOW,
  );

  assert.equal(schedule.programs[0].endTime, schedule.programs[1].startTime);
});

test("Terminal VOD item receives the default 30-minute duration", () => {
  const start = Date.parse("2026-09-29T14:00:00Z");
  const schedule = adaptRumbleStateToEpgSchedule(
    makeState({
      currentVideo: null,
      videos: [
        {
          videoId: "terminal-vod",
          title: "Terminal VOD",
          embedUrl: "https://rumble.com/embed/terminal-vod",
          publishDate: new Date(start).toISOString(),
          isLive: false,
          thumbnailUrl: "",
        },
      ],
    }),
    NOW,
  );

  assert.equal(schedule.programs[0].endTime, start + 30 * 60 * 1000);
});

test("Live stream remains explicitly unbounded", () => {
  const schedule = adaptRumbleStateToEpgSchedule(
    makeState({
      currentVideo: {
        videoId: "live",
        title: "Live",
        embedUrl: "https://rumble.com/embed/live",
        publishDate: "2026-09-29T15:00:00Z",
        isLive: true,
        thumbnailUrl: "",
      },
    }),
    NOW,
  );

  assert.equal(schedule.programs[0].type, "live_event");
  assert.equal(schedule.programs[0].endTime, null);
});

test("Frozen input state is not mutated", () => {
  const state = makeState({
    currentVideo: {
      videoId: "frozen",
      title: "Frozen",
      embedUrl: "https://rumble.com/embed/frozen",
      publishDate: "2026-09-29T15:00:00Z",
      isLive: false,
      thumbnailUrl: "",
    },
    videos: [],
  });
  Object.freeze(state);

  assert.doesNotThrow(() => adaptRumbleStateToEpgSchedule(state, NOW));
  assert.equal(state.currentVideo.videoId, "frozen");
  assert.deepEqual(state.videos, []);
});

test("Channel identity and adapter metadata are preserved", () => {
  const state = makeState({
    cleanTitle: "Custom Channel",
    overview: "Custom overview",
    fallbackEmbedUrl: "https://rumble.com/embed/custom",
  });

  const schedule = adaptRumbleStateToEpgSchedule(state, NOW);

  assert.equal(schedule.channelId, "test-channel");
  assert.equal(schedule.programs[0].title, "Custom Channel (Live Stream)");
  assert.equal(
    schedule.programs[0].sourceMetadata?.fallbackEmbedUrl,
    "https://rumble.com/embed/custom",
  );
  assert.equal(schedule.programs[0].sourceMetadata?.syncStatus, "idle");
});
