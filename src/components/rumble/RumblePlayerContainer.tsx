import { memo } from "react";
import { RumbleIframe } from "../RumbleIframe.tsx";
import { getPlayerViewportClassName } from "./viewport-pinning.ts";

export interface RumblePlayerContainerProps {
  activeEmbedUrl: string;
  channelTitle: string;
  fallback: boolean;
  isPinned?: boolean;
}

export const RumblePlayerContainer = memo(function RumblePlayerContainer({
  activeEmbedUrl,
  channelTitle,
  fallback,
  isPinned = false,
}: RumblePlayerContainerProps) {
  return (
    <section
      tabIndex={0}
      className={getPlayerViewportClassName(isPinned)}
      aria-label={channelTitle + " Rumble player"}
      data-rumble-player-container="v2"
    >
      <RumbleIframe embedUrl={activeEmbedUrl} className="rounded-[28px]" />

      {fallback && (
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-amber-400/30 bg-black/75 px-3 py-1.5 text-[9px] font-black tracking-widest text-amber-300 backdrop-blur-md">
          FALLBACK STREAM
        </div>
      )}
    </section>
  );
});
