import { useCallback, useMemo, useState } from "react";
import type { TileId } from "../../types/multiview";
import { moveGridFocus, moveMenuSelection } from "./contracts";
export type FocusZone = "GRID" | "QUICK_CHANGE_MENU" | "PATTERN_MENU";
export function useSpatialNavigation() {
  const [focusedTileId, setFocusedTileId] = useState<TileId>("tile-0");
  const [activeZone, setActiveZone] = useState<FocusZone>("GRID");
  const [menuSelectedIndex, setMenuSelectedIndex] = useState(0);
  const handleKeyDown = useCallback((event: KeyboardEvent, menuItemCount = 0) => {
    if (activeZone === "GRID") {
      if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); setFocusedTileId((current) => moveGridFocus(current, event.key)); return; }
      if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); setActiveZone("QUICK_CHANGE_MENU"); setMenuSelectedIndex(0); }
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); event.stopPropagation(); setMenuSelectedIndex((index) => moveMenuSelection(index, menuItemCount, event.key)); return; }
    if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); return; }
    if (event.key === "Escape" || event.key === "Back") { event.preventDefault(); event.stopPropagation(); setActiveZone("GRID"); }
  }, [activeZone]);
  const openQuickChange = useCallback(() => { setActiveZone("QUICK_CHANGE_MENU"); setMenuSelectedIndex(0); }, []);
  const openPatternMenu = useCallback(() => { setActiveZone("PATTERN_MENU"); setMenuSelectedIndex(0); }, []);
  return useMemo(() => ({ focusedTileId, activeZone, menuSelectedIndex, handleKeyDown, setActiveZone, openQuickChange, openPatternMenu }), [focusedTileId, activeZone, menuSelectedIndex, handleKeyDown, openQuickChange, openPatternMenu]);
}