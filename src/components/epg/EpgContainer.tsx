import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { EpgChannelSchedule, TimeProvider } from "../../../types/guide";
import { EpgChannelRow, type EpgProgramSelectEvent } from "./EpgChannelRow";
import { EpgNowIndicator } from "./EpgNowIndicator";
import { EpgTimelineHeader } from "./EpgTimelineHeader";
import { getTimelineWidth, type TimelineWindow } from "./timeline-geometry";

export interface EpgChannel {
  id: string;
  title?: string;
  schedule: EpgChannelSchedule;
}

export interface EpgFocusCoordinate {
  channelId: string;
  programId: string;
}

export interface EpgContainerProps {
  channels: EpgChannel[];
  windowStartEpoch: number;
  windowEndEpoch: number;
  timeProvider: TimeProvider;
  onSelectProgram: (event: EpgProgramSelectEvent) => void;
  onSelectChannel?: (channelId: string) => void;
  activeChannelId?: string | null;
  isFocusRegionActive?: boolean;
  onFocusBoundary?: (direction: "up" | "down" | "left" | "right") => void;
  pixelsPerMs?: number;
  rowHeight?: number;
  overscanRows?: number;
}

const DEFAULT_PIXELS_PER_MINUTE = 3;
const DEFAULT_ROW_HEIGHT = 64;
const DEFAULT_OVERSCAN_ROWS = 4;
const CHANNEL_LABEL_WIDTH = 160;

function firstProgramCoordinate(
  channels: EpgChannel[],
): EpgFocusCoordinate | null {
  for (const channel of channels) {
    const program = channel.schedule.programs[0];
    if (program) {
      return { channelId: channel.id, programId: program.id };
    }
  }
  return null;
}

