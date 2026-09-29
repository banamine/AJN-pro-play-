import assert from "node:assert/strict";
import test from "node:test";
import {
  createOffAirProgram,
  projectChannelSchedule,
} from "../src/guide/projection";
import type {
  EpgChannelSchedule,
  EpgProgram,
  TimeProvider,
} from "../types/guide";

const channelId = "rumble-test-channel";

function program(
  id: string,
  startTime: number,
  endTime: number | null,
  type: EpgProgram["type"] = "live_event",
): EpgProgram {
  return {
    id,
    channelId,
    title: id,
    startTime,
    endTime,
    type,
  };
}

function schedule(programs: EpgProgram[]): EpgChannelSchedule {
  return {
    channelId,
    programs,
    lastUpdated: 1_000,
  };
}

test("unbounded live stream remains current after its start", () => {
  const live = program("live", 1_000, null);
  const clock: TimeProvider = { now: () => 5_000 };

  const projection = projectChannelSchedule(schedule([live]), clock.now());

  assert.equal(projection.current.id, "live");
  assert.equal(projection.current.endTime, null);
  assert.equal(projection.next, null);
});

test("bounded program transitions to the next program at its end", () => {
  const first = program("first", 1_000, 2_000);
  const second = program("second", 2_000, 3_000);

  const before = projectChannelSchedule(schedule([first, second]), 1_999);
  assert.equal(before.current.id, "first");
  assert.equal(before.next?.id, "second");

  const atBoundary = projectChannelSchedule(schedule([first, second]), 2_000);
  assert.equal(atBoundary.current.id, "second");
  assert.equal(atBoundary.next, null);
});

test("empty schedule returns explicit off-air current state", () => {
  const projection = projectChannelSchedule(
    { channelId, programs: [], lastUpdated: 1_000 },
    5_000,
  );

  assert.equal(projection.current.type, "off_air");
  assert.equal(projection.current.channelId, channelId);
  assert.equal(projection.current.startTime, 5_000);
  assert.equal(projection.current.endTime, null);
  assert.equal(projection.next, null);
  assert.deepEqual(projection.upcoming, []);
});

test("undefined schedule returns safe unknown off-air state", () => {
  const projection = projectChannelSchedule(undefined, 7_500);

  assert.equal(projection.current.type, "off_air");
  assert.equal(projection.current.channelId, "unknown");
  assert.equal(projection.current.id, "off-air-unknown");
});

test("injected epoch clock makes transition assertions deterministic", () => {
  let now = 1_500;
  const clock: TimeProvider = { now: () => now };
  const first = program("first", 1_000, 2_000);
  const second = program("second", 2_000, null);
  const source = schedule([second, first]);

  assert.equal(projectChannelSchedule(source, clock.now()).current.id, "first");

  now = 2_000;
  assert.equal(projectChannelSchedule(source, clock.now()).current.id, "second");

  now = 9_000;
  assert.equal(projectChannelSchedule(source, clock.now()).current.id, "second");
});

test("source program order is preserved while projection sorts a copy", () => {
  const second = program("second", 2_000, 3_000);
  const first = program("first", 1_000, 2_000);
  const source = schedule([second, first]);

  const projection = projectChannelSchedule(source, 1_500, 1);

  assert.equal(projection.current.id, "first");
  assert.equal(projection.next?.id, "second");
  assert.deepEqual(source.programs.map((item) => item.id), ["second", "first"]);
});

test("upcoming limit is deterministic", () => {
  const programs = [
    program("p1", 1_000, 2_000),
    program("p2", 2_000, 3_000),
    program("p3", 3_000, 4_000),
    program("p4", 4_000, 5_000),
    program("p5", 5_000, 6_000),
  ];

  const projection = projectChannelSchedule(schedule(programs), 1_500, 2);

  assert.equal(projection.current.id, "p1");
  assert.equal(projection.next?.id, "p2");
  assert.deepEqual(projection.upcoming.map((item) => item.id), ["p3", "p4"]);
});

test("off-air builder produces the normalized fallback type", () => {
  const fallback = createOffAirProgram(channelId, 12_345);

  assert.deepEqual(
    {
      id: fallback.id,
      channelId: fallback.channelId,
      title: fallback.title,
      startTime: fallback.startTime,
      endTime: fallback.endTime,
      type: fallback.type,
    },
    {
      id: "off-air-rumble-test-channel",
      channelId,
      title: "Off Air / Standby",
      startTime: 12_345,
      endTime: null,
      type: "off_air",
    },
  );
});
