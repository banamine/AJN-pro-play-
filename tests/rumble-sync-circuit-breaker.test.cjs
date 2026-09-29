const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CircuitBreaker, RumbleSyncEngine } = require("../dist/test-modules/rumble-sync-circuit-breaker.cjs");

const makeClock = (start = 0) => {
  let value = start;
  return { now: () => value, set: (next) => { value = next; }, advance: (ms) => { value += ms; } };
};

const channel = (id) => ({
  id,
  cleanTitle: id,
  type: "channel",
  canonicalUrl: `https://rumble.com/c/${id}`,
  feedUrl: `https://rumble.com/c/${id}/feed`,
  fallbackEmbedUrl: `https://rumble.com/embed/user/${id}`,
  overview: "",
  keyShows: [],
  isLive: true,
  currentVideo: null,
  lastSyncedAt: null,
  syncStatus: "idle",
  consecutiveFailures: 0,
});

const video = (id) => ({
  videoId: id,
  title: `Live ${id}`,
  embedUrl: `https://rumble.com/v/${id}`,
  publishDate: new Date(0).toISOString(),
  isLive: true,
  thumbnailUrl: "",
});

test("breaker stays closed below threshold", () => {
  const clock = makeClock();
  const breaker = new CircuitBreaker({ failureThreshold: 3, now: clock.now, random: () => 0.5, baseBackoffMs: 100 });
  breaker.recordFailure();
  breaker.recordFailure();
  assert.equal(breaker.getSnapshot().state, "closed");
  assert.equal(breaker.getSnapshot().consecutiveFailures, 2);
});

test("threshold opens circuit and schedules a probe", () => {
  const clock = makeClock();
  const breaker = new CircuitBreaker({ failureThreshold: 2, baseBackoffMs: 100, jitterRatio: 0, now: clock.now, random: () => 0.5 });
  breaker.recordFailure();
  const snapshot = breaker.recordFailure();
  assert.equal(snapshot.state, "open");
  assert.equal(snapshot.nextProbeAt, 100);
  assert.equal(breaker.canRequest().allowed, false);
  clock.set(200);
  const probe = breaker.canRequest();
  assert.equal(probe.allowed, true);
  assert.equal(probe.isProbe, true);
  assert.equal(breaker.canRequest().allowed, false);
});

test("half-open success closes and resets breaker", () => {
  const clock = makeClock();
  const breaker = new CircuitBreaker({ failureThreshold: 1, baseBackoffMs: 100, jitterRatio: 0, now: clock.now, random: () => 0.5 });
  breaker.recordFailure();
  clock.set(100);
  assert.equal(breaker.canRequest().isProbe, true);
  const snapshot = breaker.recordSuccess();
  assert.equal(snapshot.state, "closed");
  assert.equal(snapshot.consecutiveFailures, 0);
  assert.equal(snapshot.nextProbeAt, null);
});

test("half-open failure reopens with increased backoff exponent", () => {
  const clock = makeClock();
  const breaker = new CircuitBreaker({ failureThreshold: 1, baseBackoffMs: 100, jitterRatio: 0, now: clock.now, random: () => 0.5 });
  breaker.recordFailure();
  clock.set(100);
  breaker.canRequest();
  const snapshot = breaker.recordFailure();
  assert.equal(snapshot.state, "open");
  assert.equal(snapshot.backoffExponent, 1);
  assert.equal(snapshot.nextProbeAt, 300);
});

test("jitter is deterministic and bounded", () => {
  const clock = makeClock();
  const low = new CircuitBreaker({ failureThreshold: 1, baseBackoffMs: 100, jitterRatio: 0.2, now: clock.now, random: () => 0 });
  const high = new CircuitBreaker({ failureThreshold: 1, baseBackoffMs: 100, jitterRatio: 0.2, now: clock.now, random: () => 1 });
  assert.equal(low.recordFailure().nextProbeAt, 80);
  assert.equal(high.recordFailure().nextProbeAt, 120);
});

test("channel failures are isolated", async () => {
  const clock = makeClock();
  const engine = new RumbleSyncEngine([channel("a"), channel("b")], {
    failureThreshold: 1,
    baseBackoffMs: 100,
    jitterRatio: 0,
    now: clock.now,
    random: () => 0.5,
    fetchRss: async (url) => url.includes("/a/") ? { ok: false, status: 503, error: "a failed" } : { ok: true, feedUrl: url, videos: [video("b1")] },
  });
  const [a, b] = await engine.syncAll();
  assert.equal(a.state.syncStatus, "circuit_open");
  assert.equal(a.state.activeEmbedUrl, a.state.fallbackEmbedUrl);
  assert.equal(a.state.currentVideo, null);
  assert.equal(b.ok, true);
  assert.equal(b.state.syncStatus, "idle");
  assert.equal(b.state.currentVideo.videoId, "b1");
});

test("fallback is promoted on trip and normal metadata URL is restored on recovery", async () => {
  const clock = makeClock();
  let fail = true;
  const engine = new RumbleSyncEngine([channel("a")], {
    failureThreshold: 1,
    baseBackoffMs: 100,
    jitterRatio: 0,
    now: clock.now,
    random: () => 0.5,
    fetchRss: async (url) => fail
      ? { ok: false, status: 503, error: "temporary failure" }
      : { ok: true, feedUrl: url, videos: [video("recovered")] },
  });

  const failed = await engine.syncChannel("a");
  assert.equal(failed.state.syncStatus, "circuit_open");
  assert.equal(failed.state.activeEmbedUrl, failed.state.fallbackEmbedUrl);
  assert.equal(failed.state.currentVideo, null);

  clock.set(100);
  fail = false;
  const recovered = await engine.syncChannel("a");
  assert.equal(recovered.ok, true);
  assert.equal(recovered.state.syncStatus, "idle");
  assert.equal(recovered.state.activeEmbedUrl, "https://rumble.com/v/recovered");
  assert.equal(recovered.state.currentVideo.videoId, "recovered");
});

test("telemetry records fallback promotion", async () => {
  const clock = makeClock();
  const events = [];
  const engine = new RumbleSyncEngine([channel("a")], {
    failureThreshold: 1,
    baseBackoffMs: 100,
    jitterRatio: 0,
    now: clock.now,
    random: () => 0.5,
    onTelemetry: (event) => events.push(event),
    fetchRss: async () => ({ ok: false, status: 502, error: "offline" }),
  });
  await engine.syncChannel("a");
  assert.equal(events.some((event) => event.type === "fallback_promoted"), true);
});

test("unknown channel is rejected without affecting registered channels", async () => {
  const engine = new RumbleSyncEngine([channel("a")], {
    fetchRss: async () => ({ ok: true, feedUrl: "https://rumble.com/c/a/feed", videos: [video("a1")] }),
  });
  await assert.rejects(() => engine.syncChannel("missing"), /Unknown Rumble channel/);
  const result = await engine.syncChannel("a");
  assert.equal(result.ok, true);
});
