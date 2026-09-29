import { useMemo, useState } from "react";
import type { EpgProgram, TimeProvider } from "../../../types/guide";
import { adaptRumbleStateToEpgSchedule } from "../../guide/adapters/rumble";
import type { RumbleSyncChannelState } from "../../rumble/sync-circuit-breaker.ts";
import {
  EpgContainer,
  type EpgChannel,
  type EpgProgramSelectEvent,
} from "../epg/EpgContainer";
import { RumbleChannelCarousel } from "./RumbleChannelCarousel.tsx";
import { RumbleMetadataOverlay } from "./RumbleMetadataOverlay.tsx";
import { RumblePlayerContainer } from "./RumblePlayerContainer.tsx";
import { isRumbleFallbackState } from "./station-model.ts";

const GUIDE_WINDOW_MS = 4 * 60 * 60 * 1000;

export interface RumbleTVStationViewProps {
  channels: RumbleSyncChannelState[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

function formatProgramStart(epochMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(epochMs));
}

function PreviewDrawer({
  program,
  onClose,
}: {
  program: EpgProgram;
  onClose: () => void;
}) {
  return (
    <aside
      className="rounded-2xl border border-slate-800/70 bg-[#080b10] p-4 shadow-xl"
      aria-label="Program preview"
      data-epg-preview="v1"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">
            Program preview
          </div>
          <h3 className="mt-1 text-sm font-bold text-white">{program.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
          aria-label="Close program preview"
        >
          Close
        </button>
      </div>
      <div className="mt-3 text-[10px] font-mono text-slate-500">
        Starts {formatProgramStart(program.startTime)}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-300">
        {program.description || "No synopsis is available for this program."}
      </p>
    </aside>
  );
}

export function RumbleTVStationView({
  channels,
  activeChannelId,
  onSelectChannel,
}: RumbleTVStationViewProps) {
  const [previewProgram, setPreviewProgram] = useState<EpgProgram | null>(null);

  const activeChannel =
    channels.find((channel) => channel.id === activeChannelId) ?? channels[0];

  const timeProvider = useMemo<TimeProvider>(
    () => ({ now: () => Date.now() }),
    [],
  );

  const guideWindow = useMemo(() => {
    const center = timeProvider.now();
    const halfWindow = GUIDE_WINDOW_MS / 2;
    return {
      windowStartEpoch: center - halfWindow,
      windowEndEpoch: center + halfWindow,
    };
  }, [timeProvider]);

  const epgChannels = useMemo<EpgChannel[]>(
    () =>
      channels.map((channel) => ({
        id: channel.id,
        title: channel.cleanTitle,
        schedule: adaptRumbleStateToEpgSchedule(channel, timeProvider.now()),
      })),
    [channels, timeProvider],
  );

  if (!activeChannel) return null;

  const handleProgramSelect = (event: EpgProgramSelectEvent) => {
    if (event.isCurrentlyLive) {
      setPreviewProgram(null);
      onSelectChannel(event.channelId);
      return;
    }

    setPreviewProgram(event.program);
  };

  return (
    <div
      className="flex w-full flex-col gap-3 overflow-hidden"
      data-rumble-tv-station="v2"
    >
      <RumbleChannelCarousel
        channels={channels}
        activeChannelId={activeChannel.id}
        onSelectChannel={(channelId) => {
          setPreviewProgram(null);
          onSelectChannel(channelId);
        }}
      />

      <RumblePlayerContainer
        activeEmbedUrl={activeChannel.activeEmbedUrl}
        channelTitle={activeChannel.cleanTitle}
        fallback={isRumbleFallbackState(activeChannel)}
      />

      <RumbleMetadataOverlay channel={activeChannel} />

      <div className="min-h-0 overflow-hidden rounded-2xl border border-slate-800/70 bg-[#05070a]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 bg-[#080b10] px-4 py-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">
              Live Guide
            </div>
            <div className="text-xs font-bold text-white">
              {activeChannel.cleanTitle}
            </div>
          </div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
            4 hour window
          </span>
        </div>

        <div className="min-h-0 overflow-hidden p-2">
          <EpgContainer
            channels={epgChannels}
            windowStartEpoch={guideWindow.windowStartEpoch}
            windowEndEpoch={guideWindow.windowEndEpoch}
            timeProvider={timeProvider}
            activeChannelId={activeChannel.id}
            onSelectChannel={(channelId) => {
              setPreviewProgram(null);
              onSelectChannel(channelId);
            }}
            onSelectProgram={handleProgramSelect}
          />
        </div>

        {previewProgram && (
          <div className="p-2 pt-0">
            <PreviewDrawer
              program={previewProgram}
              onClose={() => setPreviewProgram(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
