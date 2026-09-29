import type { MultiViewResourcePolicy, MultiViewSource, MultiViewTileConfig, TileId, TileResourcePolicy } from "../../types/multiview";

function emptyPolicy(): TileResourcePolicy {
  return { priorityTier: 3, targetResolution: "poster", staggerDelayMs: 0, sourceType: null, admitted: false, presentation: "poster_standby", consumesDecoder: false, consumesMediaPipeline: false, consumesIframeSlot: false };
}
const consumesDecoder = (source: MultiViewSource) => source.sourceType === "audio" ? false : source.hasVideoTrack !== false;
const consumesPipeline = (_source: MultiViewSource) => true;
const consumesIframe = (source: MultiViewSource) => source.sourceType === "iframe";

export function evaluateAdmission(
  panels: MultiViewTileConfig[],
  sources: MultiViewSource[],
  focusedTileId: TileId | null,
  limits: MultiViewResourcePolicy,
): TileResourcePolicy[] {
  const sourceByChannel = new Map(sources.map((source) => [source.channelId, source]));
  const results = new Map<TileId, TileResourcePolicy>();
  let decoderCount = 0, pipelineCount = 0, iframeCount = 0;

  const canAdmit = (source: MultiViewSource) => {
    return decoderCount + (consumesDecoder(source) ? 1 : 0) <= limits.maxActiveDecoders &&
      pipelineCount + (consumesPipeline(source) ? 1 : 0) <= limits.maxActiveMediaPipelines &&
      iframeCount + (consumesIframe(source) ? 1 : 0) <= limits.maxConcurrentIframes &&
      !(source.sourceType === "iframe" && source.unmanagedBandwidth);
  };

  const admit = (panel: MultiViewTileConfig, source: MultiViewSource, tier: 1 | 2, delay: number) => {
    const decoder = consumesDecoder(source), pipeline = consumesPipeline(source), iframe = consumesIframe(source);
    if (decoder) decoderCount++;
    if (pipeline) pipelineCount++;
    if (iframe) iframeCount++;
    results.set(panel.instanceId, {
      priorityTier: tier,
      targetResolution: tier === 1 ? "1080p" : "480p",
      staggerDelayMs: delay,
      sourceType: source.sourceType,
      admitted: true,
      presentation: "active",
      consumesDecoder: decoder,
      consumesMediaPipeline: pipeline,
      consumesIframeSlot: iframe,
    });
  };

  // Pass 1: reserve focused tile first.
  if (focusedTileId) {
    const panel = panels.find((item) => item.instanceId === focusedTileId);
    const source = panel?.enabled && panel.channelId ? sourceByChannel.get(panel.channelId) : undefined;
    if (panel && source && canAdmit(source)) admit(panel, source, 1, 0);
  }

  // Pass 2: admit remaining panels in stable pattern order.
  let backgroundIndex = 0;
  for (const panel of panels) {
    if (results.has(panel.instanceId)) continue;
    if (!panel.enabled || !panel.channelId) { results.set(panel.instanceId, emptyPolicy()); continue; }
    const source = sourceByChannel.get(panel.channelId);
    if (!source || !canAdmit(source)) { results.set(panel.instanceId, emptyPolicy()); continue; }
    backgroundIndex++;
    admit(panel, source, 2, backgroundIndex * limits.staggeredStartDelayMs);
  }
  return panels.map((panel) => results.get(panel.instanceId) ?? emptyPolicy());
}

export const DEFAULT_MULTIVIEW_RESOURCE_POLICY: MultiViewResourcePolicy = {
  maxActiveDecoders: 2,
  maxActiveMediaPipelines: 2,
  maxConcurrentIframes: 1,
  staggeredStartDelayMs: 200,
  backgroundQualityPolicy: "capped",
  maxRetryAttempts: 2,
  defaultMaxActiveDecoders: 2,
};
