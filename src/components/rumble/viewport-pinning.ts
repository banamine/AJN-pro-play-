export interface ViewportIntersectionLike {
  isIntersecting: boolean;
}

export function resolvePinnedState(
  entry: ViewportIntersectionLike,
): boolean {
  return !entry.isIntersecting;
}

export function getPlayerViewportClassName(isPinned: boolean): string {
  const base =
    "relative w-full overflow-hidden rounded-[28px] border border-slate-800/70 bg-black shadow-2xl";
  if (!isPinned) return base;
  return `${base} fixed bottom-4 right-4 z-50 w-80 shadow-2xl`;
}
