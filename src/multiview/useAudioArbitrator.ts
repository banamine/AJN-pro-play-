import { useCallback, useMemo, useState } from "react";
import type { TileId } from "../../types/multiview";
import { setAudioFocus } from "./contracts";
export function useAudioArbitrator(initialFocusedTile: TileId = "tile-0") {
  const [activeAudioTileId, setActiveAudioTileId] = useState<TileId | null>(initialFocusedTile);
  const [isAudioLocked, setIsAudioLocked] = useState(false);
  const setAudioFocusForTile = useCallback((tileId: TileId, forceLock = false) => {
    const next = setAudioFocus(activeAudioTileId, tileId, isAudioLocked, forceLock);
    setActiveAudioTileId(next.activeAudioTileId); setIsAudioLocked(next.isAudioLocked);
  }, [activeAudioTileId, isAudioLocked]);
  const syncAudioWithSpatialFocus = useCallback((focusedTileId: TileId) => { if (!isAudioLocked) setActiveAudioTileId(focusedTileId); }, [isAudioLocked]);
  const unlockAudioFollow = useCallback(() => setIsAudioLocked(false), []);
  return useMemo(() => ({ activeAudioTileId, isAudioLocked, setAudioFocus: setAudioFocusForTile, syncAudioWithSpatialFocus, unlockAudioFollow }), [activeAudioTileId, isAudioLocked, setAudioFocusForTile, syncAudioWithSpatialFocus, unlockAudioFollow]);
}