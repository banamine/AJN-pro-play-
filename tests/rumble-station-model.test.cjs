const { test } = require("node:test");
const assert = require("node:assert/strict");

const model = require("../dist/test-modules/rumble-station-model.cjs");

function state(overrides = {}) {
  return {
    id: "alpha",
    cleanTitle: "Alpha",
    type: "channel",
    canonicalUrl: "https://rumble.com/c/alpha",
    feedUrl: "https://rumble.com/c/alpha/feed",
    fallbackEmbedUrl: "https://rumble.com/embed/user/alpha",
    activeEmbedUrl: "https://rumble.com/embed/v123/",
    overview: "Alpha overview",
    keyShows: ["Alpha Show"],
    isLive: true,
    currentVideo: {
      videoId: "v123",
      title: "Alpha Live",
      embedUrl: "https://rumble.com/embed/v123/",
      publishDate: "2026-09-29T12:00:00.000Z",
      isLive: true,
      thumbnailUrl: "https://rumble.com/thumb.jpg",
    },
    lastSyncedAt: "2026-09-29T12:00:00.000Z",
    syncStatus: "idle",
    consecutiveFailures: 0,
    circuit: {
      state: "closed",
      consecutiveFailures: 0,
      backoffExponent: 0,
      nextProbeAt: null,
      lastFailureAt: null,
      lastSuccessAt: null,
      probeInFlight: false,
    },
    generation: 1,
    lastSyncError: null,
    ...overrides,
  };
}

test("fallback state is derived from activeEmbedUrl without mutating canonical fallback", () => {
  const channel = state({
    activeEmbedUrl: "https://rumble.com/embed/user/alpha",
    currentVideo: null,
    syncStatus: "circuit_open",
  });

  assert.equal(model.isRumbleFallbackState(channel), true);
  assert.equal(channel.fallbackEmbedUrl, "https://rumble.com/embed/user/alpha");
});

test("dynamic metadata title is preferred when available", () => {
  assert.equal(model.getRumbleDisplayTitle(state()), "Alpha Live");
  assert.equal(
    model.getRumbleDisplayTitle(state({ currentVideo: null })),
    "Alpha",
  );
});

test("channels sort by clean title without mutating the source array", () => {
  const source = [
    state({ id: "z", cleanTitle: "Zulu" }),
    state({ id: "a", cleanTitle: "Alpha" }),
  ];
  const sorted = model.sortRumbleChannels(source);

  assert.deepEqual(
    sorted.map((channel) => channel.id),
    ["a", "z"],
  );
  assert.deepEqual(
    source.map((channel) => channel.id),
    ["z", "a"],
  );
});
