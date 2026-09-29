import { useMemo } from "react";
import type { MultiViewResourcePolicy, MultiViewSource, MultiViewTileConfig, TileId, TileResourcePolicy } from "../../types/multiview";
import { DEFAULT_MULTIVIEW_RESOURCE_POLICY, evaluateAdmission } from "./admission";

export function useResourceGovernor(
  focusedTileId: TileId | null,
  panels: MultiViewTileConfig[],
  sources: MultiViewSource[],
  policy: MultiViewResourcePolicy = DEFAULT_MULTIVIEW_RESOURCE_POLICY,
) {
  const policies = useMemo(
    () => evaluateAdmission(panels, sources, focusedTileId, policy),
    [panels, sources, focusedTileId, policy],
  );
  const byTile = useMemo(
    () => new Map(panels.map((panel, index) => [panel.instanceId, policies[index] as TileResourcePolicy])),
    [panels, policies],
  );
  return {
    policy,
    policies,
    getPolicyForTile: (tileId: TileId): TileResourcePolicy => byTile.get(tileId) ?? {
      priorityTier: 3,
      targetResolution: "poster",
      staggerDelayMs: 0,
      sourceType: null,
      admitted: false,
      presentation: "poster_standby",
      consumesDecoder: false,
      consumesMediaPipeline: false,
      consumesIframeSlot: false,
    },
  };
}