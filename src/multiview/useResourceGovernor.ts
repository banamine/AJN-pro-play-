import { useCallback, useMemo } from "react";
import type { MultiViewResourcePolicy, MultiViewTileConfig, TileId, TileResourcePolicy } from "../../types/multiview";
import { calculateTileResourcePolicy } from "./contracts";
const DEFAULT_POLICY: MultiViewResourcePolicy = { maxActiveDecoders: 4, staggeredStartDelayMs: 200, backgroundQualityPolicy: "capped", maxRetryAttempts: 2 };
export function useResourceGovernor(focusedTileId: TileId | null, panels: MultiViewTileConfig[], policy: MultiViewResourcePolicy = DEFAULT_POLICY) {
  const getPolicyForTile = useCallback((tileId: TileId): TileResourcePolicy => {
    const tileIndex = panels.findIndex((panel) => panel.instanceId === tileId);
    return calculateTileResourcePolicy(tileId, Math.max(0, tileIndex), focusedTileId, policy);
  }, [focusedTileId, panels, policy]);
  const policies = useMemo(() => panels.map((panel) => ({ tileId: panel.instanceId, policy: getPolicyForTile(panel.instanceId) })), [panels, getPolicyForTile]);
  return { policy, policies, getPolicyForTile };
}