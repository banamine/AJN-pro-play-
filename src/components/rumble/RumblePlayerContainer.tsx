import { RumbleIframe } from "../RumbleIframe.tsx";

export interface RumblePlayerContainerProps {
  activeEmbedUrl: string;
  channelTitle: string;
  fallback: boolean;
}

export function RumblePlayerContainer({
  activeEmbedUrl,
  channelTitle,
  fallback,
}: RumblePlayerContainerProps) {
  return (
    <section
      className="relative w-full overflow-hidden rounded-[28px] border border-slate-800/70 bg-black shadow-2xl"
      aria-label={`${channelTitle} Rumble player`}
      data-rumble-player-container="v1"
    >
      <RumbleIframe embedUrl={activeEmbedUrl} className="rounded-[28px]" />

      {fallback && (
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-amber-400/30 bg-black/75 px-3 py-1.5 text-[9px] font-black tracking-widest text-amber-300 backdrop-blur-md">
          FALLBACK STREAM
        </div>
      )}
    </section>
  );
}
