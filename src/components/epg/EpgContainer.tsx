import { useEffect, useMemo, useRef, useState } from "react";
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
  pixelsPerMs = DEFAULT_PIXELS_PER_MINUTE / 60_000,
  rowHeight = DEFAULT_ROW_HEIGHT,
  overscanRows = DEFAULT_OVERSCAN_ROWS,
}: EpgContainerProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const horizontalScrollRef = useRef<HTMLDivElement | null>(null);
  const verticalScrollRef = useRef<HTMLDivElement | null>(null);

  const window: TimelineWindow = useMemo(
    () => ({ windowStartEpoch, windowEndEpoch }),
    [windowStartEpoch, windowEndEpoch],
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

    horizontalScroll.scrollLeft = Math.min(
      Math.max(0, targetLeft),
      maxLeft,
    );
  }, [
    activeChannelId,
    channels,
    rowHeight,
    pixelsPerMs,
    timeProvider,
    windowStartEpoch,
    windowEndEpoch,
  ]);

  return (
    <section
      className="w-full overflow-hidden rounded-2xl border border-slate-800/70 bg-[#05070a]"
      data-epg-container="v1"
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
            aria-label="EPG channels"
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
                {visibleChannels.map((channel) => (
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
                  />
                ))}
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
