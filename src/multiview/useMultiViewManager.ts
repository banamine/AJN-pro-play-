import { useCallback, useMemo, useState } from "react";
import type { MultiViewPattern, MultiViewRuntimeState, TileId } from "../../types/multiview";
import { applyPattern, createInitialMultiViewState, updateTileChannel as updateStateTileChannel } from "./contracts";
export function useMultiViewManager(initialPattern: MultiViewPattern) {
  const [state, setState] = useState<MultiViewRuntimeState>(() => createInitialMultiViewState(initialPattern));
  const updateTileChannel = useCallback((instanceId: TileId, channelId: string | null) => { setState((current) => updateStateTileChannel(current, instanceId, channelId)); }, []);
  const loadPattern = useCallback((pattern: MultiViewPattern) => { setState(applyPattern(pattern)); }, []);
  return useMemo(() => ({ ...state, updateTileChannel, loadPattern }), [state, updateTileChannel, loadPattern]);
}