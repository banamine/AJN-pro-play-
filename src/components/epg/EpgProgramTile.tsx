import type { Key } from "react";
import type { EpgProgram } from "../../../types/guide";
import { getProgramGeometry, type TimelineWindow } from "./timeline-geometry";

export interface EpgProgramTileProps {
  key?: Key;
  program: EpgProgram;
  window: TimelineWindow;
  pixelsPerMs: number;
  isCurrent: boolean;
  isFocused?: boolean;
  onSelect: (program: EpgProgram) => void;
}

export function EpgProgramTile({
  program,
  window,
  pixelsPerMs,
  isCurrent,
  isFocused = false,
  onSelect,
}: EpgProgramTileProps) {
  const geometry = getProgramGeometry(program, window, pixelsPerMs);
  if (geometry.widthPx <= 0) return null;

  const focusClasses = isFocused
    ? "border-white bg-slate-800 ring-2 ring-blue-300 ring-offset-1 ring-offset-[#05070a]"
    : "border-slate-700/80 bg-slate-900/90";

  return (
    <button
      type="button"
      className={
        "absolute inset-y-1 overflow-hidden rounded-lg border px-2 text-left transition-colors hover:border-blue-400/70 hover:bg-slate-800 focus:outline-none " +
        focusClasses
      }
      style={{
        left: geometry.leftPx,
        width: Math.max(2, geometry.widthPx),
      }}
      onClick={() => onSelect(program)}
      aria-current={isCurrent ? "true" : undefined}
      aria-label={program.title + (isCurrent ? ", live" : "")}
      title={program.title}
      data-epg-program-id={program.id}
      data-epg-focused={isFocused ? "true" : undefined}
    >
      <span className="block truncate text-[10px] font-bold text-white">
        {program.title}
      </span>
      <span className="block truncate text-[8px] uppercase tracking-wider text-slate-500">
        {isCurrent ? "LIVE" : program.type.replace("_", " ")}
      </span>
    </button>
  );
}