export function EpgContainer({
  channels,
  windowStartEpoch,
  windowEndEpoch,
  timeProvider,
  onSelectProgram,
  onSelectChannel,
  activeChannelId = null,
  isFocusRegionActive = false,
  onFocusBoundary,
  pixelsPerMs = DEFAULT_PIXELS_PER_MINUTE / 60_000,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscanRows = DEFAULT_OVERSCAN_ROWS,
}: EpgContainerProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [focusedCoordinate, setFocusedCoordinate] =
    useState<EpgFocusCoordinate | null>(() => firstProgramCoordinate(channels));
  const horizontalScrollRef = useRef<HTMLDivElement | null>(null);
  const verticalScrollRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const pendingFocusRef = useRef<EpgFocusCoordinate | null>(null);

  const window: TimelineWindow = useMemo(
    () => ({ windowStartEpoch, windowEndEpoch }),
    [windowStartEpoch, windowEndEpoch],
  );

  const visibleProgramsByChannel = useMemo(
    () =>
      channels.map((channel) => ({
        channelId: channel.id,
        programs: channel.schedule.programs.filter((program) => {
          const programEnd = program.endTime ?? Infinity;
          return (
            program.startTime < windowEndEpoch &&
            programEnd > windowStartEpoch
          );
        }),
      })),
    [channels, windowEndEpoch, windowStartEpoch],
  );

  const viewportHeight = Math.min(
    480,
    Math.max(rowHeight, channels.length * rowHeight),
  );
  const firstVisible = Math.max(
    0,
    Math.floor(scrollTop / rowHeight) - overscanRows,
  );
  const visibleCount =
    Math.ceil(viewportHeight / rowHeight) + overscanRows * 2;
  const visibleChannels = channels.slice(
    firstVisible,
    firstVisible + visibleCount,
  );
  const timelineWidth = getTimelineWidth(window, pixelsPerMs);

  const resolveCoordinate = useCallback(
    (coordinate: EpgFocusCoordinate | null) => {
      if (!coordinate) return null;
      const channelIndex = channels.findIndex(
        (channel) => channel.id === coordinate.channelId,
      );
      if (channelIndex < 0) return null;
      const programs = visibleProgramsByChannel[channelIndex]?.programs ?? [];
      const programIndex = programs.findIndex(
        (program) => program.id === coordinate.programId,
      );
      if (programIndex < 0) return null;
      return { channelIndex, programIndex, program: programs[programIndex] };
    },
    [channels, visibleProgramsByChannel],
  );

  const scrollToIndex = useCallback(
    (channelIndex: number) => {
      const verticalScroll = verticalScrollRef.current;
      if (!verticalScroll) return;
      const targetTop = channelIndex * rowHeight;
      const maxTop = Math.max(
        0,
        verticalScroll.scrollHeight - verticalScroll.clientHeight,
      );
      const nextTop = Math.min(Math.max(0, targetTop), maxTop);
      verticalScroll.scrollTop = nextTop;
      setScrollTop(nextTop);
    },
    [rowHeight],
  );

  const focusCoordinate = useCallback(
    (coordinate: EpgFocusCoordinate | null) => {
      if (!coordinate) return;

      const resolved = resolveCoordinate(coordinate);
      if (!resolved) return;

      pendingFocusRef.current = coordinate;
      scrollToIndex(resolved.channelIndex);
      setFocusedCoordinate(coordinate);
    },
    [resolveCoordinate, scrollToIndex],
  );

  useLayoutEffect(() => {
    const coordinate = pendingFocusRef.current;
    if (!coordinate) return;

    const target = rootRef.current?.querySelector<HTMLElement>(
      '[data-epg-program-id="' +
        coordinate.programId.replace(/"/g, '\\"') +
        '"]',
    );

    if (!target) return;

    target.focus();
    pendingFocusRef.current = null;
  }, [focusedCoordinate, firstVisible, visibleChannels]);

  useEffect(() => {
    if (!focusedCoordinate) {
      setFocusedCoordinate(firstProgramCoordinate(channels));
      return;
    }

    const channel = channels.find(
      (candidate) => candidate.id === focusedCoordinate.channelId,
    );
    const program = channel?.schedule.programs.find(
      (candidate) => candidate.id === focusedCoordinate.programId,
    );

    if (!channel || !program) {
      setFocusedCoordinate(firstProgramCoordinate(channels));
    }
  }, [channels, focusedCoordinate]);

  useEffect(() => {
    if (!activeChannelId) return;

    const channelIndex = channels.findIndex(
      (channel) => channel.id === activeChannelId,
    );
    if (channelIndex < 0) return;

    scrollToIndex(channelIndex);

    const horizontalScroll = horizontalScrollRef.current;
    if (!horizontalScroll) return;

    const nowOffsetPx =
      (Math.max(windowStartEpoch, Math.min(windowEndEpoch, timeProvider.now())) -
        windowStartEpoch) *
      pixelsPerMs;
    const targetLeft =
      CHANNEL_LABEL_WIDTH +
      nowOffsetPx -
      horizontalScroll.clientWidth / 2;
    const maxLeft = Math.max(
      0,
      horizontalScroll.scrollWidth - horizontalScroll.clientWidth,
    );

    horizontalScroll.scrollLeft = Math.min(Math.max(0, targetLeft), maxLeft);
  }, [
    activeChannelId,
    channels,
    pixelsPerMs,
    rowHeight,
    scrollToIndex,
    timeProvider,
    windowEndEpoch,
    windowStartEpoch,
  ]);

  const moveFocus = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      const current = focusedCoordinate ?? firstProgramCoordinate(channels);
      if (!current) return;

      const currentChannelIndex = channels.findIndex(
        (channel) => channel.id === current.channelId,
      );
      if (currentChannelIndex < 0) return;

      const currentPrograms =
        visibleProgramsByChannel[currentChannelIndex]?.programs ?? [];
      const currentProgramIndex = currentPrograms.findIndex(
        (program) => program.id === current.programId,
      );
      if (currentProgramIndex < 0) return;

      let nextChannelIndex = currentChannelIndex;
      let nextProgramIndex = currentProgramIndex;

      if (direction === "left") nextProgramIndex -= 1;
      if (direction === "right") nextProgramIndex += 1;
      if (direction === "up") nextChannelIndex -= 1;
      if (direction === "down") nextChannelIndex += 1;

      if (
        nextChannelIndex < 0 ||
        nextChannelIndex >= visibleProgramsByChannel.length
      ) {
        onFocusBoundary?.(direction);
        return;
      }

      let nextPrograms =
        visibleProgramsByChannel[nextChannelIndex]?.programs ?? [];

      if (nextPrograms.length === 0) {
        const step = direction === "up" ? -1 : 1;
        if (direction === "left" || direction === "right") return;
        while (
          nextChannelIndex >= 0 &&
          nextChannelIndex < visibleProgramsByChannel.length
        ) {
          nextChannelIndex += step;
          nextPrograms =
            visibleProgramsByChannel[nextChannelIndex]?.programs ?? [];
          if (nextPrograms.length > 0) break;
        }
      }

      if (nextPrograms.length === 0) return;

      nextProgramIndex = Math.max(
        0,
        Math.min(nextPrograms.length - 1, nextProgramIndex),
      );

      const nextProgram = nextPrograms[nextProgramIndex];
      if (!nextProgram) return;

      const nextCoordinate: EpgFocusCoordinate = {
        channelId: nextProgram.channelId,
        programId: nextProgram.id,
      };

      focusCoordinate(nextCoordinate);
    },
    [
      channels,
      focusCoordinate,
      focusedCoordinate,
      onFocusBoundary,
      visibleProgramsByChannel,
    ],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isFocusRegionActive) return;

    const directionMap = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    } as const;
    const direction = directionMap[event.key as keyof typeof directionMap];

    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      moveFocus(direction);
      return;
    }

    if (event.key === "Enter") {
      const resolved = resolveCoordinate(focusedCoordinate);
      if (!resolved) return;

      event.preventDefault();
      event.stopPropagation();

      const schedule = channels[resolved.channelIndex]?.schedule;
      if (!schedule) return;

      const now = timeProvider.now();
      const current = schedule.programs.find(
        (candidate) =>
          candidate.startTime <= now &&
          (candidate.endTime === null || now < candidate.endTime),
      );

      onSelectProgram({
        channelId: resolved.program.channelId,
        program: resolved.program,
        isCurrentlyLive: current?.id === resolved.program.id,
        embedUrl:
          typeof resolved.program.sourceMetadata?.embedUrl === "string"
            ? resolved.program.sourceMetadata.embedUrl
            : undefined,
      });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      pendingFocusRef.current = null;
      onFocusBoundary?.("up");
    }
  };

  return (
    <section
      ref={rootRef}
      tabIndex={isFocusRegionActive ? 0 : -1}
      onKeyDown={handleKeyDown}
      className="w-full overflow-hidden rounded-2xl border border-slate-800/70 bg-[#05070a] focus:outline-none"
      data-epg-container="v2"
      aria-label="EPG channels"
    >
      <div ref={horizontalScrollRef} className="overflow-x-auto">
        <div style={{ width: CHANNEL_LABEL_WIDTH + timelineWidth }}>
          <EpgTimelineHeader
            windowStartEpoch={windowStartEpoch}
            windowEndEpoch={windowEndEpoch}
            pixelsPerMs={pixelsPerMs}
            channelLabelWidth={CHANNEL_LABEL_WIDTH}
          />

          <div
            ref={verticalScrollRef}
            className="relative overflow-y-auto overflow-x-hidden"
            style={{ height: viewportHeight }}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          >
            <div
              style={{
                height: channels.length * rowHeight,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: firstVisible * rowHeight,
                  left: 0,
                  right: 0,
                }}
              >
                {visibleChannels.map((channel) => {
                  const focusedRow = focusedCoordinate?.channelId === channel.id;
                  const focusedProgramId = focusedRow
                    ? focusedCoordinate?.programId ?? null
                    : null;

                  return (
                    <EpgChannelRow
                      key={channel.id}
                      schedule={channel.schedule}
                      channelTitle={channel.title}
                      window={window}
                      pixelsPerMs={pixelsPerMs}
                      rowHeight={rowHeight}
                      timeProvider={timeProvider}
                      onSelectProgram={onSelectProgram}
                      onSelectChannel={onSelectChannel}
                      focusedProgramId={focusedProgramId}
                    />
                  );
                })}
              </div>

              <EpgNowIndicator
                windowStartEpoch={windowStartEpoch}
                windowEndEpoch={windowEndEpoch}
                pixelsPerMs={pixelsPerMs}
                timeProvider={timeProvider}
                channelLabelWidth={CHANNEL_LABEL_WIDTH}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export type { EpgProgramSelectEvent } from "./EpgChannelRow";
export type { EpgChannelSchedule } from "../../../types/guide";
