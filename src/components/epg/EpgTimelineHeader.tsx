import type { TimelineWindow } from "./timeline-geometry";
import { getTimelineWidth } from "./timeline-geometry";

export interface EpgTimelineHeaderProps {
  windowStartEpoch: number;
  windowEndEpoch: number;
  pixelsPerMs: number;
  tickMinutes?: number;
  channelLabelWidth?: number;
}

function formatTick(epoch: number): string {
  return new Date(epoch).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function EpgTimelineHeader({ windowStartEpoch, windowEndEpoch, pixelsPerMs, tickMinutes = 30 }: EpgTimelineHeaderProps) {
  const window: TimelineWindow = { windowStartEpoch, windowEndEpoch };
  const tickMs = Math.max(1, tickMinutes) * 60_000;
  const firstTick = Math.ceil(windowStartEpoch / tickMs) * tickMs;
  const ticks: number[] = [];
  for (let tick = firstTick; tick < windowEndEpoch; tick += tickMs) ticks.push(tick);

  return <div className="relative h-9 border-b border-slate-800/70 bg-[#070a0f]" aria-label="EPG timeline" data-epg-timeline-header="v1" style={{ width: channelLabelWidth + getTimelineWidth(window, pixelsPerMs) }}>
    {ticks.map((tick) => <div key={tick} className="absolute inset-y-0 border-l border-slate-800/70 pl-2 pt-2 text-[9px] font-bold tracking-wide text-slate-500" style={{ left: channelLabelWidth + (tick - windowStartEpoch) * pixelsPerMs }}>{formatTick(tick)}</div>)}
  </div>;
}
