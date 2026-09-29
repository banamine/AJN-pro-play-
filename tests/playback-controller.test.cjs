const test = require("node:test");
const assert = require("node:assert/strict");
const { PlaybackController } = require("../dist/test-modules/playback-controller.cjs");

const EVENTS = {
  MANIFEST_PARSED: "manifestParsed",
  ERROR: "error",
};

function createVideo() {
  const listeners = new Map();
  return {
    paused: true,
    src: "",
    playCalls: 0,
    pauseCalls: 0,
    play() {
      this.playCalls++;
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.pauseCalls++;
      this.paused = true;
    },
    load() {},
    removeAttribute(name) {
      if (name === "src") this.src = "";
    },
    addEventListener(name, fn) {
      const current = listeners.get(name) || [];
      current.push(fn);
      listeners.set(name, current);
    },
    removeEventListener(name, fn) {
      const current = listeners.get(name) || [];
      listeners.set(name, current.filter((item) => item !== fn));
    },
    dispatch(name, payload) {
      for (const fn of listeners.get(name) || []) fn(payload);
    },
  };
}

function createHlsHarness() {
  const handlers = new Map();
  const calls = [];
  const instance = {
    loadSource(url) { calls.push(["loadSource", url]); },
    attachMedia() { calls.push(["attachMedia"]); },
    stopLoad() { calls.push(["stopLoad"]); },
    detachMedia() { calls.push(["detachMedia"]); },
    destroy() { calls.push(["destroy"]); },
    on(event, fn) { handlers.set(event, fn); },
  };
  return {
    instance,
    calls,
    emit(event, payload) {
      handlers.get(event)?.("event", payload);
    },
  };
}

test("source replacement tears down previous HLS before mounting the new source", () => {
  const video = createVideo();
  const first = createHlsHarness();
  const second = createHlsHarness();
  let factoryCalls = 0;

  const controller = new PlaybackController({
    video,
    hlsFactory: () => (++factoryCalls === 1 ? first.instance : second.instance),
    isHlsSupported: () => true,
    hlsEvents: EVENTS,
  });

  controller.load({ url: "https://a.example/one.m3u8", title: "One", kind: "hls" });
  controller.load({ url: "https://a.example/two.m3u8", title: "Two", kind: "hls" });

  assert.deepEqual(first.calls, [
    ["loadSource", "https://a.example/one.m3u8"],
    ["attachMedia"],
    ["stopLoad"],
    ["detachMedia"],
    ["destroy"],
  ]);
  assert.deepEqual(second.calls, [
    ["loadSource", "https://a.example/two.m3u8"],
    ["attachMedia"],
  ]);
  assert.equal(controller.getState().source.title, "Two");
});

test("stale HLS generation cannot update the active state", () => {
  const video = createVideo();
  const first = createHlsHarness();
  const second = createHlsHarness();
  let factoryCalls = 0;
  const states = [];

  const controller = new PlaybackController({
    video,
    hlsFactory: () => (++factoryCalls === 1 ? first.instance : second.instance),
    isHlsSupported: () => true,
    hlsEvents: EVENTS,
    onStateChange: (state) => states.push(state),
  });

  controller.load({ url: "https://a.example/one.m3u8", title: "One", kind: "hls" });
  controller.load({ url: "https://a.example/two.m3u8", title: "Two", kind: "hls" });
  first.emit(EVENTS.ERROR, { fatal: true, details: "stale" });

  assert.equal(controller.getState().source.title, "Two");
  assert.equal(controller.getState().error, null);
  assert.ok(states.some((state) => state.source?.title === "Two"));
});

test("fatal HLS error is surfaced for the active generation", () => {
  const video = createVideo();
  const harness = createHlsHarness();

  const controller = new PlaybackController({
    video,
    hlsFactory: () => harness.instance,
    isHlsSupported: () => true,
    hlsEvents: EVENTS,
  });

  controller.load({ url: "https://a.example/live.m3u8", title: "Live", kind: "hls" });
  harness.emit(EVENTS.ERROR, { fatal: true, details: "networkError" });

  assert.equal(controller.getState().status, "error");
  assert.equal(controller.getState().error, "HLS fatal error: networkError");
});

test("m3u8 source falls back to native playback when HLS is unsupported", () => {
  const video = createVideo();
  const controller = new PlaybackController({
    video,
    isHlsSupported: () => false,
  });

  controller.load({ url: "https://a.example/live.m3u8", title: "Fallback", kind: "hls" });

  assert.equal(video.src, "https://a.example/live.m3u8");
  assert.equal(controller.getState().source.kind, "hls");
});

test("native media path loads and reports paused when autoplay is rejected", async () => {
  const video = createVideo();
  video.play = () => {
    video.playCalls++;
    return Promise.reject(new Error("autoplay blocked"));
  };

  const controller = new PlaybackController({
    video,
    isHlsSupported: () => false,
  });

  controller.load({ url: "https://a.example/file.mp4", title: "File", kind: "native" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(video.src, "https://a.example/file.mp4");
  assert.equal(controller.getState().status, "paused");
});

test("destroy is idempotent at the engine boundary", () => {
  const video = createVideo();
  const controller = new PlaybackController({
    video,
    isHlsSupported: () => false,
  });

  controller.load({ url: "https://a.example/file.mp4", title: "File", kind: "native" });
  controller.destroy();
  controller.destroy();

  assert.equal(controller.getState().status, "idle");
  assert.equal(controller.getState().source, null);
});

test("HLS preservation hooks receive the active source and saved position", () => {
  const video = createVideo();
  const harness = createHlsHarness();
  let configuredSource = null;
  const controller = new PlaybackController({
    video,
    hlsFactory: () => harness.instance,
    isHlsSupported: () => true,
    hlsEvents: EVENTS,
    getSavedPosition: (url) => url.includes("resume") ? 42 : 0,
    hlsConfigFactory: (source) => {
      configuredSource = source;
      return { enableWorker: false };
    },
  });

  controller.load({ url: "https://a.example/resume.m3u8", title: "Resume", kind: "hls" });
  harness.emit(EVENTS.MANIFEST_PARSED, {});

  assert.equal(configuredSource.title, "Resume");
  assert.equal(video.currentTime, 42);
  assert.equal(video.playCalls, 1);
});

test("unrecoverable HLS errors hand off to the application fallback callback", () => {
  const video = createVideo();
  const harness = createHlsHarness();
  let fatalSource = null;
  let fatalMessage = null;
  const controller = new PlaybackController({
    video,
    hlsFactory: () => harness.instance,
    isHlsSupported: () => true,
    hlsEvents: EVENTS,
    onFatalError: (source, message) => {
      fatalSource = source;
      fatalMessage = message;
    },
  });

  controller.load({ url: "https://a.example/live.m3u8", title: "Live", kind: "hls" });
  harness.emit(EVENTS.ERROR, { fatal: true, type: "unrecoverable", details: "fatalStreamError" });

  assert.equal(fatalSource.title, "Live");
  assert.equal(fatalMessage, "HLS fatal error: fatalStreamError");
  assert.equal(controller.getState().status, "error");
});
