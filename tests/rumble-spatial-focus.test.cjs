const assert = require("node:assert/strict");
const test = require("node:test");
const {
  moveMacroFocus,
  resolveEpgBoundary,
} = require("../dist/test-modules/rumble-spatial-focus.cjs");

test("macro focus moves between carousel, player, and EPG at vertical boundaries", () => {
  assert.equal(moveMacroFocus("carousel", "down"), "player");
  assert.equal(moveMacroFocus("player", "down"), "epg");
  assert.equal(moveMacroFocus("epg", "up"), "player");
  assert.equal(moveMacroFocus("player", "up"), "carousel");
});

test("macro focus stays in the current region for non-boundary movement", () => {
  assert.equal(moveMacroFocus("carousel", "left"), "carousel");
  assert.equal(moveMacroFocus("player", "right"), "player");
  assert.equal(moveMacroFocus("epg", "right"), "epg");
});

test("EPG boundary resolver reports the escaped edge", () => {
  assert.deepEqual(resolveEpgBoundary(0, 1, 4, 3, "up"), {
    region: "epg",
    direction: "up",
  });
  assert.deepEqual(resolveEpgBoundary(2, 2, 4, 3, "right"), {
    region: "epg",
    direction: "right",
  });
  assert.equal(resolveEpgBoundary(1, 1, 4, 3, "right"), null);
});
