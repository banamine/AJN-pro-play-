export interface HlsLifecycleAdapter {
  stopLoad?: () => void;
  detachMedia?: () => void;
  destroy?: () => void;
}

export interface MediaElementAdapter {
  pause?: () => void;
  removeAttribute?: (name: string) => void;
  load?: () => void;
}

export function teardownHlsInstance(
  hls: HlsLifecycleAdapter | null | undefined,
  video?: MediaElementAdapter | null
): void {
  if (!hls) return;

  hls.stopLoad?.();
  hls.detachMedia?.();
  hls.destroy?.();

  video?.pause?.();
  video?.removeAttribute?.('src');
  video?.load?.();
}