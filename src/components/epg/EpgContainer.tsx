import { useState } from "react";
import type { EpgChannelSchedule, TimeProvider } from "../../types/guide";
import { EpgChannelRow, type EpgProgramSelectEvent } from "./EpgChannelRow";
import { EpgNowIndicator } from "./EpgNowIndicator";
import { EpgTimelineHeader } from "./EpgTimelineHeader";
import { getTimelineWidth, type TimelineWindow } from "./timeline-geometry";

export interface EpgChannel { id: string; title?: string; schedule: EpgChannelSchedule; }
export interface EpgContainerProps { channels: EpgChannel[]; windowStartEpoch: number; windowEndEpoch: number; timeProvider: TimeProvider; onSelectProgram: (event: EpgProgramSelectEvent) => void; pixelsPerMs?: number; rowHeight?: number; overscanRows?: number; }
const DEFAULT_PIXELS_PER_MINUTE = 3;
const DEFAULT_ROW_HEIGHT = 64;
const DEFAULT_OVERSCAN_ROWS = 4;

export function EpgContainer({ channels, windowStartEpoch, windowEndEpoch, timeProvider, onSelectProgram, pixelsPerMs = DEFAULT_PIXELS_PER_MINUTE / 60_000, rowHeight = DEFAULT_ROW_HEIGHT, overscanRows = DEFAULT_OVERSCAN_ROWS }: EpgContainerProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const window: TimelineWindow = { windowStartEpoch, windowEndEpoch };
  const viewportHeight = Math.min(480, Math.max(rowHeight, channels.length * rowHeight));
  const firstVisible = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscanRows * 2;
  const visibleChannels = channels.slice(firstVisible, firstVisible + visibleCount);
  const timelineWidth = getTimelineWidth(window, pixelsPerMs);

  return <section className="w-full overflow-hidden rounded-2xl border border-slate-800/70 bg-[#05070a]" data-epg-container="v1">
    <div className="overflow-x-auto"><div style={{ width: timelineWidth }}>
      <EpgTimelineHeader windowStartEpoch={windowStartEpoch} windowEndEpoch={windowEndEpoch} pixelsPerMs={pixelsPerMs} />
      <div className="relative overflow-y-auto overflow-x-hidden" style={{ height: viewportHeight }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)} aria-label="EPG channels">
        <div style={{ height: channels.length * rowHeight, position: "relative" }}>
          <div style={{ position: "absolute", top: firstVisible * rowHeight, left: 0, right: 0 }}>
            {visibleChannels.map((channel) => <EpgChannelRow key={channel.id} schedule={channel.schedule} channelTitle={channel.title} window={window} pixelsPerMs={pixelsPerMs} rowHeight={rowHeight} timeProvider={timeProvider} onSelectProgram={onSelectProgram} />)}
          </div>
          <EpgNowIndicator windowStartEpoch={windowStartEpoch} windowEndEpoch={windowEndEpoch} pixelsPerMs={pixelsPerMs} timeProvider={timeProvider} />
        </div>
      </div>
    </div></div>
  </section>;
}

export type { EpgProgramSelectEvent } from "./EpgChannelRow";
export type { EpgChannelSchedule } from "../../types/guide";
