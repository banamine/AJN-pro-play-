import { useEffect, useRef } from "react";
import {
  RumbleIframeHost,
  RumbleIframeLifecycleController,
  RumbleIframeNode,
} from "../playback/rumble-iframe-lifecycle.ts";

export interface RumbleIframeProps {
  embedUrl: string;
  className?: string;
}

export function RumbleIframe({ embedUrl, className = "" }: RumbleIframeProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const controller = new RumbleIframeLifecycleController({
      createIframe: () => {
        const iframe = document.createElement("iframe");
        iframe.className =
          "absolute inset-0 block h-full w-full border-0 bg-black";
        iframe.allowFullscreen = true;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.referrerPolicy = "no-referrer";
        return iframe as unknown as RumbleIframeNode;
      },
    });

    controller.mount(host as unknown as RumbleIframeHost, embedUrl);

    return () => {
      controller.destroy(host as unknown as RumbleIframeHost);
    };
  }, [embedUrl]);

  return (
    <div
      className={"relative w-full aspect-video overflow-hidden bg-black " + className}
      data-rumble-iframe-lifecycle="v1"
    >
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
