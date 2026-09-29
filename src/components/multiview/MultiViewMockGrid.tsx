import React, { useEffect, useMemo } from "react";
import type { MultiViewPattern, TileId } from "../../types/multiview";
import { useMultiViewManager } from "../../multiview/useMultiViewManager";
import { useAudioArbitrator } from "../../multiview/useAudioArbitrator";
import { useResourceGovernor } from "../../multiview/useResourceGovernor";
import { useSpatialNavigation } from "../../multiview/useSpatialNavigation";
const CHANNELS = [
  { id: "classic-1", title: "Classic Live TV", category: "live_classic" as const },
  { id: "news-1", title: "News", category: "news" as const },
  { id: "vod-1", title: "VOD", category: "vod" as const },
  { id: "ajn-1", title: "AJN Shows", category: "ajn" as const },
];
const DEFAULT_PATTERN: MultiViewPattern = {
  id: "default-quartet", name: "Default Quartet", layout: "2x2",
  panels: CHANNELS.map((channel, index) => ({ instanceId: ("tile-" + index) as TileId, category: channel.category, channelId: channel.id, enabled: true })),
};
export function MultiViewMockGrid() {
  const manager = useMultiViewManager(DEFAULT_PATTERN);
  const navigation = useSpatialNavigation();
  const audio = useAudioArbitrator(navigation.focusedTileId);
  const resources = useResourceGovernor(navigation.focusedTileId, manager.panels);
  useEffect(() => { audio.syncAudioWithSpatialFocus(navigation.focusedTileId); }, [navigation.focusedTileId, audio.syncAudioWithSpatialFocus]);
  const focusedPanel = manager.panels.find((panel) => panel.instanceId === navigation.focusedTileId);
  const menuChannels = useMemo(() => CHANNELS.filter((channel) => channel.category === focusedPanel?.category), [focusedPanel?.category]);
  const selectChannel = (channelId: string) => { manager.updateTileChannel(navigation.focusedTileId, channelId); navigation.setActiveZone("GRID"); };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => { navigation.handleKeyDown(event.nativeEvent, menuChannels.length); };
  return (
    <section tabIndex={0} role="region" aria-label="4-Way MultiView Player Grid" className="relative rounded-3xl border border-slate-800 bg-slate-950 p-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" onKeyDown={handleKeyDown} data-multiview-grid="phase1">
      <div className="mb-3 flex items-center justify-between">
        <div><h2 className="text-sm font-black uppercase tracking-widest">MultiView Contract Harness</h2><p className="text-[10px] text-slate-500">Phase 1 — mock state only; no video decoders</p></div>
        <div className="text-[10px] font-mono text-slate-400">{navigation.activeZone} · Focus {navigation.focusedTileId}</div>
      </div>
      <div className="grid grid-cols-2 gap-2" role="grid" aria-label="MultiView mock panels">
        {manager.panels.map((panel) => {
          const focused = navigation.focusedTileId === panel.instanceId;
          const resource = resources.getPolicyForTile(panel.instanceId);
          const channel = CHANNELS.find((item) => item.id === panel.channelId);
          return (
            <div key={panel.instanceId} role="gridcell" tabIndex={focused && navigation.activeZone === "GRID" ? 0 : -1} aria-label={"Panel " + (Number(panel.instanceId.slice(-1)) + 1) + ": " + (channel?.title ?? "Unassigned")} className={"relative aspect-video overflow-hidden rounded-2xl border bg-slate-900 p-4 transition " + (focused && navigation.activeZone === "GRID" ? "border-emerald-400 ring-2 ring-emerald-400/50" : "border-slate-800")} data-multiview-panel={panel.instanceId}>
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800/70 to-slate-950" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-center justify-between"><span className="rounded bg-black/50 px-2 py-1 text-[9px] font-bold uppercase tracking-widest">Panel {Number(panel.instanceId.slice(-1)) + 1}</span><span className="text-[9px] font-mono text-slate-400">Tier {resource.priorityTier}</span></div>
                <div><div className="text-lg font-black">{channel?.title ?? "Unassigned"}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{resource.admitted ? resource.targetResolution + " policy" : "Standby poster policy"}</div></div>
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500"><span>{audio.activeAudioTileId === panel.instanceId ? "AUDIO ACTIVE" : "MUTED"}</span><span>{resource.staggerDelayMs}ms start delay</span></div>
              </div>
            </div>
          );
        })}
      </div>
      {navigation.activeZone !== "GRID" && (
        <div role="dialog" aria-modal="true" aria-label="Quick-Change Channel Menu" className="absolute inset-3 z-50 rounded-2xl border border-emerald-400/40 bg-slate-950/95 p-4 shadow-2xl">
          <div className="mb-3 text-xs font-black uppercase tracking-widest">Quick-Change Channel Menu</div>
          <div role="listbox" aria-label="Channel choices" className="space-y-1">
            {menuChannels.map((channel, index) => <button key={channel.id} type="button" role="option" aria-selected={navigation.menuSelectedIndex === index} onClick={() => selectChannel(channel.id)} className={"block w-full rounded-lg px-3 py-2 text-left text-xs " + (navigation.menuSelectedIndex === index ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300")}>{channel.title}</button>)}
          </div>
          <p className="mt-4 text-[10px] text-slate-500">D-pad: navigate · Enter: select · Escape/Back: return to grid</p>
        </div>
      )}
      <div aria-live="polite" className="sr-only">Focused Panel {Number(navigation.focusedTileId.slice(-1)) + 1}: {focusedPanel?.channelId ?? "Unassigned"}. {audio.activeAudioTileId === navigation.focusedTileId ? "Audio active." : "Muted."}</div>
    </section>
  );
}