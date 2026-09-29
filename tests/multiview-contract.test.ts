import { applyPattern, calculateTileResourcePolicy, createInitialMultiViewState, moveGridFocus, moveMenuSelection, setAudioFocus } from "../src/multiview/contracts";
import { evaluateAdmission } from "../src/multiview/admission";
import type { MultiViewPattern, MultiViewSource } from "../types/multiview";

const pattern: MultiViewPattern = { id: "test", name: "Test Quartet", layout: "2x2", panels: [
  { instanceId: "tile-0", category: "live_classic", channelId: "a", enabled: true },
  { instanceId: "tile-1", category: "news", channelId: "b", enabled: true },
  { instanceId: "tile-2", category: "vod", channelId: "c", enabled: true },
  { instanceId: "tile-3", category: "ajn", channelId: "d", enabled: true },
] };

const sources: MultiViewSource[] = [
  { channelId: "a", sourceType: "hls", sourceUrl: "https://example.test/a.m3u8", hasVideoTrack: true },
  { channelId: "b", sourceType: "mp4", sourceUrl: "https://example.test/b.mp4", hasVideoTrack: true },
  { channelId: "c", sourceType: "audio", sourceUrl: "https://example.test/c.m3u8", hasVideoTrack: false },
  { channelId: "d", sourceType: "iframe", sourceUrl: "https://example.test/d", hasVideoTrack: true },
];

const state = createInitialMultiViewState(pattern);
if (state.focusedPanelId !== "tile-0" || state.activeAudioPanelId !== "tile-0") throw new Error("initial state invariant failed");
if (moveGridFocus("tile-0", "ArrowRight") !== "tile-1") throw new Error("right navigation failed");
if (moveGridFocus("tile-1", "ArrowDown") !== "tile-3") throw new Error("down navigation failed");
if (moveGridFocus("tile-3", "ArrowLeft") !== "tile-2") throw new Error("left navigation failed");
if (moveGridFocus("tile-2", "ArrowUp") !== "tile-0") throw new Error("up navigation failed");
if (moveMenuSelection(0, 3, "ArrowUp") !== 0) throw new Error("menu upper bound failed");
if (moveMenuSelection(2, 3, "ArrowDown") !== 2) throw new Error("menu lower bound failed");

const admission = evaluateAdmission(pattern.panels, sources, "tile-3", {
  maxActiveDecoders: 2, maxActiveMediaPipelines: 3, maxConcurrentIframes: 1,
  staggeredStartDelayMs: 200, backgroundQualityPolicy: "capped", maxRetryAttempts: 2, defaultMaxActiveDecoders: 2,
});
const focused = admission[3];
if (focused.priorityTier !== 1 || !focused.admitted || focused.sourceType !== "iframe") throw new Error("focused tile reservation failed");
if (admission[0].admitted && admission[1].admitted) throw new Error("decoder budget over-admitted");
if (!admission[2].admitted || admission[2].consumesDecoder) throw new Error("audio-only discount failed");

const emptyPattern = { ...pattern, panels: pattern.panels.map((panel, index) => index === 0 ? { ...panel, channelId: null } : panel) };
const emptyPolicies = evaluateAdmission(emptyPattern.panels, sources, "tile-1", {
  maxActiveDecoders: 2, maxActiveMediaPipelines: 3, maxConcurrentIframes: 1,
  staggeredStartDelayMs: 200, backgroundQualityPolicy: "capped", maxRetryAttempts: 2, defaultMaxActiveDecoders: 2,
});
if (emptyPolicies[0].admitted || emptyPolicies[0].consumesDecoder || emptyPolicies[0].consumesMediaPipeline) throw new Error("empty tile consumed resources");

const unknown = evaluateAdmission([{ ...pattern.panels[0] }], [{ ...sources[0], hasVideoTrack: "unknown" }], "tile-0", {
  maxActiveDecoders: 1, maxActiveMediaPipelines: 1, maxConcurrentIframes: 1,
  staggeredStartDelayMs: 200, backgroundQualityPolicy: "capped", maxRetryAttempts: 2, defaultMaxActiveDecoders: 2,
})[0];
if (!unknown.admitted || !unknown.consumesDecoder) throw new Error("unknown video track was not conservative");

const iframeLimited = evaluateAdmission(pattern.panels, sources.map((source) => source.sourceType === "iframe" ? { ...source, unmanagedBandwidth: true } : source), "tile-3", {
  maxActiveDecoders: 4, maxActiveMediaPipelines: 4, maxConcurrentIframes: 1,
  staggeredStartDelayMs: 200, backgroundQualityPolicy: "capped", maxRetryAttempts: 2, defaultMaxActiveDecoders: 2,
})[3];
if (iframeLimited.admitted) throw new Error("unmanaged iframe was admitted");

const applied = applyPattern(pattern);
if (applied.activePatternId !== "test" || applied.panels.length !== 4) throw new Error("pattern application failed");

const locked = setAudioFocus("tile-0", "tile-2", true);
if (locked.activeAudioTileId !== "tile-0") throw new Error("audio lock failed");
const forced = setAudioFocus("tile-0", "tile-2", true, true);
if (forced.activeAudioTileId !== "tile-2" || !forced.isAudioLocked) throw new Error("forced audio focus failed");

console.log("MultiView contract tests passed");