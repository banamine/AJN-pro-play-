import type { RumbleSyncChannelState } from "../../rumble/sync-circuit-breaker.ts";
import { RumbleChannelCarousel } from "./RumbleChannelCarousel.tsx";
import { RumbleMetadataOverlay } from "./RumbleMetadataOverlay.tsx";
import { RumblePlayerContainer } from "./RumblePlayerContainer.tsx";
import { isRumbleFallbackState } from "./station-model.ts";

export interface RumbleTVStationViewProps {
  channels: RumbleSyncChannelState[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

export function RumbleTVStationView({
  channels,
  activeChannelId,
  onSelectChannel,
}: RumbleTVStationViewProps) {
  const activeChannel =
    channels.find((channel) => channel.id === activeChannelId) ?? channels[0];

  if (!activeChannel) return null;

  return (
    <div className="flex w-full flex-col gap-3" data-rumble-tv-station="v1">
      <RumbleChannelCarousel
        channels={channels}
        activeChannelId={activeChannel.id}
        onSelectChannel={onSelectChannel}
      />

      <RumblePlayerContainer
        activeEmbedUrl={activeChannel.activeEmbedUrl}
        channelTitle={activeChannel.cleanTitle}
        fallback={isRumbleFallbackState(activeChannel)}
      />

      <RumbleMetadataOverlay channel={activeChannel} />
    </div>
  );
}
