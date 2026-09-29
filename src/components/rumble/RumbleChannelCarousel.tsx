import { Radio, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import type { RumbleSyncChannelState } from "../../rumble/sync-circuit-breaker.ts";
import { getRumbleStatusLabel, sortRumbleChannels } from "./station-model.ts";

export interface RumbleChannelCarouselProps {
  channels: RumbleSyncChannelState[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

function SyncStatusBadge({
  status,
}: {
  status: RumbleSyncChannelState["syncStatus"];
}) {
  const config = {
    syncing: {
      label: "SYNCING",
      className: "border-blue-400/30 bg-blue-500/10 text-blue-300",
      icon: <Wifi className="h-3 w-3 animate-pulse" />,
    },
    degraded: {
      label: "DEGRADED",
      className: "border-amber-400/30 bg-amber-500/10 text-amber-300",
      icon: <ShieldAlert className="h-3 w-3" />,
    },
    circuit_open: {
      label: "FALLBACK",
      className: "border-rose-400/30 bg-rose-500/10 text-rose-300",
      icon: <WifiOff className="h-3 w-3" />,
    },
    idle: {
      label: "LIVE",
      className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
      icon: <Radio className="h-3 w-3" />,
    },
  } as const;

  const current = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-widest ${current.className}`}
      data-rumble-sync-status={status}
    >
      {current.icon}
      {current.label}
    </span>
  );
}

export function RumbleChannelCarousel({
  channels,
  activeChannelId,
  onSelectChannel,
}: RumbleChannelCarouselProps) {
  return (
    <div
      className="w-full overflow-x-auto rounded-2xl border border-slate-800/70 bg-[#05070a]/95 p-2 shadow-xl"
      aria-label="Rumble channels"
      data-rumble-carousel="v1"
    >
      <div className="flex min-w-max gap-2">
        {sortRumbleChannels(channels).map((channel) => {
          const active = channel.id === activeChannelId;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelectChannel(channel.id)}
              aria-pressed={active}
              className={`group min-w-[220px] rounded-xl border p-3 text-left transition-all ${
                active
                  ? "border-blue-400/60 bg-blue-500/10 shadow-lg shadow-blue-950/20"
                  : "border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                  {channel.currentVideo?.thumbnailUrl ? (
                    <img
                      src={channel.currentVideo.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <Radio className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-white">
                      {channel.cleanTitle}
                    </span>
                    {channel.isLive && (
                      <span className="shrink-0 rounded bg-rose-500/15 px-1.5 py-0.5 text-[8px] font-black tracking-widest text-rose-300">
                        LIVE
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <SyncStatusBadge status={channel.syncStatus} />
                  </div>
                </div>
              </div>

              <div className="mt-2 truncate text-[10px] text-slate-500">
                {getRumbleStatusLabel(channel.syncStatus)} ·{" "}
                {channel.currentVideo?.title || "Standby feed"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
