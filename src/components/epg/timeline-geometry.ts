import type { EpgProgram } from "../../../types/guide";

export interface TimelineWindow { windowStartEpoch: number; windowEndEpoch: number; }
export interface ProgramGeometry { leftPx: number; widthPx: number; effectiveStart: number; effectiveEnd: number; }

export function getVisiblePrograms(programs: EpgProgram[], window: TimelineWindow): EpgProgram[] {
  return programs.filter((program) => {
    const programEnd = program.endTime ?? Infinity;
    return program.startTime < window.windowEndEpoch && programEnd > window.windowStartEpoch;
  });
}

export function getProgramGeometry(program: EpgProgram, window: TimelineWindow, pixelsPerMs: number): ProgramGeometry {
  const effectiveStart = Math.max(program.startTime, window.windowStartEpoch);
  const effectiveEnd = Math.min(program.endTime ?? window.windowEndEpoch, window.windowEndEpoch);
  const durationMs = Math.max(0, effectiveEnd - effectiveStart);
  return { effectiveStart, effectiveEnd, widthPx: durationMs * pixelsPerMs, leftPx: (effectiveStart - window.windowStartEpoch) * pixelsPerMs };
}

export function getTimelineWidth(window: TimelineWindow, pixelsPerMs: number): number {
  return Math.max(0, window.windowEndEpoch - window.windowStartEpoch) * pixelsPerMs;
}
