import { useEffect, useRef } from "react";
import type { TimeProvider } from "../../types/guide";
import { getTimelineWidth } from "./timeline-geometry";

export interface EpgNowIndicatorProps { windowStartEpoch: number; windowEndEpoch: number; pixelsPerMs: number; timeProvider: TimeProvider; }

export function EpgNowIndicator({ windowStartEpoch, windowEndEpoch, pixelsPerMs, timeProvider }: EpgNowIndicatorProps) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(windowStartEpoch);
  const endRef = useRef(windowEndEpoch);
  const scaleRef = useRef(pixelsPerMs);
  const clockRef = useRef(timeProvider);

  useEffect(() => { startRef.current = windowStartEpoch; endRef.current = windowEndEpoch; scaleRef.current = pixelsPerMs; }, [windowStartEpoch, windowEndEpoch, pixelsPerMs]);
  useEffect(() => { clockRef.current = timeProvider; }, [timeProvider]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const now = clockRef.current.now();
      const start = startRef.current;
      const end = endRef.current;
      const width = getTimelineWidth({ windowStartEpoch: start, windowEndEpoch: end }, scaleRef.current);
      const position = Math.min(width, Math.max(0, (now - start) * scaleRef.current));
      if (indicatorRef.current) {
        indicatorRef.current.style.transform = "translateX(" + position + "px)";
        indicatorRef.current.style.visibility = now >= start && now <= end ? "visible" : "hidden";
      }
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <div ref={indicatorRef} className="pointer-events-none absolute inset-y-0 left-0 z-30 w-px bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.7)]" aria-label="Current time" data-epg-now-indicator="v1" style={{ visibility: "hidden" }}><span className="absolute -left-2 top-0 h-2 w-2 rounded-full bg-rose-400" /></div>;
}
