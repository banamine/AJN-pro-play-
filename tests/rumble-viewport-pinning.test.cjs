const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getPlayerViewportClassName,
  resolvePinnedState,
} = require("../dist/test-modules/rumble-viewport-pinning.cjs");

test("non-intersecting anchor enters pinned state", () => {
  assert.equal(resolvePinnedState({ isIntersecting: false }), true);
});

test("intersecting anchor exits pinned state", () => {
  assert.equal(resolvePinnedState({ isIntersecting: true }), false);
});

test("pinned presentation changes positioning without changing the base viewport contract", () => {
  const normal = getPlayerViewportClassName(false);
  const pinned = getPlayerViewportClassName(true);

  assert.match(normal, /relative/);
  assert.match(pinned, /fixed/);
  assert.match(pinned, /bottom-4/);
  assert.match(pinned, /right-4/);
  assert.match(pinned, /z-50/);
  assert.match(pinned, /w-80/);
});
