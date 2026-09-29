export type FocusRegion = "carousel" | "player" | "epg";

export interface SpatialBoundary {
  region: FocusRegion;
  direction: "up" | "down" | "left" | "right";
}

export function moveMacroFocus(
  region: FocusRegion,
  direction: "up" | "down" | "left" | "right",
): FocusRegion {
  if (region === "carousel" && direction === "down") return "player";
  if (region === "player" && direction === "up") return "carousel";
  if (region === "player" && direction === "down") return "epg";
  if (region === "epg" && direction === "up") return "player";
  return region;
}

export function resolveEpgBoundary(
  rowIndex: number,
  columnIndex: number,
  rowCount: number,
  columnCount: number,
  direction: "up" | "down" | "left" | "right",
): SpatialBoundary | null {
  const atTop = rowIndex <= 0 && direction === "up";
  const atBottom = rowIndex >= rowCount - 1 && direction === "down";
  const atLeft = columnIndex <= 0 && direction === "left";
  const atRight = columnIndex >= columnCount - 1 && direction === "right";

  if (atTop || atBottom || atLeft || atRight) {
    return { region: "epg", direction };
  }
  return null;
}
