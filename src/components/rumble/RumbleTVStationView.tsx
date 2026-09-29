import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TimeProvider } from "../../../types/guide";
import { adaptRumbleStateToEpgSchedule } from "../../guide/adapters/rumble";
import type { RumbleSyncChannelState } from "../../rumble/sync-circuit-breaker.ts";
import {
  moveMacroFocus,
  type FocusRegion,
} from "./spatial-focus.ts";
import { resolvePinnedState } from "./viewport-pinning.ts";
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
const Z_INDEX = {
  base: "z-0",
  header: "z-10",
  pip: "z-30",
  backdrop: "z-40",
  modal: "z-50",
  focus: "z-60",
} as const;

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
  program: import("../../../types/guide").EpgProgram;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-end justify-center p-4"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      data-epg-preview="v2"
    >
      <div
        aria-hidden="true"
        className={Z_INDEX.backdrop + " absolute inset-0 bg-black/70"}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Program preview"
        tabIndex={-1}
        className={
          Z_INDEX.modal +
          " relative w-full max-w-xl rounded-2xl border border-slate-800/70 bg-[#080b10] p-4 shadow-xl"
        }
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
    </div>
  );
}

export function RumbleTVStationView({
  channels,
  activeChannelId,
  onSelectChannel,
}: RumbleTVStationViewProps) {
  const [previewKey, setPreviewKey] = useState<{
    channelId: string;
    programId: string;
  } | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [activeFocusRegion, setActiveFocusRegion] =
    useState<FocusRegion>("carousel");
  const playerAnchorRef = useRef<HTMLDivElement | null>(null);

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

  const activePreviewProgram = useMemo(() => {
    if (!previewKey) return null;
    const schedule = epgChannels.find(
      (channel) => channel.id === previewKey.channelId,
    )?.schedule;
    return (
      schedule?.programs.find((program) => program.id === previewKey.programId) ??
      null
    );
  }, [epgChannels, previewKey]);

  useEffect(() => {
    const anchor = playerAnchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsPinned(resolvePinnedState(entry));
      },
      { threshold: 0 },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  const focusRegion = (region: FocusRegion) => {
    setActiveFocusRegion(region);

    requestAnimationFrame(() => {
      const selector = {
        carousel: '[data-rumble-carousel="v1"] button',
        player: '[data-rumble-player-container="v2"]',
        epg: '[data-epg-container="v2"]',
      }[region];

      document.querySelector<HTMLElement>(selector)?.focus();
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.defaultPrevented) return;
        event.preventDefault();
        focusRegion("player");
        return;
      }

      if (activeFocusRegion === "epg") return;

      const direction =
        event.key === "ArrowUp"
          ? "up"
          : event.key === "ArrowDown"
            ? "down"
            : null;

      if (!direction) return;

      const next = moveMacroFocus(activeFocusRegion, direction);
      if (next !== activeFocusRegion) {
        event.preventDefault();
        focusRegion(next);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFocusRegion]);

  if (!activeChannel) return null;

  const handleProgramSelect = (event: EpgProgramSelectEvent) => {
    if (event.isCurrentlyLive) {
      setPreviewKey(null);
      onSelectChannel(event.channelId);
      return;
    }

    setPreviewKey({
      channelId: event.channelId,
      programId: event.program.id,
    });
  };

  return (
    <div
      className="relative flex w-full flex-col gap-3 overflow-hidden"
      data-rumble-tv-station="v3"
      onFocusCapture={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('[data-rumble-carousel="v1"]')) {
          setActiveFocusRegion("carousel");
        } else if (target.closest('[data-rumble-player-container="v2"]')) {
          setActiveFocusRegion("player");
        } else if (target.closest('[data-epg-container="v2"]')) {
          setActiveFocusRegion("epg");
        }
      }}
    >
      <RumbleChannelCarousel
        channels={channels}
        activeChannelId={activeChannel.id}
        onSelectChannel={(channelId) => {
          setPreviewKey(null);
          onSelectChannel(channelId);
        }}
      />

      <div
        ref={playerAnchorRef}
        className="relative aspect-video w-full"
        data-rumble-player-anchor="v1"
      >
        <RumblePlayerContainer
          activeEmbedUrl={activeChannel.activeEmbedUrl}
          channelTitle={activeChannel.cleanTitle}
          fallback={isRumbleFallbackState(activeChannel)}
          isPinned={isPinned}
        />
      </div>

      <RumbleMetadataOverlay channel={activeChannel} />

      <div className={Z_INDEX.base + " min-h-0 overflow-hidden rounded-2xl border border-slate-800/70 bg-[#05070a]"}>
        <div className={Z_INDEX.header + " flex items-center justify-between gap-3 border-b border-slate-800/70 bg-[#080b10] px-4 py-3"}>
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
            isFocusRegionActive={activeFocusRegion === "epg"}
            onFocusBoundary={(direction) => {
              if (direction === "up") focusRegion("player");
            }}
            onSelectChannel={(channelId) => {
              setPreviewKey(null);
              onSelectChannel(channelId);
            }}
            onSelectProgram={handleProgramSelect}
          />
        </div>

        {activePreviewProgram && <PreviewDrawer
          program={activePreviewProgram}
          onClose={() => setPreviewKey(null)}
        />}
      </div>
    </div>
  );
}
