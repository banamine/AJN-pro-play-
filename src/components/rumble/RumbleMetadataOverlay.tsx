import { CalendarDays, Radio, ShieldAlert } from "lucide-react";
import type { RumbleSyncChannelState } from "../../rumble/sync-circuit-breaker.ts";
import { getRumbleDisplayTitle, isRumbleFallbackState } from "./station-model.ts";

export interface RumbleMetadataOverlayProps {
  channel: RumbleSyncChannelState;
}

export function RumbleMetadataOverlay({
  channel,
}: RumbleMetadataOverlayProps) {
  const fallback = isRumbleFallbackState(channel);
  const publishDate = channel.currentVideo?.publishDate
    ? new Date(channel.currentVideo.publishDate).toLocaleString()
    : null;

  return (
    <section
      className="rounded-2xl border border-slate-800/70 bg-[#05070a]/95 p-4"
      aria-label="Rumble metadata"
      data-rumble-metadata="v1"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
          {channel.cleanTitle}
        </span>

        {channel.isLive && (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-rose-300">
            <Radio className="h-3 w-3" />
            LIVE
          </span>
        )}

        {fallback && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold tracking-widest text-amber-300">
            <ShieldAlert className="h-3 w-3" />
            FALLBACK
          </span>
        )}
      </div>

      <h2 className="mt-2 text-lg font-semibold text-white">
        {getRumbleDisplayTitle(channel)}
      </h2>

      {publishDate && !fallback && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
          <CalendarDays className="h-3 w-3" />
          {publishDate}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        {channel.overview}
      </p>

      {channel.keyShows.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {channel.keyShows.map((show) => (
            <span
              key={show}
              className="rounded-full border border-slate-800 bg-slate-900/70 px-2 py-1 text-[9px] text-slate-400"
            >
              {show}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
