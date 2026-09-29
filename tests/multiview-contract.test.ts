import { applyPattern, calculateTileResourcePolicy, createInitialMultiViewState, moveGridFocus, moveMenuSelection, setAudioFocus } from "../src/multiview/contracts";
import type { MultiViewPattern } from "../types/multiview";
const pattern: MultiViewPattern = { id: "test", name: "Test Quartet", layout: "2x2", panels: [
  { instanceId: "tile-0", category: "live_classic", channelId: "a", enabled: true },
  { instanceId: "tile-1", category: "news", channelId: "b", enabled: true },
  { instanceId: "tile-2", category: "vod", channelId: "c", enabled: true },
  { instanceId: "tile-3", category: "ajn", channelId: "d", enabled: true },
] };
const state = createInitialMultiViewState(pattern);
if (state.focusedPanelId !== "tile-0" || state.activeAudioPanelId !== "tile-0") throw new Error("initial state invariant failed");
if (moveGridFocus("tile-0", "ArrowRight") !== "tile-1") throw new Error("right navigation failed");
if (moveGridFocus("tile-1", "ArrowDown") !== "tile-3") throw new Error("down navigation failed");
if (moveGridFocus("tile-3", "ArrowLeft") !== "tile-2") throw new Error("left navigation failed");
if (moveGridFocus("tile-2", "ArrowUp") !== "tile-0") throw new Error("up navigation failed");
if (moveMenuSelection(0, 3, "ArrowUp") !== 0) throw new Error("menu upper bound failed");
if (moveMenuSelection(2, 3, "ArrowDown") !== 2) throw new Error("menu lower bound failed");
const full = calculateTileResourcePolicy("tile-0", 0, "tile-0", { maxActiveDecoders: 4, staggeredStartDelayMs: 200, backgroundQualityPolicy: "capped", maxRetryAttempts: 2 });
if (full.priorityTier !== 1 || !full.admitted) throw new Error("focused admission failed");
const standby = calculateTileResourcePolicy("tile-3", 3, "tile-0", { maxActiveDecoders: 2, staggeredStartDelayMs: 200, backgroundQualityPolicy: "capped", maxRetryAttempts: 2 });
if (standby.priorityTier !== 3 || standby.admitted) throw new Error("standby policy failed");
const locked = setAudioFocus("tile-0", "tile-2", true);
if (locked.activeAudioTileId !== "tile-0") throw new Error("audio lock failed");
const forced = setAudioFocus("tile-0", "tile-2", true, true);
if (forced.activeAudioTileId !== "tile-2" || !forced.isAudioLocked) throw new Error("forced audio focus failed");
const applied = applyPattern(pattern);
if (applied.activePatternId !== "test" || applied.panels.length !== 4) throw new Error("pattern application failed");
console.log("MultiView contract tests passed");