export type ProgramType = "live_event" | "vod_block" | "off_air";

export interface EpgProgram {
  /** Unique program identifier. */
  id: string;
  /** Parent channel identity link. */
  channelId: string;
  /** Clean show or broadcast title. */
  title: string;
  /** Detailed show synopsis. */
  description?: string;
  /** UTC Unix epoch timestamp in milliseconds. */
  startTime: number;
  /** UTC Unix epoch timestamp in milliseconds; null denotes ongoing/unbounded live broadcast. */
  endTime: number | null;
  /** Classification type. */
  type: ProgramType;
  /** Optional visual representation. */
  thumbnailUrl?: string;
  /** Original feed/source metadata payload. */
  sourceMetadata?: Record<string, unknown>;
}

export interface EpgChannelSchedule {
  channelId: string;
  programs: EpgProgram[];
  /** UTC Unix epoch timestamp in milliseconds. */
  lastUpdated: number;
}

export interface ScheduleProjection {
  /** Always structural: an active program or explicit off-air state. */
  current: EpgProgram;
  next: EpgProgram | null;
  upcoming: EpgProgram[];
}

export interface TimeProvider {
  /** Injected UTC epoch-millisecond clock for deterministic assertions. */
  now(): number;
}
