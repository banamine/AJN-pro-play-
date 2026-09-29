import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  const [focusedCell, setFocusedCell] = useState({ row: 0, column: 0 });
  const horizontalScrollRef = useRef<HTMLDivElement | null>(null);
  const verticalScrollRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

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

  const focusCell = useCallback(
    (row: number, column: number) => {
      const rowCount = visibleProgramsByChannel.length;
      if (rowCount === 0) return;

      let nextRow = Math.max(0, Math.min(rowCount - 1, row));
      let programs = visibleProgramsByChannel[nextRow]?.programs ?? [];

      if (programs.length === 0) {
        const direction = row >= focusedCell.row ? 1 : -1;
        while (nextRow >= 0 && nextRow < rowCount) {
          nextRow += direction;
          programs = visibleProgramsByChannel[nextRow]?.programs ?? [];
          if (programs.length > 0) break;
        }
      }

      if (programs.length === 0) return;

      const nextColumn = Math.max(0, Math.min(programs.length - 1, column));
      setFocusedCell({ row: nextRow, column: nextColumn });

      const target = programs[nextColumn];
      requestAnimationFrame(() => {
        const selector = '[data-epg-program-id="' +
          target.id.replace(/"/g, '\\"') +
          '"]';
        const element = rootRef.current?.querySelector<HTMLElement>(selector);
        element?.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    },
    [focusedCell.row, visibleProgramsByChannel],
  );

  useEffect(() => {
    if (!isFocusRegionActive) return;
    focusCell(focusedCell.row, focusedCell.column);
  }, [isFocusRegionActive, focusCell, focusedCell.column, focusedCell.row]);

  useEffect(() => {
    if (!activeChannelId) return;

    const channelIndex = channels.findIndex(
      (channel) => channel.id === activeChannelId,
    );
    if (channelIndex < 0) return;

    const verticalScroll = verticalScrollRef.current;
    if (verticalScroll) {
      const targetTop = channelIndex * rowHeight;
      const maxTop = Math.max(
        0,
        verticalScroll.scrollHeight - verticalScroll.clientHeight,
      );
      verticalScroll.scrollTop = Math.min(targetTop, maxTop);
      setScrollTop(verticalScroll.scrollTop);
    }

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
    rowHeight,
    pixelsPerMs,
    timeProvider,
    windowStartEpoch,
    windowEndEpoch,
  ]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
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

      const row = focusedCell.row;
      const column = focusedCell.column;
      const programs = visibleProgramsByChannel[row]?.programs ?? [];

      if (direction === "left" && column === 0) {
        onFocusBoundary?.("left");
        return;
      }
      if (
        direction === "right" &&
        programs.length > 0 &&
        column >= programs.length - 1
      ) {
        onFocusBoundary?.("right");
        return;
      }
      if (direction === "up" && row === 0) {
        onFocusBoundary?.("up");
        return;
      }
      if (
        direction === "down" &&
        row >= visibleProgramsByChannel.length - 1
      ) {
        onFocusBoundary?.("down");
        return;
      }

      if (direction === "left") focusCell(row, column - 1);
      if (direction === "right") focusCell(row, column + 1);
      if (direction === "up") focusCell(row - 1, column);
      if (direction === "down") focusCell(row + 1, column);
      return;
    }

    if (event.key === "Enter") {
      const programs = visibleProgramsByChannel[focusedCell.row]?.programs ?? [];
      const program = programs[focusedCell.column];
      if (!program) return;

      event.preventDefault();
      const schedule = channels[focusedCell.row]?.schedule;
      if (!schedule) return;

      const current = schedule.programs.find((candidate) => {
        const now = timeProvider.now();
        return (
          candidate.startTime <= now &&
          (candidate.endTime === null || now < candidate.endTime)
        );
      });

      onSelectProgram({
        channelId: program.channelId,
        program,
        isCurrentlyLive: current?.id === program.id,
        embedUrl:
          typeof program.sourceMetadata?.embedUrl === "string"
            ? program.sourceMetadata.embedUrl
            : undefined,
      });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
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
                  const channelIndex = channels.indexOf(channel);
                  const focusedRow = focusedCell.row === channelIndex;
                  const focusedPrograms =
                    visibleProgramsByChannel[channelIndex]?.programs ?? [];
                  const focusedProgramId = focusedRow
                    ? focusedPrograms[focusedCell.column]?.id ?? null
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
