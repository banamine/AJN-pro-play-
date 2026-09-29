import type {
  EpgChannelSchedule,
  EpgProgram,
  ScheduleProjection,
} from "../../types/guide";

/**
 * Generates a stable structural off-air program when no program is scheduled.
 *
 * The synthetic program is intentionally open-ended: it represents the absence
 * of an authoritative schedule rather than a real broadcast interval.
 */
export function createOffAirProgram(channelId: string, now: number): EpgProgram {
  return {
    id: `off-air-${channelId}`,
    channelId,
    title: "Off Air / Standby",
    description: "No active program schedule available.",
    startTime: now,
    endTime: null,
    type: "off_air",
  };
}

/**
 * Projects current, next, and upcoming programs at a UTC epoch-millisecond
 * timestamp. The source schedule is never mutated.
 */
export function projectChannelSchedule(
  schedule: EpgChannelSchedule | undefined,
  now: number,
  upcomingLimit: number = 3,
): ScheduleProjection {
  if (!schedule || schedule.programs.length === 0) {
    return {
      current: createOffAirProgram(schedule?.channelId ?? "unknown", now),
      next: null,
      upcoming: [],
    };
  }

  const limit = Math.max(0, Math.floor(upcomingLimit));
  const sorted = [...schedule.programs].sort(
    (a, b) => a.startTime - b.startTime,
  );

  let current: EpgProgram | null = null;
  let next: EpgProgram | null = null;
  const upcoming: EpgProgram[] = [];

  for (const program of sorted) {
    const hasStarted = program.startTime <= now;
    const hasEnded = program.endTime !== null && program.endTime <= now;

    if (hasStarted && !hasEnded) {
      // If schedules overlap, the most recently started program owns current.
      current = program;
      continue;
    }

    if (program.startTime > now) {
      if (!next) {
        next = program;
      } else if (upcoming.length < limit) {
        upcoming.push(program);
      }
    }
  }

  return {
    current:
      current ?? createOffAirProgram(schedule.channelId, now),
    next,
    upcoming,
  };
}
