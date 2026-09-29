import type { EpgChannelSchedule, EpgProgram, TimeProvider } from "../../types/guide";
import { projectChannelSchedule } from "../../guide/projection";
import { EpgProgramTile } from "./EpgProgramTile";
import { getVisiblePrograms, type TimelineWindow } from "./timeline-geometry";

export interface EpgProgramSelectEvent { channelId: string; program: EpgProgram; isCurrentlyLive: boolean; embedUrl?: string; }
export interface EpgChannelRowProps { schedule: EpgChannelSchedule; channelTitle?: string; window: TimelineWindow; pixelsPerMs: number; rowHeight: number; timeProvider: TimeProvider; onSelectProgram: (event: EpgProgramSelectEvent) => void; }

export function EpgChannelRow({ schedule, channelTitle, window, pixelsPerMs, rowHeight, timeProvider, onSelectProgram }: EpgChannelRowProps) {
  const visiblePrograms = getVisiblePrograms(schedule.programs, window);
  const currentId = projectChannelSchedule(schedule, timeProvider.now()).current.id;
  const handleProgramClick = (program: EpgProgram) => {
    const projection = projectChannelSchedule(schedule, timeProvider.now());
    onSelectProgram({ channelId: program.channelId, program, isCurrentlyLive: projection.current.id === program.id, embedUrl: typeof program.sourceMetadata?.embedUrl === "string" ? program.sourceMetadata.embedUrl : undefined });
  };

  return <div className="flex border-b border-slate-800/70" style={{ height: rowHeight }}>
    <div className="sticky left-0 z-20 flex w-40 shrink-0 items-center border-r border-slate-800/70 bg-[#080b10] px-3"><span className="truncate text-[10px] font-black uppercase tracking-wider text-slate-300">{channelTitle ?? schedule.channelId}</span></div>
    <div className="relative min-w-0 flex-1">{visiblePrograms.map((program) => <EpgProgramTile key={program.id} program={program} window={window} pixelsPerMs={pixelsPerMs} isCurrent={program.id === currentId} onSelect={handleProgramClick} />)}</div>
  </div>;
}
