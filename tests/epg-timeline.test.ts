import assert from "node:assert/strict";
import test from "node:test";
import type { EpgProgram } from "../types/guide";
import { getProgramGeometry, getVisiblePrograms } from "../src/components/epg/timeline-geometry";

const window = { windowStartEpoch: 1_000, windowEndEpoch: 5_000 };
const base: EpgProgram = { id: "live", channelId: "channel", title: "Live", startTime: 2_000, endTime: null, type: "live_event" };

test("unbounded program is clamped to the visible window", () => {
  const geometry = getProgramGeometry(base, window, 1);
  assert.equal(geometry.effectiveStart, 2_000); assert.equal(geometry.effectiveEnd, 5_000); assert.equal(geometry.leftPx, 1_000); assert.equal(geometry.widthPx, 3_000); assert.ok(Number.isFinite(geometry.widthPx));
});
test("program beginning before the window is left-clamped", () => {
  const geometry = getProgramGeometry({ ...base, startTime: 500, endTime: 2_000 }, window, 2);
  assert.equal(geometry.effectiveStart, 1_000); assert.equal(geometry.effectiveEnd, 2_000); assert.equal(geometry.leftPx, 0); assert.equal(geometry.widthPx, 2_000);
});
test("horizontal windowing keeps only intersecting programs", () => {
  const programs = [
    { ...base, id: "before", startTime: 0, endTime: 999 },
    { ...base, id: "touches-start", startTime: 500, endTime: 1_000 },
    { ...base, id: "inside", startTime: 2_000, endTime: 3_000 },
    { ...base, id: "open", startTime: 4_000, endTime: null },
    { ...base, id: "after", startTime: 5_000, endTime: 6_000 },
  ];
  assert.deepEqual(getVisiblePrograms(programs, window).map((program) => program.id), ["inside", "open"]);
});
test("zero or reversed geometry never produces negative width", () => {
  const geometry = getProgramGeometry({ ...base, startTime: 6_000, endTime: 2_000 }, window, 1);
  assert.equal(geometry.widthPx, 0);
});
