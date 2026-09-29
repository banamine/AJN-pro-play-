import type { EpgProgram } from "../../../types/guide";
import { getProgramGeometry, type TimelineWindow } from "./timeline-geometry";

export interface EpgProgramTileProps { program: EpgProgram; window: TimelineWindow; pixelsPerMs: number; isCurrent: boolean; onSelect: (program: EpgProgram) => void; }

export function EpgProgramTile({ program, window, pixelsPerMs, isCurrent, onSelect }: EpgProgramTileProps) {
  const geometry = getProgramGeometry(program, window, pixelsPerMs);
  if (geometry.widthPx <= 0) return null;
  return <button type="button" className="absolute inset-y-1 overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/90 px-2 text-left transition-colors hover:border-blue-400/70 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/70" style={{ left: geometry.leftPx, width: Math.max(2, geometry.widthPx) }} onClick={() => onSelect(program)} aria-current={isCurrent ? "true" : undefined} title={program.title} data-epg-program-id={program.id}>
    <span className="block truncate text-[10px] font-bold text-white">{program.title}</span>
    <span className="block truncate text-[8px] uppercase tracking-wider text-slate-500">{isCurrent ? "LIVE" : program.type.replace("_", " ")}</span>
  </button>;
}
