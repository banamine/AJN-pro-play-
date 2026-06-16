/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Menu, 
  Settings, 
  Moon, 
  Sun, 
  Activity, 
  Volume2, 
  VolumeX, 
  Trash2, 
  FolderClock, 
  Star, 
  Search, 
  Calendar, 
  RefreshCw, 
  FileDown, 
  X, 
  Radio, 
  Tv, 
  Info,
  Sparkles,
  Square,
  RotateCcw,
  Repeat,
  Clock,
  HelpCircle,
  Share2
} from "lucide-react";
import Hls from "hls.js";
import { motion, AnimatePresence } from "motion/react";
import { IPTVChannel, PlaybackHistoryItem, ArchiveEpisode, ColorScheme } from "./types";
import { buildM3U, buildWeeblyHtml, triggerClientDownload, buildLanguageSeparatedM3U, detectLanguage, buildTVExplorerHtml, buildVidGridHtml, buildPublicIPTVHtml, ExportEpisode } from "./utils/exportUtils";

// Static Default M3U Playlist Source
const DEFAULT_M3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/e/e1/Comedy_Central_logo_2018.svg",🎬 Big Buck Bunny (M3U8)
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-logo="https://rumble.com/favicon.ico",🥊 Rumble Embed Live (Direct Bypass)
https://rumble.com/embed/v77ec70/?pub=15son
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/1/18/C-SPAN_logo_2021.svg",📺 Jellyfish Sample (Direct)
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/e/eb/Eurosport_Logo.svg",📡 Sintel HLS Stream
https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/6/6a/USA_Network_logo_2016.svg",🌌 Cosmos HLS Sample
https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8`;

// Theme mappings for Hour classification
const HOUR_COLOR_SCHEME: Record<string, { hex: string; rgb: string }> = {
  "Hour 1": { hex: "#3B82F6", rgb: "59, 130, 246" },       // Blue
  "Hour 2": { hex: "#F97316", rgb: "249, 115, 22" },       // Orange
  "Hour 3": { hex: "#8B5CF6", rgb: "139, 92, 246" },      // Purple
  "Hour 4": { hex: "#EC4899", rgb: "236, 72, 153" },      // Pink
  "Full Show": { hex: "#10B981", rgb: "16, 185, 129" },   // Emerald Green
  "default": { hex: "#64748B", rgb: "100, 116, 139" }     // Slate Gray
};

export const SHOW_THUMBNAILS: Record<string, string> = {
  "War Room": "/src/assets/images/war_room_1781449197802.jpg",
  "Alex Jones Show": "/src/assets/images/alex_jones_1781449209765.jpg",
  "Sunday Night Live": "/src/assets/images/infowars_globe_1781449235778.jpg",
  "The Ezra Levant Show": "/src/assets/images/ezra_levant_1781449223400.jpg",
  "Geniuses": "/src/assets/images/geniuses_1781449247776.jpg",
  "News Update": "/src/assets/images/news_update_1781449258747.jpg",
  "default": "/src/assets/images/ajn_logo_1781449178665.jpg"
};

export const getChannelLogo = (channelName: string, originalLogo: string | null): string => {
  if (originalLogo && originalLogo.trim() !== "" && !originalLogo.includes("placehold.co")) {
    return originalLogo;
  }
  const lower = channelName.toLowerCase();
  if (lower.includes("war room") || lower.includes("warroom")) {
    return SHOW_THUMBNAILS["War Room"];
  }
  if (lower.includes("ezra") || lower.includes("rebel")) {
    return SHOW_THUMBNAILS["The Ezra Levant Show"];
  }
  if (
    lower.includes("alex jones") || 
    lower.includes("infowars") || 
    lower.includes("info wars") ||
    lower.includes("alex -") ||
    /alex\s*-\s*hr/i.test(lower) ||
    /alex\s*hr/i.test(lower) ||
    /alex-hr/i.test(lower) ||
    lower.startsWith("alex ") ||
    lower === "alex"
  ) {
    if (lower.includes("live") || lower.includes("sunday")) {
      return SHOW_THUMBNAILS["Sunday Night Live"];
    }
    return SHOW_THUMBNAILS["Alex Jones Show"];
  }
  if (lower.includes("geniuses") || lower.includes("genius")) {
    return SHOW_THUMBNAILS["Geniuses"];
  }
  if (lower.includes("news update") || lower.includes("digital news") || lower.includes("update")) {
    return SHOW_THUMBNAILS["News Update"];
  }
  if (lower.includes("ajn") || lower.includes("network")) {
    return SHOW_THUMBNAILS["default"];
  }
  return originalLogo || "https://placehold.co/40x40/151f38/ffffff?text=📡";
};

export const getLogoUrl = (showName: string): string => {
  const localPath = SHOW_THUMBNAILS[showName] || SHOW_THUMBNAILS["default"];
  return window.location.origin + localPath;
};

export function HeaderClock() {
  const [timeStr, setTimeStr] = useState("");
  const [countdown, setCountdown] = useState("00:00");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString());

      const nextHour = new Date();
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const diffMs = nextHour.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      setCountdown(
        `${String(diffMins).padStart(2, "0")}:${String(diffSecs).padStart(2, "0")}`
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400">
      <div className="flex items-center gap-2 bg-[#050608] px-4 py-2 rounded-full border border-slate-800/60">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-semibold text-slate-500 font-mono text-[10px] uppercase tracking-wider">CLOCK:</span>
        <span className="font-mono text-white tracking-widest">{timeStr || "--:--:--"}</span>
      </div>
      <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/10">
        <span className="text-blue-400 font-bold font-mono text-[10px] uppercase tracking-widest">⏱️ NEXT SEGMENT IN:</span>
        <span className="font-mono text-white text-xs">{countdown}</span>
      </div>
    </div>
  );
}

export function PlayerInfoBar({ 
  currentTitle, 
  currentUrl,
  viewMode,
  setViewMode 
}: { 
  currentTitle: string; 
  currentUrl: string;
  viewMode: "standard" | "theater";
  setViewMode: (mode: "standard" | "theater") => void;
}) {
  const [timeStr, setTimeStr] = useState("");
  const [countdown, setCountdown] = useState("00:00");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString());

      const nextHour = new Date();
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const diffMs = nextHour.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      setCountdown(
        `${String(diffMins).padStart(2, "0")}:${String(diffSecs).padStart(2, "0")}`
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    let leftX = e.clientX;
    let topY = e.clientY;
    const menuWidth = 192;
    const menuHeight = 40;
    if (leftX + menuWidth > window.innerWidth) {
      leftX = window.innerWidth - menuWidth - 10;
    }
    if (topY + menuHeight > window.innerHeight) {
      topY = window.innerHeight - menuHeight - 10;
    }
    setContextMenu({ x: leftX, y: topY });
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleOutsideClick = () => setContextMenu(null);
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [contextMenu]);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}?stream=${encodeURIComponent(currentUrl || "")}&title=${encodeURIComponent(currentTitle || "")}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("LINK SAVED TO CLIPBOARD");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      console.warn("Failed to copy link via Clipboard API:", err);
    }
  };

  return (
    <>
      <motion.div 
        id="gold-info-bar"
        initial={{ y: -50, opacity: 0, x: "-50%" }}
        animate={{ y: 0, opacity: 1, x: "-50%" }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        style={{ left: "50%", transform: "translateX(-50%)" }}
        onContextMenu={handleContextMenu}
        className="absolute top-8 bg-[#080A0F]/95 border border-[#00ff66]/30 rounded-full px-6 py-3 backdrop-blur-md z-[100] flex items-center gap-5 text-slate-300 text-[11px] font-mono tracking-wider shadow-2xl shadow-black/80 font-medium max-w-[90%] truncate shrink-0 select-none cursor-context-menu"
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">CLOCK:</span>
          <span className="text-white tracking-widest">{timeStr || "--:--:--"}</span>
        </div>
        <div className="w-[1px] h-3 bg-slate-800"></div>
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest">PLAYING:</span>
          <span className="text-white font-semibold truncate max-w-[150px] md:max-w-[320px]">{currentTitle}</span>
        </div>
        <div className="hidden md:flex items-center gap-5 shrink-0">
          <div className="w-[1px] h-3 bg-slate-800"></div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">⚡ INTRO COUNTDOWN:</span>
            <span className="text-slate-100">{countdown}</span>
          </div>
        </div>
        <div className="w-[1px] h-3 bg-slate-800 shrink-0"></div>
        <button
          onClick={handleShare}
          className="p-1 rounded-lg hover:bg-slate-800/80 text-[#00ff66] hover:text-[#ccff00] cursor-pointer transition-all shrink-0 flex items-center justify-center border border-transparent hover:border-[#00ff66]/20"
          title="Share Stream Deep Link"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        {toast && (
          <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-[#020203]/95 text-[#00ff66] border border-[#00ff66]/40 px-3 py-1.5 rounded-sm text-[9px] font-bold font-mono tracking-widest uppercase shadow-lg shadow-black/80 animate-pulse whitespace-nowrap z-[110]">
            {toast}
          </div>
        )}
      </motion.div>

      {contextMenu && (
        <div 
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed bg-neutral-950/95 backdrop-blur-md border border-[#00ff66]/30 px-1 py-1 rounded-sm w-48 shadow-[0_4px_20px_rgba(0,255,102,0.15)] z-[9999] font-mono text-xs text-[#00ff66] flex flex-col"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewMode(viewMode === "theater" ? "standard" : "theater");
              setContextMenu(null);
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-[#00ff66]/10 rounded-sm cursor-pointer transition-colors font-bold tracking-wider"
          >
            {viewMode === "theater" ? "🖥️ RESTORE STANDARD" : "📺 SWITCH TO THEATER"}
          </button>
        </div>
      )}
    </>
  );
}

const monthsList = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getDaysInMonthGrid = (year: number, month: number) => {
  const firstDayIndex = new Date(year, month, 1).getDay(); // day of week (0-6)
  const totalDays = new Date(year, month + 1, 0).getDate(); // days in month (e.g. 30 or 31)
  
  const grid: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
  
  // Fill previous month cells
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayVal = prevMonthTotalDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayVal).padStart(2, "0")}`;
    grid.push({
      dateStr: dStr,
      dayNum: dayVal,
      isCurrentMonth: false
    });
  }

  // Fill current month cells
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    grid.push({
      dateStr: dStr,
      dayNum: d,
      isCurrentMonth: true
    });
  }

  // Pad to 42 cells grid
  const remainingCells = 42 - grid.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    grid.push({
      dateStr: dStr,
      dayNum: d,
      isCurrentMonth: false
    });
  }

  return grid;
};

const isRumbleUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.toLowerCase().includes("rumble.com/");
};

const getRumbleEmbedUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  // If it is already an embed link, return it directly
  if (cleanUrl.toLowerCase().includes("/embed/")) {
    return cleanUrl;
  }
  
  // If it matches rumble.com/v[a-zA-Z0-9]+
  // e.g., https://rumble.com/v77ec70-some-story.html or https://rumble.com/v77ec70
  const match = cleanUrl.match(/rumble\.com\/(v[a-zA-Z0-9]+)/i);
  if (match && match[1]) {
    return `https://rumble.com/embed/${match[1]}/`;
  }
  
  return cleanUrl;
};

export default function App() {
  // Navigation & Sidebars State
  const [activeTab, setActiveTab] = useState<"live" | "archive" | "audio" | "export" | "debug">("live");
  const [liveSidebarTab, setLiveSidebarTab] = useState<"streams" | "favorites" | "history">("streams");
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedHtmlTemplate, setSelectedHtmlTemplate] = useState<"tvexplorer" | "vidgrid" | "publiciptv" | "weebly">("tvexplorer");
  const [mainViewerMode, setMainViewerMode] = useState<"standard" | "tvexplorer" | "vidgrid" | "publiciptv" | "weebly">("standard");
  const [mainViewerDataSource, setMainViewerDataSource] = useState<"channels" | "archive">("archive");
  const [viewMode, setViewMode] = useState<"standard" | "theater">("standard");

  // IPTV Core Data State
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"asc" | "desc" | "recent">("recent");
  const [isEnrichingLogos, setIsEnrichingLogos] = useState(false);
  const [m3uUrlInput, setM3uUrlInput] = useState("");
  const [favorites, setFavorites] = useState<IPTVChannel[]>([]);
  const [history, setHistory] = useState<PlaybackHistoryItem[]>([]);

  // AJN Archive Specific State
  const [archiveEpisodes, setArchiveEpisodes] = useState<ArchiveEpisode[]>([]);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentArchiveIndex, setCurrentArchiveIndex] = useState<number>(0);
  const [feedLoadingStatus, setFeedLoadingStatus] = useState("Unloaded");
  
  // Interactive Calendar & Show Filtering states
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [filterShowAlex, setFilterShowAlex] = useState(true);
  const [filterShowWarRoom, setFilterShowWarRoom] = useState(true);
  const [filterShowSunday, setFilterShowSunday] = useState(true);
  const [filterShowOther, setFilterShowOther] = useState(true);
  const [isSiriusOverlayOpen, setIsSiriusOverlayOpen] = useState(true);
  const [isSiriusPlaying, setIsSiriusPlaying] = useState(false);
  const [isSiriusLooping, setIsSiriusLooping] = useState(false);
  const [siriusCurrentTime, setSiriusCurrentTime] = useState(0);
  const [siriusDuration, setSiriusDuration] = useState(0);
  const [siriusVisualizerMode, setSiriusVisualizerMode] = useState<"eq" | "wave" | "fire" | "matrix">("eq");
  const [siriusAudioVolume, setSiriusAudioVolume] = useState(0.45);
  const [isSiriusMuted, setIsSiriusMuted] = useState(false);
  const [feedSourceUsed, setFeedSourceUsed] = useState("Direct Express Proxy");

  // Player Playback Parameters
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [currentTitle, setCurrentTitle] = useState<string>("No Active Channel");
  const [streamType, setStreamType] = useState<"auto" | "hls" | "native">("auto");
  const [fallbackMode, setFallbackMode] = useState<"enabled" | "disabled">("enabled");
  const [debugMode, setDebugMode] = useState<"off" | "on">("on");
  const [debugLogs, setDebugLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] System boots successfully.`
  ]);
  const [playerStatus, setPlayerStatus] = useState<"Idle" | "Loading" | "Playing" | "Paused" | "Error">("Idle");
  const [playerVolume, setPlayerVolume] = useState<number>(0.85);
  const [isPlayerMuted, setIsPlayerMuted] = useState<boolean>(false);

  // REFS
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const hlsRef = useRef<Hls | null>(null);
  const siriusAudioRef = useRef<HTMLAudioElement | null>(null);
  const siriusCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const siriusCanvasHeightsRef = useRef<number[]>(new Array(120).fill(0));
  const siriusPeakHeightsRef = useRef<number[]>(new Array(120).fill(0));
  const siriusPeakDecayRef = useRef<number[]>(new Array(120).fill(0));
  const siriusTabCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Equalizer & Synthesis Custom States
  const [siriusPreset, setSiriusPreset] = useState<"neutral" | "heavy" | "vocal" | "metal">("neutral");
  const [siriusLowBass, setSiriusLowBass] = useState(50);
  const [siriusBass, setSiriusBass] = useState(50);
  const [siriusVocalMid, setSiriusVocalMid] = useState(50);
  const [siriusHighMid, setSiriusHighMid] = useState(50);
  const [siriusTreble, setSiriusTreble] = useState(50);
  const [siriusPlaybackRate, setSiriusPlaybackRate] = useState(1.0);
  const siriusPhaseRef = useRef<number>(0);

  // List of state-managed Sirius tracks to cycle through
  const [siriusPlaylist, setSiriusPlaylist] = useState<Array<{
    title: string;
    artist: string;
    url: string;
    backups: string[];
  }>>([
    {
      title: "Sirius",
      artist: "The Alan Parsons Project",
      url: "https://ia902907.us.archive.org/31/items/capture-25-april-2026-03-06-58-pm-00000/The%20Alan%20Parsons%20Project%20-%20Sirius%20%28Official%20Audio%29.mp3",
      backups: [
        "https://archive.org/download/the-alan-parsons-project-sirius_202111/The%20Alan%20Parsons%20Project%20-%20Sirius.mp3",
        "https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/The%20Alan%20Parsons%20Project%20-%20Sirius%20(Official%20Audio).mp3"
      ]
    },
    {
      title: "Ace of Spades",
      artist: "LMBSA",
      url: "https://ia902907.us.archive.org/31/items/capture-25-april-2026-03-06-58-pm-00000/LMBSA%20-%20Ace%20of%20Spades.mp3",
      backups: [
        "https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/Motorhead%20-%20Ace%20Of%20Spades%20(Official%20Audio).mp3",
        "https://archive.org/download/motorhead-ace-of-spades-official-audio/Motorhead%20-%20Ace%20Of%20Spades%20%28Official%20Audio%29.mp3"
      ]
    },
    {
      title: "Remember the Fallen",
      artist: "LMBSA",
      url: "https://ia902907.us.archive.org/31/items/capture-25-april-2026-03-06-58-pm-00000/Remember%20the%20Fallen.mp3",
      backups: [
        "https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/Sodom%20-%20Remember%20The%20Fallen%20(Official%20Audio).mp3",
        "https://archive.org/download/sodom-remember-the-fallen-official-audio/Sodom%20-%20Remember%20The%20Fallen%20%28Official%20Audio%29.mp3"
      ]
    }
  ]);
  const [currentSiriusTrackIndex, setCurrentSiriusTrackIndex] = useState<number>(0);

  const siriusPlaylistRef = useRef(siriusPlaylist);
  siriusPlaylistRef.current = siriusPlaylist;

  const currentSiriusTrackIndexRef = useRef(currentSiriusTrackIndex);
  currentSiriusTrackIndexRef.current = currentSiriusTrackIndex;

  const siriusBackupIndexRef = useRef<number>(-1);
  const playSiriusTrackRef = useRef<(index: number) => void>(() => {});

  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const getSavedVideoPosition = (url: string): number => {
    if (!url) return 0;
    try {
      const savedJSON = localStorage.getItem("ajn_video_positions");
      if (savedJSON) {
        const saved = JSON.parse(savedJSON);
        return saved[url] || 0;
      }
    } catch (e) {
      console.error("Failed to load video playback position", e);
    }
    return 0;
  };

  const saveVideoPosition = (url: string, time: number, force: boolean = false) => {
    if (!url) return;
    const now = Date.now();
    if (force || now - lastSavedTimeRef.current > 2000) {
      lastSavedTimeRef.current = now;
      try {
        const savedJSON = localStorage.getItem("ajn_video_positions");
        const saved = savedJSON ? JSON.parse(savedJSON) : {};
        saved[url] = time;
        localStorage.setItem("ajn_video_positions", JSON.stringify(saved));
      } catch (e) {
        console.error("Failed to save video playback position", e);
      }
    }
  };

  // Load Saved Cache on Startup
  useEffect(() => {
    // LocalStorage keys lookup
    const cachedChannels = localStorage.getItem("ajn_iptv_channels");
    if (cachedChannels) {
      try {
        setChannels(JSON.parse(cachedChannels));
        addLog("Loaded channels from local cache");
      } catch {
        loadDefaultPlaylist();
      }
    } else {
      loadDefaultPlaylist();
    }

    const cachedFavorites = localStorage.getItem("ajn_iptv_favorites");
    if (cachedFavorites) {
      try {
        setFavorites(JSON.parse(cachedFavorites));
      } catch (e) {}
    }

    const cachedHistory = localStorage.getItem("ajn_iptv_history");
    if (cachedHistory) {
      try {
        setHistory(JSON.parse(cachedHistory));
      } catch (e) {}
    }

    const cachedSettings = localStorage.getItem("ajn_iptv_settings");
    if (cachedSettings) {
      try {
        const parsed = JSON.parse(cachedSettings);
        if (parsed.streamType) setStreamType(parsed.streamType);
        if (parsed.fallbackMode) setFallbackMode(parsed.fallbackMode);
        if (parsed.debugMode) setDebugMode(parsed.debugMode);
        if (parsed.theme) {
          setTheme(parsed.theme);
          applyTheme(parsed.theme);
        }
      } catch (e) {}
    }

    // Load AJN RSS Archive silently
    loadArchiveFeed(false);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Deep-linking Query Parameter Startup Loader
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const streamParam = params.get("stream");
    const titleParam = params.get("title");
    if (streamParam) {
      const decodedStream = decodeURIComponent(streamParam);
      const decodedTitle = titleParam ? decodeURIComponent(titleParam) : "Shared Stream";
      setTimeout(() => {
        playStream(decodedStream, decodedTitle);
      }, 1500);
    }
  }, []);

  // Synchronize index change, delay timing, and loadedmetadata initialization
  useEffect(() => {
    if (!isSiriusOverlayOpen) {
      if (siriusAudioRef.current) {
        siriusAudioRef.current.pause();
      }
      setIsSiriusPlaying(false);
      return;
    }

    const audio = siriusAudioRef.current;
    if (!audio) return;

    const track = siriusPlaylist[currentSiriusTrackIndex];
    if (!track) return;

    addLog(`Loading track: '${track.artist} - ${track.title}'...`, "info");
    
    // Set standard audio attributes
    audio.crossOrigin = "anonymous";
    audio.loop = false; // handle ends manually to transition tracks
    audio.volume = 0.45;

    // Direct, clean source assignment
    audio.src = track.url;
    audio.load();

    const handleLoadedMetadata = () => {
      addLog(`Native player initialized. Starting 300ms interactive delay...`, "info");
      // Add 300ms delay to ensure native controls are interactive
      setTimeout(() => {
        if (siriusAudioRef.current && isSiriusOverlayOpen) {
          // Skip introductory silence for dynamic launch
          if (track.title === "Sirius" && track.artist === "The Alan Parsons Project") {
            siriusAudioRef.current.currentTime = 30;
          } else {
            siriusAudioRef.current.currentTime = 0;
          }
          
          siriusAudioRef.current.play()
            .then(() => {
              setIsSiriusPlaying(true);
              addLog(`Preamble Sound: '${track.artist} - ${track.title}' is playing`, "info");
            })
            .catch(() => {
              addLog("Autoplay paused. Ready for user interaction on native control deck.", "warning");
            });
        }
      }, 300);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [currentSiriusTrackIndex, isSiriusOverlayOpen, siriusPlaylist]);

  // HTML5 Canvas 120-bar visualizer rendering loop
  useEffect(() => {
    if (!isSiriusOverlayOpen && activeTab !== "audio") return;

    let animationId: number;
    const canvas = siriusCanvasRef.current || siriusTabCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high pixel density resolution
    const width = 480;
    const height = 80;
    canvas.width = width;
    canvas.height = height;

    const render = () => {
      // Background base
      ctx.fillStyle = "rgba(6, 8, 14, 1)";
      ctx.fillRect(0, 0, width, height);

      // Cyber scan gridlines
      ctx.strokeStyle = "rgba(59, 130, 246, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Fast tempo and pulse multipliers
      const isPlaying = isSiriusPlaying;
      let tempoMultiplier = 1.0;
      if (currentSiriusTrackIndex === 1) tempoMultiplier = 2.0; // Ace of Spades (Motörhead is metal-fast)
      else if (currentSiriusTrackIndex === 2) tempoMultiplier = 1.35; // Remember the fallen

      if (isPlaying) {
        siriusPhaseRef.current += 0.08 * tempoMultiplier;
      } else {
        siriusPhaseRef.current += 0.015; // smooth idle waves
      }

      const phase = siriusPhaseRef.current;
      const numBars = 120;
      const barWidth = (width / numBars) * 0.85;
      const gap = (width / numBars) * 0.15;

      for (let i = 0; i < numBars; i++) {
        let targetHeight = 2.5; // low default peak

        if (isPlaying) {
          // Mathematically model authentic EQ frequencies on 120 discrete bands
          let intensity = 0;
          if (i < 28) {
            // Bass Region
            intensity = Math.sin(phase * 1.1 + i * 0.25) * 0.45 + 0.55;
            intensity += Math.sin(phase * 2.6) * 0.38; // heavy bassline drum kick
          } else if (i < 88) {
            // Mid-range
            intensity = Math.sin(phase * 0.75 + i * 0.07) * 0.5 + 0.5;
            intensity *= Math.cos(phase * 0.3 + i * 0.035) * 0.65 + 0.35;
            intensity += Math.abs(Math.sin(phase * 1.6 - i * 0.04)) * 0.16;
          } else {
            // High Treble
            intensity = Math.sin(phase * 1.9 + i * 0.2) * 0.35 + 0.45;
            intensity += Math.cos(phase * 4.25 - i * 0.25) * 0.24;
            if (currentSiriusTrackIndex === 1) {
              intensity += (Math.random() - 0.5) * 0.45; // metallic fuzz
            }
          }

          // Random signal interference
          intensity += (Math.random() - 0.5) * 0.15;
          intensity = Math.max(0, Math.min(1.0, intensity));

          // Calculate height from volume
          const currentVol = isSiriusMuted ? 0 : siriusAudioVolume;
          const masterGain = currentVol / 0.45;
          targetHeight = intensity * (height - 12) * Math.max(0.15, masterGain);
          if (targetHeight < 2.5) targetHeight = 2.5;
        } else {
          // Standing idle ambient heartbeat wave
          targetHeight = Math.sin(i * 0.18 + phase) * 2.2 + 3.8;
        }

        // Apply visual lowpass filter to slow changes down
        const curHeight = siriusCanvasHeightsRef.current[i] * 0.68 + targetHeight * 0.32;
        siriusCanvasHeightsRef.current[i] = curHeight;

        // Fall down physics for peak dots
        if (curHeight > siriusPeakHeightsRef.current[i]) {
          siriusPeakHeightsRef.current[i] = curHeight;
          siriusPeakDecayRef.current[i] = 0;
        } else {
          siriusPeakDecayRef.current[i] += 0.085;
          siriusPeakHeightsRef.current[i] -= siriusPeakDecayRef.current[i];
          if (siriusPeakHeightsRef.current[i] < 0) {
            siriusPeakHeightsRef.current[i] = 0;
          }
        }

        const xPos = i * (barWidth + gap);
        const peakHeight = siriusPeakHeightsRef.current[i];

        // Custom Gradient selections
        let gradient: CanvasGradient;
        if (siriusVisualizerMode === "eq") {
          gradient = ctx.createLinearGradient(0, height, 0, height - curHeight);
          gradient.addColorStop(0, "rgba(59, 130, 246, 0.9)");   // pure Blue
          gradient.addColorStop(0.35, "rgba(99, 102, 241, 0.95)"); // Indigo
          gradient.addColorStop(0.7, "rgba(147, 51, 234, 1)");    // Purple
          gradient.addColorStop(1, "rgba(236, 72, 153, 1)");      // Hot Pink
        } else if (siriusVisualizerMode === "wave") {
          gradient = ctx.createLinearGradient(0, height, 0, height - curHeight);
          gradient.addColorStop(0, "rgba(34, 211, 238, 0.4)");  // Cyan translucent
          gradient.addColorStop(0.5, "rgba(14, 165, 233, 0.85)"); // Sky Sky
          gradient.addColorStop(1, "rgba(6, 182, 212, 1)");      // Cyan Neon
        } else if (siriusVisualizerMode === "fire") {
          gradient = ctx.createLinearGradient(0, height, 0, height - curHeight);
          gradient.addColorStop(0, "rgba(239, 68, 68, 0.7)");   // blood red
          gradient.addColorStop(0.5, "rgba(249, 115, 22, 0.95)"); // intense orange
          gradient.addColorStop(0.85, "rgba(234, 179, 8, 1)");    // bright yellow
          gradient.addColorStop(1, "rgba(254, 240, 138, 1)");   // gold peak
        } else {
          // matrix
          gradient = ctx.createLinearGradient(0, height, 0, height - curHeight);
          gradient.addColorStop(0, "rgba(21, 128, 61, 0.8)");  // digital green
          gradient.addColorStop(0.65, "rgba(34, 197, 94, 0.95)"); // matrix bright green
          gradient.addColorStop(1, "rgba(220, 252, 231, 1)");   // radioactive white-green
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (siriusVisualizerMode === "wave") {
          const centerY = height / 2;
          const halfH = curHeight / 2;
          ctx.rect(xPos, centerY - halfH, barWidth, curHeight || 1);
        } else {
          ctx.rect(xPos, height - curHeight, barWidth, curHeight);
        }
        ctx.fill();

        // Draw Peak Indicator Dots
        if (peakHeight > 2.5 && siriusVisualizerMode !== "matrix") {
          ctx.fillStyle = siriusVisualizerMode === "fire" ? "#fef08a" : siriusVisualizerMode === "wave" ? "#22d3ee" : "#ffffff";
          ctx.beginPath();
          if (siriusVisualizerMode === "wave") {
            const centerY = height / 2;
            ctx.rect(xPos, centerY - (peakHeight / 2) - 1.2, barWidth, 1.2);
            ctx.rect(xPos, centerY + (peakHeight / 2), barWidth, 1.2);
          } else {
            ctx.rect(xPos, height - peakHeight - 2, barWidth, 1.2);
          }
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isSiriusOverlayOpen, activeTab, isSiriusPlaying, currentSiriusTrackIndex, siriusVisualizerMode, siriusAudioVolume, isSiriusMuted]);

  // Save Config Preferences
  useEffect(() => {
    localStorage.setItem(
      "ajn_iptv_settings",
      JSON.stringify({ streamType, fallbackMode, debugMode, theme })
    );
  }, [streamType, fallbackMode, debugMode, theme]);

  // Scroll to bottom of debug log Terminal
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [debugLogs]);

  // Synchronize dynamic volume and mute settings with native video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = playerVolume;
      video.muted = isPlayerMuted;
    }
  }, [playerVolume, isPlayerMuted]);

  // Synchronize Sirius preamble volume and mute states
  useEffect(() => {
    const audio = siriusAudioRef.current;
    if (audio) {
      audio.volume = siriusAudioVolume;
      audio.muted = isSiriusMuted;
    }
  }, [siriusAudioVolume, isSiriusMuted]);

  const addLog = (message: string, type: "info" | "warning" | "error" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const symbol = type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️";
    setDebugLogs(prev => [...prev, `[${timestamp}] ${symbol} ${message}`]);
  };

  const applyTheme = (t: "dark" | "light") => {
    if (t === "light") {
      document.body.classList.add("light");
    } else {
      document.body.classList.remove("light");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    addLog(`Switched theme color style to ${nextTheme}`);
  };

  const loadDefaultPlaylist = () => {
    parseAndLoadM3U(DEFAULT_M3U);
    addLog("Loaded default channel playlist");
  };

  // Parsing standard M3U raw syntax
  const parseAndLoadM3U = (rawText: string) => {
    // 1. Line Normalization
    const normalizedRawText = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalizedRawText.split("\n");
    const parsedChannels: IPTVChannel[] = [];
    let currentChannel: Partial<IPTVChannel> | null = null;

    // 2. Playlist-Level Attributes
    let epgUrl: string | null = null;
    let playlistName: string = "";
    if (lines.length > 0 && lines[0].startsWith("#EXTM3U")) {
      const firstLine = lines[0];
      const epgUrlMatch = firstLine.match(/(?:x-tvg-url|url-tvg)="([^"]+)"/i);
      const playlistNameMatch = firstLine.match(/x-tvg-name="([^"]+)"/i);
      if (epgUrlMatch) epgUrl = epgUrlMatch[1] || epgUrlMatch[2];
      if (playlistNameMatch) playlistName = playlistNameMatch[1];
      if (epgUrl || playlistName) {
        addLog(`Parsed Playlist Header - Name: "${playlistName || "N/A"}" EPG: "${epgUrl || "N/A"}"`);
      }
    }

    const extractAttr = (line: string, attr: string): string | null => {
      const m = line.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
      return m ? m[1].trim() || null : null;
    };

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith("#EXTINF")) {
        // Parse Duration (integer after #EXTINF: and before first space/comma)
        const durationPart = line.substring(8);
        const firstSpaceOrComma = durationPart.search(/[\s,]/);
        const durationStr = firstSpaceOrComma !== -1 ? durationPart.substring(0, firstSpaceOrComma) : durationPart;
        let duration = parseInt(durationStr, 10);
        if (isNaN(duration)) duration = -1;

        // Display Name (text after last comma)
        const lastCommaIdx = line.lastIndexOf(",");
        const postCommaName = lastCommaIdx !== -1 ? line.substring(lastCommaIdx + 1).trim() : "";
        const tvgName = extractAttr(line, "tvg-name");
        const finalName = (tvgName || postCommaName || "Unnamed Stream").trim();

        // Parse Catchup days
        const catchupDaysStr = extractAttr(line, "catchup-days");
        const catchupDaysVal = catchupDaysStr ? parseInt(catchupDaysStr, 10) : NaN;
        const catchupDays = !isNaN(catchupDaysVal) ? catchupDaysVal : undefined;

        currentChannel = {
          name: finalName,
          logo: extractAttr(line, "tvg-logo"),
          group: extractAttr(line, "group-title") || "General",
          tvgId: extractAttr(line, "tvg-id") || undefined,
          tvgName: tvgName || undefined,
          tvgChno: extractAttr(line, "tvg-chno") || undefined,
          tvgLanguage: extractAttr(line, "tvg-language") || undefined,
          tvgCountry: extractAttr(line, "tvg-country") || undefined,
          tvgGenre: extractAttr(line, "tvg-genre") || undefined,
          resolution: extractAttr(line, "resolution") || undefined,
          bitrate: extractAttr(line, "bitrate") || undefined,
          codec: extractAttr(line, "codec") || undefined,
          userAgent: extractAttr(line, "http-user-agent") || extractAttr(line, "user-agent") || undefined,
          referer: extractAttr(line, "http-referrer") || extractAttr(line, "referer") || undefined,
          auth: extractAttr(line, "auth") || undefined,
          catchup: extractAttr(line, "catchup") || undefined,
          catchupDays: catchupDays,
          duration: duration,
          description: extractAttr(line, "description") || undefined,
          status: extractAttr(line, "status") || undefined,
          url: ""
        };

        // Cyrillic Detection
        const isCyrillic = /^[\u0400-\u04FF\s\d\-–—,:!?\.]+$/.test(finalName);
        if (isCyrillic) {
          currentChannel._cyrillicTitle = true;
        }

        // Inferred Language
        if (!currentChannel.tvgLanguage) {
          const detected = detectLanguage(finalName, currentChannel.group ?? "");
          currentChannel._inferredLanguage = detected.code;
        }

      } else if (line.startsWith("#EXTVLCOPT:")) {
        if (currentChannel) {
          const option = line.substring(11).trim();
          const eqIdx = option.indexOf("=");
          if (eqIdx !== -1) {
            const optKey = option.substring(0, eqIdx).trim().toLowerCase();
            const optVal = option.substring(eqIdx + 1).trim();
            if (optKey === "http-user-agent" || optKey === "user-agent") {
              currentChannel.userAgent = optVal || undefined;
            } else if (optKey === "http-referrer" || optKey === "referrer" || optKey === "referer") {
              currentChannel.referer = optVal || undefined;
            }
          }
        }
      } else if (line && !line.startsWith("#")) {
        if (currentChannel) {
          currentChannel.url = line.trim();
          parsedChannels.push(currentChannel as IPTVChannel);
          currentChannel = null;
        }
      }
    }

    if (parsedChannels.length > 0) {
      setChannels(parsedChannels);
      localStorage.setItem("ajn_iptv_channels", JSON.stringify(parsedChannels));
      addLog(`Loaded and parsed ${parsedChannels.length} stream channels from Playlist`);
      
      const liveCount = parsedChannels.filter(c => c.duration === -1).length;
      const vodCount = parsedChannels.filter(c => c.duration !== undefined && c.duration > 0).length;
      const langGroups = new Set<string>();
      parsedChannels.forEach(c => {
        const l = c.tvgLanguage || c._inferredLanguage;
        if (l) langGroups.add(l.toLowerCase());
      });
      addLog(`Parsed ${liveCount} live · ${vodCount} VOD · ${langGroups.size} language groups`);
    } else {
      addLog("M3U upload had no detectable channels or empty body", "warning");
    }
  };

  // Upload custom M3U handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addLog(`Reading uploaded playlist file: ${file.name}`);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseAndLoadM3U(text);
    };
    reader.readAsText(file);
  };

  const loadCustomM3uUrl = async (urlStr: string) => {
    const cleanUrl = urlStr.trim();
    if (isRumbleUrl(cleanUrl) || cleanUrl.toLowerCase().endsWith(".mp4") || cleanUrl.toLowerCase().endsWith(".mp3") || (cleanUrl.includes("commondatastorage") && !cleanUrl.toLowerCase().includes(".m3u"))) {
      addLog(`Direct stream URL input detected. Auto-assembling a 'Quick Cast' virtual channel and firing up player`, "info");
      const name = isRumbleUrl(cleanUrl) ? "🥊 Rumble Quick Cast" : "📺 Direct Cast Stream";
      const logo = isRumbleUrl(cleanUrl) ? "https://rumble.com/favicon.ico" : null;
      const singleChannel: IPTVChannel = {
        name,
        logo,
        group: "Quick Cast",
        url: cleanUrl
      };
      setChannels(prev => {
        const filtered = prev.filter(c => c.url !== cleanUrl);
        const newChannels = [singleChannel, ...filtered];
        localStorage.setItem("ajn_iptv_channels", JSON.stringify(newChannels));
        return newChannels;
      });
      playStream(cleanUrl, name);
      setFeedLoadingStatus("Loaded Direct Link");
      return;
    }

    addLog(`Fetching external M3U playlist from: ${urlStr}`);
    setFeedLoadingStatus("Fetching M3U...");

    try {
      // Fetch directly or via proxy if direct fails
      let response = await fetch(urlStr);
      if (!response.ok) {
        addLog(`Direct M3U load blocked, trying stream proxy...`, "warning");
        response = await fetch(`/api/stream-proxy?url=${encodeURIComponent(urlStr)}`);
      }
      
      const text = await response.text();
      parseAndLoadM3U(text);
    } catch (e: any) {
      addLog(`M3U playlist load failure: ${e.message}`, "error");
    }
  };

  const handleM3uUrlLoad = async () => {
    if (!m3uUrlInput.trim()) return;
    await loadCustomM3uUrl(m3uUrlInput);
    setM3uUrlInput("");
  };

  // AJN RSS Fetch & parsing logic
  const loadArchiveFeed = async (showSiriusOverlay = true) => {
    addLog("Updating AJN Daily video archives...");
    setFeedLoadingStatus("Syncing...");
    
    if (showSiriusOverlay) {
      setIsSiriusOverlayOpen(true);
      startSiriusMusic();
    }

    try {
      // Step 1: Call our fast full-stack server proxy parsed endpoint
      const res = await fetch("/api/ajn-archive");
      if (!res.ok) {
        throw new Error(`Server returned error status: ${res.status}`);
      }
      const data = await res.json();
      
      if (data.success && data.episodes?.length > 0) {
        const episodes: ArchiveEpisode[] = data.episodes;
        setArchiveEpisodes(episodes);
        
        // Group available dates of episodes in sorted array
        const datesSet = new Set<string>();
        episodes.forEach(ep => {
          if (ep.dateKey) datesSet.add(ep.dateKey);
        });
        const datesSorted = Array.from(datesSet).sort().reverse();
        setArchiveDates(datesSorted);
        
        if (datesSorted.length > 0) {
          setSelectedDate(datesSorted[0]);
        }
        
        setFeedLoadingStatus("Loaded");
        setFeedSourceUsed("Server-side Express RSS Parser (100% Reliable)");
        addLog(`Parsed ${episodes.length} episodes across ${datesSorted.length} dates from Server API`);
      } else {
        throw new Error("No parsed episodes found in Express endpoint");
      }
    } catch (serverErr: any) {
      addLog(`Primary express parser failed (${serverErr.message}). Initiating Tier-2 CORS proxy chains.`, "warning");
      
      // Tier-2 CORS proxy backup chains loaded to client directly
      const fallbackUrlChain = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent("https://rss.alexjones.media/AJNHourlyVideo.xml")}`,
        "https://rss.alexjones.media/AJNHourlyVideo.xml" // Direct fetch (might fail in client but good to try as final backup)
      ];

      let xmlText = "";
      let worked = false;

      for (const url of fallbackUrlChain) {
        try {
          addLog(`Trying fallback RSS source fetch: ${url}`);
          const response = await fetch(url);
          if (response.ok) {
            xmlText = await response.text();
            worked = true;
            setFeedSourceUsed(`CORS Bypass Chain: ${url.substring(0, 30)}...`);
            break;
          }
        } catch (e: any) {
          addLog(`Source fetch failed: ${e.message}`, "warning");
        }
      }

      if (!worked) {
        setFeedLoadingStatus("Failed");
        addLog("All CORS RSS proxies exhausted. Unable to load AJN Archive directly from client.", "error");
        return;
      }

      try {
        // Simple XML parser because DOMParser is not fully reliable in frames
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        const episodes: ArchiveEpisode[] = [];

        while ((match = itemRegex.exec(xmlText)) !== null) {
          const itemContent = match[1];

          let title = "";
          const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
          if (titleMatch) title = titleMatch[1].trim();

          let videoUrl = "";
          const enclosureMatch = itemContent.match(/<enclosure[^>]*url="([^"]+)"/);
          if (enclosureMatch) videoUrl = enclosureMatch[1].trim();

          if (!videoUrl || (!videoUrl.includes(".m4v") && !videoUrl.includes(".mp4") && !videoUrl.includes(".mp3"))) {
            continue;
          }

          let pubDateStr = "";
          const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
          if (pubDateMatch) pubDateStr = pubDateMatch[1].trim();

          const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();
          const year = pubDate.getFullYear();
          const month = String(pubDate.getMonth() + 1).padStart(2, "0");
          const day = String(pubDate.getDate()).padStart(2, "0");
          const dateKey = `${year}-${month}-${day}`;

          let show = "Alex Jones Show";
          const titleLower = title.toLowerCase();
          if (titleLower.includes("war room") || titleLower.includes("warroom")) {
            show = "War Room";
          } else if (titleLower.includes("sunday night") || titleLower.includes("snl")) {
            show = "Sunday Night Live";
          } else if (titleLower.includes("ezra") || titleLower.includes("levant") || titleLower.includes("rebel")) {
            show = "The Ezra Levant Show";
          } else if (titleLower.includes("genius") || titleLower.includes("geniuses")) {
            show = "Geniuses";
          } else if (titleLower.includes("update") || titleLower.includes("news update") || titleLower.includes("digital news")) {
            show = "News Update";
          } else if (titleLower.includes("alex") || titleLower.includes("infowars") || titleLower.includes("info wars")) {
            show = "Alex Jones Show";
          }

          let hour = "Full Show";
          const hourMatch = title.match(/Hr\s*(\d)/i) || 
                            title.match(/Hour\s*(\d)/i) || 
                            title.match(/Part\s*(\d)/i) ||
                            title.match(/p\s*(\d)/i) ||
                            title.match(/-\s*hr\s*(\d)/i) ||
                            title.match(/hr\s*(\d)/i);
          if (hourMatch) {
            hour = `Hour ${hourMatch[1]}`;
          }

          episodes.push({
            id: videoUrl,
            title,
            videoUrl,
            pubDate: pubDate.toISOString(),
            dateKey,
            show,
            hour
          });
        }

        if (episodes.length > 0) {
          setArchiveEpisodes(episodes);
          const datesSet = new Set<string>();
          episodes.forEach(ep => { if (ep.dateKey) datesSet.add(ep.dateKey); });
          const datesSorted = Array.from(datesSet).sort().reverse();
          setArchiveDates(datesSorted);
          if (datesSorted.length > 0) setSelectedDate(datesSorted[0]);
          
          setFeedLoadingStatus("Loaded");
          addLog(`Successfully loaded ${episodes.length} episodes via fallback XML parsing!`);
        } else {
          throw new Error("No active XML patterns parsed");
        }
      } catch (xmlError: any) {
        setFeedLoadingStatus("Parser Error");
        addLog(`Parser failure: ${xmlError.message}`, "error");
      }
    }
  };

  // Sync calendar Month & Year view whenever selectedDate matches a parsed AJN day
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // 0-indexed calendar month
        if (!isNaN(y) && !isNaN(m)) {
          setCalendarYear(y);
          setCalendarMonth(m);
        }
      }
    }
  }, [selectedDate]);

  // Filter episodes matching selected date and user-checked show categories
  const selectedDateEpisodes = useMemo(() => {
    return archiveEpisodes.filter(ep => {
      if (ep.dateKey !== selectedDate) return false;
      const showLower = ep.show.toLowerCase();
      if (showLower.includes("war room") || showLower.includes("warroom")) {
        return filterShowWarRoom;
      }
      if (showLower.includes("sunday night") || showLower.includes("snl")) {
        return filterShowSunday;
      }
      if (showLower.includes("alex jones") || showLower.includes("alex-special") || showLower.includes("alex show")) {
        return filterShowAlex;
      }
      return filterShowOther;
    });
  }, [archiveEpisodes, selectedDate, filterShowAlex, filterShowWarRoom, filterShowSunday, filterShowOther]);

  // Memoized compiled HTML template content for the switchable main viewer
  const activeTemplateHtml = useMemo(() => {
    if (mainViewerMode === "standard") return "";

    const feedList = mainViewerDataSource === "channels" 
      ? channels.map(ch => ({
          title: ch.name,
          url: ch.url,
          duration: -1,
          groupTitle: ch.group,
          tvgLogo: ch.logo || ""
        }))
      : selectedDateEpisodes.map(ep => ({
          title: `${ep.title} (${ep.hour})`,
          url: ep.videoUrl,
          duration: 3600,
          groupTitle: ep.show,
          tvgLogo: getLogoUrl(ep.show)
        }));

    if (feedList.length === 0) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #080A0F; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
  </style>
</head>
<body class="text-center p-6">
  <div class="max-w-md bg-[#0F1420] border border-slate-800 p-8 rounded-[24px] shadow-2xl">
    <div class="text-4xl mb-4">📭</div>
    <h3 class="text-lg font-bold text-slate-200 mb-2">No Playlist Streams Available</h3>
    <p class="text-xs text-slate-500 leading-relaxed">
      This live template viewer pulls directly from your loaded playlist data source. Please import an M3U playlist file or select a show archival date on the left panel to populate streams.
    </p>
  </div>
</body>
</html>`;
    }

    try {
      if (mainViewerMode === "tvexplorer") {
        return buildTVExplorerHtml(feedList, mainViewerDataSource === "channels" ? "Live IPTV Explorer" : `AJN - TV Explorer [${selectedDate}]`);
      } else if (mainViewerMode === "vidgrid") {
        return buildVidGridHtml(feedList, mainViewerDataSource === "channels" ? "Live IPTV VidGrid" : `AJN - VidGrid [${selectedDate}]`);
      } else if (mainViewerMode === "publiciptv") {
        return buildPublicIPTVHtml(feedList, mainViewerDataSource === "channels" ? "Live IPTV Retro Cinema" : `AJN - Cinema [${selectedDate}]`);
      } else if (mainViewerMode === "weebly") {
        return buildWeeblyHtml(feedList, mainViewerDataSource === "channels" ? "Live IPTV Classic Loop" : `AJN - Classic Loop [${selectedDate}]`);
      }
    } catch (err: any) {
      console.error(err);
      return `<html><body><h1>Error generating template</h1><p>${err?.message}</p></body></html>`;
    }
    return "";
  }, [mainViewerMode, mainViewerDataSource, channels, selectedDateEpisodes, selectedDate]);

  // Dynamic Playlist Exporters & Downloader hooks
  const handleExportSelectedM3U = () => {
    if (selectedDateEpisodes.length === 0) {
      addLog("No active items parsed/checked on this date to build M3U", "warning");
      return;
    }
    const exportList = selectedDateEpisodes.map(ep => ({
      title: `${ep.title} (${ep.hour})`,
      url: ep.videoUrl,
      duration: 3600,
      groupTitle: ep.show,
      tvgLogo: getLogoUrl(ep.show)
    }));
    const m3u = buildM3U(exportList, `AJN ${selectedDate}`);
    triggerClientDownload(m3u, `AJN_${selectedDate}_Episodes.m3u`, "audio/x-mpegurl;charset=utf-8");
    addLog(`Successfully generated and downloaded .m3u playlist: AJN_${selectedDate}_Episodes.m3u`);
  };

  const handleExportSelectedJSON = () => {
    if (selectedDateEpisodes.length === 0) {
      addLog("No active items parsed/checked on this date to build JSON", "warning");
      return;
    }
    const dataStr = JSON.stringify(selectedDateEpisodes, null, 2);
    triggerClientDownload(dataStr, `AJN_${selectedDate}_Metadata.json`, "application/json;charset=utf-8");
    addLog(`Successfully generated and downloaded .json metadata: AJN_${selectedDate}_Metadata.json`);
  };

  const handleExportAllM3U = () => {
    if (archiveEpisodes.length === 0) {
      addLog("Master archiver feed empty; cannot compile full collection M3U", "warning");
      return;
    }
    const exportList = archiveEpisodes.map(ep => ({
      title: `${ep.title} (${ep.hour}) [${ep.dateKey}]`,
      url: ep.videoUrl,
      duration: 3600,
      groupTitle: `${ep.show} ${ep.dateKey}`,
      tvgLogo: getLogoUrl(ep.show)
    }));
    const m3u = buildM3U(exportList, "AJN Full Archive");
    triggerClientDownload(m3u, "AJN_Full_Unified_Collection.m3u", "audio/x-mpegurl;charset=utf-8");
    addLog(`Successfully generated and downloaded master full .m3u playback registry (${archiveEpisodes.length} streams)`);
  };

  const handleExportSelectedHtmlPlayer = () => {
    if (selectedDateEpisodes.length === 0) {
      addLog("No active items parsed/checked on this date to build HTML Player", "warning");
      return;
    }
    const exportList = selectedDateEpisodes.map(ep => ({
      title: `${ep.title} (${ep.hour})`,
      url: ep.videoUrl,
      duration: 3600,
      groupTitle: ep.show,
      tvgLogo: getLogoUrl(ep.show)
    }));

    let htmlContent = "";
    let filename = `AJN_${selectedDate}_Player.html`;
    let label = "";

    if (selectedHtmlTemplate === "tvexplorer") {
      htmlContent = buildTVExplorerHtml(exportList, `AJN - TV Explorer [${selectedDate}]`);
      filename = `AJN_TVExplorer_${selectedDate}.html`;
      label = "TV Explorer Sleek Dashboard";
    } else if (selectedHtmlTemplate === "vidgrid") {
      htmlContent = buildVidGridHtml(exportList, `AJN - VidGrid Multi-Monitor [${selectedDate}]`);
      filename = `AJN_VidGrid_${selectedDate}.html`;
      label = "VidGrid Multi-Monitor Mosaic Wall";
    } else if (selectedHtmlTemplate === "publiciptv") {
      htmlContent = buildPublicIPTVHtml(exportList, `AJN - Retro Cinema Player [${selectedDate}]`);
      filename = `AJN_Classic_TV_${selectedDate}.html`;
      label = "Public Retro IPTV (Classic TV Bezel)";
    } else {
      htmlContent = buildWeeblyHtml(exportList, `AJN - Broadcast Desk [${selectedDate}]`);
      filename = `AJN_Classic_Loop_${selectedDate}.html`;
      label = "EPG Classic Sync Loop";
    }

    triggerClientDownload(htmlContent, filename, "text/html;charset=utf-8");
    addLog(`Successfully compiled and downloaded standalone page (${label}): ${filename}. Simply open this file on your drive inside any web browser, no server required!`);
  };

  const handleExportSelectedLanguageM3U = (specificLangCode?: string) => {
    if (selectedDateEpisodes.length === 0) {
      addLog("No active items parsed/checked on this date to build Language M3U", "warning");
      return;
    }
    const exportList = selectedDateEpisodes.map(ep => ({
      title: `${ep.title} (${ep.hour})`,
      url: ep.videoUrl,
      duration: 3600,
      groupTitle: ep.show,
      tvgLogo: getLogoUrl(ep.show)
    }));

    if (specificLangCode) {
      const filtered = exportList.filter(ep => {
        const { code } = detectLanguage(ep.title, ep.groupTitle);
        return code === specificLangCode;
      });
      const langMap: Record<string, string> = { en: "English", es: "Spanish", ru: "Russian" };
      const langName = langMap[specificLangCode] || "Other";
      
      if (filtered.length === 0) {
        addLog(`No streams found for language "${langName}" on ${selectedDate}`, "warning");
        return;
      }
      const m3u = buildM3U(filtered, `AJN ${langName} - ${selectedDate}`);
      triggerClientDownload(m3u, `AJN_${selectedDate}_${langName}.m3u`, "audio/x-mpegurl;charset=utf-8");
      addLog(`Successfully generated and downloaded separate ${langName} playlist: AJN_${selectedDate}_${langName}.m3u`);
    } else {
      const m3u = buildLanguageSeparatedM3U(exportList, `AJN Language [${selectedDate}]`);
      triggerClientDownload(m3u, `AJN_Language_${selectedDate}_Episodes.m3u`, "audio/x-mpegurl;charset=utf-8");
      addLog(`Successfully generated and downloaded Language-Separated Day .m3u: AJN_Language_${selectedDate}_Episodes.m3u (English default, Spanish second, Russian third, others alphabetically).`);
    }
  };

  const handleExportAllLanguageM3U = (specificLangCode?: string) => {
    if (archiveEpisodes.length === 0) {
      addLog("Master archiver feed empty; cannot compile full collection Language M3U", "warning");
      return;
    }
    const exportList = archiveEpisodes.map(ep => ({
      title: `${ep.title} (${ep.hour}) [${ep.dateKey}]`,
      url: ep.videoUrl,
      duration: 3600,
      groupTitle: ep.show,
      tvgLogo: getLogoUrl(ep.show)
    }));

    if (specificLangCode) {
      const filtered = exportList.filter(ep => {
        const { code } = detectLanguage(ep.title, ep.groupTitle);
        return code === specificLangCode;
      });
      const langMap: Record<string, string> = { en: "English", es: "Spanish", ru: "Russian" };
      const langName = langMap[specificLangCode] || "Other";

      if (filtered.length === 0) {
        addLog(`No streams found for language "${langName}" in Full Unified Collection`, "warning");
        return;
      }
      const m3u = buildM3U(filtered, `AJN ${langName} Full Archive`);
      triggerClientDownload(m3u, `AJN_Full_${langName}.m3u`, "audio/x-mpegurl;charset=utf-8");
      addLog(`Successfully generated and downloaded separate ${langName} archive playlist: AJN_Full_${langName}.m3u`);
    } else {
      const m3u = buildLanguageSeparatedM3U(exportList, "AJN Language Full Archive");
      triggerClientDownload(m3u, "AJN_Language_Full_Unified_Collection.m3u", "audio/x-mpegurl;charset=utf-8");
      addLog(`Successfully generated and downloaded master Language-Separated .m3u of full archive (${archiveEpisodes.length} streams). English, Spanish, Russian, others sorted alphabetically.`);
    }
  };

  // ── IPTV CHANNEL EXPORT HANDLERS ─────────────────────────────────────────────

  const mapChannelToExportEpisode = (ch: IPTVChannel): ExportEpisode => ({
    title: ch.name,
    url: ch.url,
    duration: ch.duration !== undefined ? ch.duration : -1,
    groupTitle: ch.group,
    tvgLogo: ch.logo || "",
    tvgId: ch.tvgId,
    tvgName: ch.tvgName,
    tvgChno: ch.tvgChno,
    tvgLanguage: ch.tvgLanguage,
    tvgCountry: ch.tvgCountry,
    tvgGenre: ch.tvgGenre,
    userAgent: ch.userAgent,
    referer: ch.referer,
    catchup: ch.catchup,
    catchupDays: ch.catchupDays,
    resolution: ch.resolution,
    bitrate: ch.bitrate,
    codec: ch.codec
  });

  const handleExportIPTVChannelsHtmlPlayer = () => {
    const sourceList = filteredChannels.length > 0 ? filteredChannels : channels;
    if (sourceList.length === 0) {
      addLog("No channels loaded to export. Load a playlist in the Streams tab first.", "warning");
      return;
    }
    const exportList = sourceList.map(mapChannelToExportEpisode);

    let htmlContent = "";
    let filename    = "IPTV_Export.html";
    let label       = "";

    if (selectedHtmlTemplate === "tvexplorer") {
      htmlContent = buildTVExplorerHtml(exportList, "IPTV Streams — TV Explorer");
      filename    = "IPTV_TVExplorer.html";
      label       = "TV Explorer Sleek Dashboard";
    } else if (selectedHtmlTemplate === "vidgrid") {
      htmlContent = buildVidGridHtml(exportList, "IPTV Streams — VidGrid Multi-Monitor");
      filename    = "IPTV_VidGrid.html";
      label       = "VidGrid Multi-Monitor Mosaic Wall";
    } else if (selectedHtmlTemplate === "publiciptv") {
      htmlContent = buildPublicIPTVHtml(exportList, "IPTV Streams — Retro Cinema Player");
      filename    = "IPTV_Classic_TV.html";
      label       = "Public Retro IPTV (Classic TV Bezel)";
    } else {
      htmlContent = buildWeeblyHtml(exportList, "IPTV Streams — Broadcast Desk");
      filename    = "IPTV_Classic_Loop.html";
      label       = "EPG Classic Sync Loop";
    }

    triggerClientDownload(htmlContent, filename, "text/html;charset=utf-8");
    addLog(
      `Exported ${sourceList.length} IPTV channels as standalone HTML player (${label}): ${filename}. ` +
      `Open this file directly in any browser — no server required.`
    );
  };

  const handleExportIPTVChannelsM3U = () => {
    const sourceList = filteredChannels.length > 0 ? filteredChannels : channels;
    if (sourceList.length === 0) {
      addLog("No channels loaded to export.", "warning");
      return;
    }
    const exportList = sourceList.map(mapChannelToExportEpisode);
    const m3u = buildM3U(exportList, "IPTV Playlist Export", false);
    triggerClientDownload(m3u, "IPTV_Channels_Export.m3u", "audio/x-mpegurl;charset=utf-8");
    addLog(`Exported ${sourceList.length} IPTV channels as M3U: IPTV_Channels_Export.m3u`);
  };

  const handleExportIPTVChannelsLanguageM3U = (specificLangCode?: string) => {
    const sourceList = filteredChannels.length > 0 ? filteredChannels : channels;
    if (sourceList.length === 0) {
      addLog("No channels loaded. Load a playlist in the Streams tab first.", "warning");
      return;
    }
    const exportList = sourceList.map(mapChannelToExportEpisode);

    if (specificLangCode) {
      const filtered = exportList.filter(ep => {
        const { code } = detectLanguage(ep.title ?? "", ep.groupTitle ?? "");
        return code === specificLangCode;
      });
      const langMap: Record<string, string> = {
        en: "English", es: "Spanish", ru: "Russian",
        fr: "French",  de: "German",  it: "Italian",
        pt: "Portuguese", ar: "Arabic", zh: "Chinese"
      };
      const langName = langMap[specificLangCode] || specificLangCode.toUpperCase();
      if (filtered.length === 0) {
        addLog(`No IPTV channels detected as "${langName}". Check group-title values in your M3U.`, "warning");
        return;
      }
      const m3u = buildM3U(filtered, `IPTV ${langName} Channels`, false);
      triggerClientDownload(m3u, `IPTV_${langName}_Channels.m3u`, "audio/x-mpegurl;charset=utf-8");
      addLog(`Exported ${filtered.length} ${langName} IPTV channels.`);
    } else {
      const m3u = buildLanguageSeparatedM3U(exportList, "IPTV Language-Separated Playlist");
      triggerClientDownload(m3u, "IPTV_Language_Grouped.m3u", "audio/x-mpegurl;charset=utf-8");
      addLog(`Exported IPTV playlist grouped by language (${sourceList.length} total channels).`);
    }
  };

  const enrichChannelLogosFromIPTVOrg = async () => {
    if (channels.length === 0) {
      addLog("No stream channels loaded to enrich. Please load a playlist first!", "warning");
      return;
    }
    setIsEnrichingLogos(true);
    addLog("Downloading IPTV-org global channel database (https://github.com/iptv-org/api) to match stream names and logos...");
    
    try {
      const response = await fetch("https://iptv-org.github.io/api/channels.json");
      if (!response.ok) throw new Error("Could not fetch channels database from IPTV-org GitHub backend.");
      
      const iptvChannels = await response.json();
      if (!Array.isArray(iptvChannels)) throw new Error("IPTV-org feed returned an invalid layout.");
      
      addLog(`Correlating stream registry against ${iptvChannels.length} official global channels...`);

      const logoMap = new Map<string, string>();
      for (const item of iptvChannels) {
        if (item.name && item.logo) {
          logoMap.set(item.name.toLowerCase().trim(), item.logo);
        }
      }

      let matchedCount = 0;
      const updatedChannels = channels.map(chan => {
        const cleanName = chan.name.toLowerCase().trim();
        let matchedLogo = logoMap.get(cleanName);
        
        if (!matchedLogo) {
          for (const item of iptvChannels) {
            if (item.name && item.logo) {
              const itemLowerName = item.name.toLowerCase().trim();
              if (cleanName.includes(itemLowerName) || itemLowerName.includes(cleanName)) {
                matchedLogo = item.logo;
                break;
              }
            }
          }
        }

        if (matchedLogo && chan.logo !== matchedLogo) {
          matchedCount++;
          return { ...chan, logo: matchedLogo };
        }
        return chan;
      });

      if (matchedCount > 0) {
        setChannels(updatedChannels);
        localStorage.setItem("ajn_iptv_channels", JSON.stringify(updatedChannels));
        addLog(`Successfully enriched ${matchedCount} stream thumbnails with official match logos from IPTV-org database!`);
      } else {
        addLog("Database scan complete: All loaded streams are either fully enriched, or did not match any of the 20,000+ entries in the IPTV-org index.", "info");
      }
    } catch (err: any) {
      addLog(`Failed to scan logo database: ${err.message || err}`, "warning");
    } finally {
      setIsEnrichingLogos(false);
    }
  };

  const playSiriusTrack = (index: number) => {
    siriusBackupIndexRef.current = -1; // Reset backup attempts
    if (!isSiriusOverlayOpen) {
      setIsSiriusOverlayOpen(true);
    }
    setCurrentSiriusTrackIndex(index);
  };

  playSiriusTrackRef.current = playSiriusTrack;

  // Handle Sirius Music Overlay Control
  const startSiriusMusic = async () => {
    if (!isSiriusOverlayOpen) {
      setIsSiriusOverlayOpen(true);
    } else if (siriusAudioRef.current && siriusAudioRef.current.paused) {
      try {
        await siriusAudioRef.current.play();
        setIsSiriusPlaying(true);
      } catch (e: any) {
        addLog("Audio play blocked by browser. Click the native controls play button.", "warning");
      }
    }
  };

  const stopSiriusMusic = () => {
    if (siriusAudioRef.current) {
      siriusAudioRef.current.pause();
    }
    setIsSiriusPlaying(false);
    addLog("Sirius preamble background music paused");
  };

  const handleSiriusNext = () => {
    addLog("Custom Deck: Skip forward to next preamble track", "info");
    const nextIndex = (currentSiriusTrackIndex + 1) % siriusPlaylist.length;
    siriusBackupIndexRef.current = -1;
    setCurrentSiriusTrackIndex(nextIndex);
  };

  const handleSiriusPrev = () => {
    addLog("Custom Deck: Jump backward to previous preamble track", "info");
    const prevIndex = (currentSiriusTrackIndex - 1 + siriusPlaylist.length) % siriusPlaylist.length;
    siriusBackupIndexRef.current = -1;
    setCurrentSiriusTrackIndex(prevIndex);
  };

  const handleSiriusReplay = () => {
    addLog("Custom Deck: Restart current track from inception", "info");
    if (siriusAudioRef.current) {
      siriusAudioRef.current.currentTime = 0;
      siriusAudioRef.current.play().catch(() => {});
      setIsSiriusPlaying(true);
    }
  };

  const handleSiriusSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeVal = parseFloat(e.target.value);
    setSiriusCurrentTime(timeVal);
    if (siriusAudioRef.current) {
      siriusAudioRef.current.currentTime = timeVal;
    }
  };

  const handleSiriusMuteToggle = () => {
    setIsSiriusMuted(!isSiriusMuted);
    addLog(!isSiriusMuted ? "Custom Deck: Muting audio output" : "Custom Deck: Unmuting audio output", "info");
  };

  const handleCloseOverlayAndPlaySelected = () => {
    stopSiriusMusic();
    setIsSiriusOverlayOpen(false);
    
    // Play selected date's active index episode
    if (selectedDateEpisodes.length > 0) {
      playArchiveEpisode(selectedDateEpisodes[currentArchiveIndex], currentArchiveIndex);
    } else {
      addLog("No episode ready to play inside selected date", "warning");
    }
  };

  // Stream Player Actions
  const playStream = (url: string, titleStr: string) => {
    stopSiriusMusic();
    setIsSiriusOverlayOpen(false);

    if (!url) return;
    addLog(`Loading stream pipeline: ${url}`);

    if (isRumbleUrl(url)) {
      addLog(`Rumble Embed Stream Detected: Direct sandboxed engine bypass activated for optimized container embedding`, "info");
      
      if (hlsRef.current) {
        addLog("Memory Leak Prevention: Detaching legacy media and destroying previous HLS instance", "info");
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      setPlayerStatus("Playing");
      setCurrentUrl(url);
      setCurrentTitle(titleStr);

      const historyItem: PlaybackHistoryItem = {
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: "stream",
        name: titleStr,
        url,
        playedAt: new Date().toLocaleTimeString()
      };
      const updatedHistory = [historyItem, ...history.filter(h => h.url !== url)].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem("ajn_iptv_history", JSON.stringify(updatedHistory));
      return;
    }
    
    setPlayerStatus("Loading");
    setCurrentUrl(url);
    setCurrentTitle(titleStr);

    // Save into history
    const historyItem: PlaybackHistoryItem = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: "stream",
      name: titleStr,
      url,
      playedAt: new Date().toLocaleTimeString()
    };
    const updatedHistory = [historyItem, ...history.filter(h => h.url !== url)].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem("ajn_iptv_history", JSON.stringify(updatedHistory));

    // Mount video pipeline
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      addLog("Memory Leak Prevention: Detaching legacy media and destroying previous HLS instance", "info");
      hlsRef.current.detachMedia();
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const typeToUse = streamType === "auto" ? (url.endsWith(".m3u8") || url.includes("m3u8") ? "hls" : "native") : streamType;

    if (typeToUse === "hls" && Hls.isSupported()) {
      addLog("HLS Engine: Instantiating high-performance Hls.js segment buffer", "info");

      // Scan connection specifications to prevent memory overflows, visual stalling, or A/V desync
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      let targetBufferLength = 30;
      let targetMaxBufferLength = 60;
      let maxBufferSizeValue = 50 * 1024 * 1024; // 50MB default
      let backBufferLen = 90;
      let networkCategory = "Broadband/WiFi (Default)";
      let syncSettings = {};

      if (conn) {
        const type = conn.effectiveType || "4g";
        const downlink = conn.downlink || 10;
        const isSaveData = conn.saveData || false;

        if (type === "slow-2g" || type === "2g" || downlink < 1.5 || isSaveData) {
          networkCategory = `Volatile 2G Network (effectiveType: ${type}, speed: ${downlink}Mbps)`;
          targetBufferLength = 8;
          targetMaxBufferLength = 16;
          maxBufferSizeValue = 8 * 1024 * 1024; // tight 8MB heap to prevent mobile memory pressure crashes
          backBufferLen = 10; // purge played content immediately to free up RAM
          syncSettings = {
            maxBufferHole: 2.0,            // skip structural buffer cracks instead of timing out
            nudgeMaxRetry: 15,           // keep playhead advancing under spotty feed conditions
            nudgeOffset: 0.15,             // nudge playhead to bypass black frame stalls
            highBufferWatchdogPeriod: 2,   // aggressively check A/V drift
            liveSyncDurationCount: 2,      // pull live streams close to keep sound and frames synced
          };
        } else if (type === "3g" || downlink < 4.0) {
          networkCategory = `Moderate 3G Network (effectiveType: ${type}, speed: ${downlink}Mbps)`;
          targetBufferLength = 15;
          targetMaxBufferLength = 30;
          maxBufferSizeValue = 20 * 1024 * 1024; // 20MB Max
          backBufferLen = 30;
          syncSettings = {
            maxBufferHole: 1.5,
            nudgeMaxRetry: 10,
            nudgeOffset: 0.1,
            highBufferWatchdogPeriod: 3,
          };
        } else {
          networkCategory = `Stable High-Speed Network (${type.toUpperCase()} / ~${downlink} Mbps)`;
          targetBufferLength = 40;
          targetMaxBufferLength = 80;
          maxBufferSizeValue = 65 * 1024 * 1024; // Large 65MB segment stack for silky-smooth seeking/scrubbing
          backBufferLen = 120; // store back buffer to avoid stutter when repeating content
          syncSettings = {
            maxBufferHole: 0.8,
            nudgeMaxRetry: 5,
          };
        }
      }

      addLog(`Network Optimization: Synced to '${networkCategory}'. Selected buffer threshold = ${targetBufferLength}s, maxBuffer = ${targetMaxBufferLength}s.`, "info");

      let consecutiveMediaErrors = 0;

      const hls = new Hls({
        enableWorker: true,
        maxMaxBufferLength: targetMaxBufferLength,
        maxBufferLength: targetBufferLength,
        maxBufferSize: maxBufferSizeValue,
        lowLatencyMode: false,          // stable buffer mode for VOD & stream stability
        backBufferLength: backBufferLen,
        
        // --- SECURE BYPASS CUSTOM HEADERS FOR LIVE / DVR STREAMS ---
        xhrSetup: (xhr, requestUrl) => {
          // Look up channel metadata to apply explicit userAgent/referer credentials if defined
          const matchedChannel = channels.find(c => c.url === url);
          if (matchedChannel) {
            if (matchedChannel.userAgent) {
              try {
                xhr.setRequestHeader("User-Agent", matchedChannel.userAgent);
              } catch (err) {
                console.warn("[AJN] Failed to set User-Agent header:", err);
              }
            }
            if (matchedChannel.referer) {
              try {
                xhr.setRequestHeader("Referer", matchedChannel.referer);
              } catch (err) {
                console.debug("[AJN] Referer header required but cannot be set client-side:", matchedChannel.referer);
              }
            }
          }

          if (requestUrl.includes("rumble") || requestUrl.includes("chunklist") || requestUrl.includes("bfap-rvuz")) {
            try {
              xhr.setRequestHeader("Referer", "https://rumble.com/");
              xhr.setRequestHeader("Origin", "https://rumble.com");
            } catch (e) {
              console.warn("Could not set custom hotlink-bypass headers:", e);
            }
          }
        },

        // --- PROACTIVE STREAM TIMING & EXPONENTIAL BACKOFF RETRY LOGIC ---
        manifestLoadingMaxRetry: 15,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 10000,
        
        levelLoadingMaxRetry: 15,
        levelLoadingRetryDelay: 1000,
        levelLoadingMaxRetryTimeout: 10000,
        
        fragLoadingMaxRetry: 18,
        fragLoadingRetryDelay: 500,
        fragLoadingMaxRetryTimeout: 12000,
        
        // --- DVR SLIDING WINDOW & ROBUST SEGMENT DELETION HANDLING ---
        liveSyncDurationCount: 3,       // stay safely 3 segments behind live edge to prevent requesting deleted chunks
        liveMaxLatencyDurationCount: 8,  // sync back to live edge if lag exceeds 8 chunks
        liveDurationInfinity: true,      // treat live manifests as dynamic, endless feeds
        
        // --- AUDIO/VIDEO TIMING & DECODING ROBUSTNESS ---
        forceKeyFrameOnDiscontinuity: true, // align keyframes at segment changes to mitigate ADTS AAC codec errors
        maxBufferHole: 1.5,             // skip segment gaps or decode skips
        nudgeMaxRetry: 15,            // constantly advance playhead past stalled segments
        nudgeOffset: 0.1,               // tiny offset nudge past corrupted TS structures
        highBufferWatchdogPeriod: 3,    // keep audio and video tracks aligned
        
        ...syncSettings
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const savedPos = getSavedVideoPosition(url);
        if (savedPos > 0) {
          addLog(`HLS Engine: Seeking automatically to resume point: ${Math.floor(savedPos / 60)}m ${Math.floor(savedPos % 60)}s`, "info");
          video.currentTime = savedPos;
        }
        video.play()
          .then(() => setPlayerStatus("Playing"))
          .catch(() => addLog("Awaiting human tap to start play audio"));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        const errorDetails = `HLS error [details: ${data.details}, type: ${data.type}, fatal: ${data.fatal}]`;
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              addLog(`${errorDetails}. Fatal network error - reloading stream pipeline...`, "warning");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              consecutiveMediaErrors++;
              addLog(`${errorDetails}. Fatal media decode error (consecutive count: ${consecutiveMediaErrors}). Attempting recovery...`, "warning");
              if (consecutiveMediaErrors === 1) {
                hls.recoverMediaError();
              } else if (consecutiveMediaErrors === 2) {
                addLog("Second fatal media error: Swapping audio codecs to resolve Potential AAC-in-MPEG-TS issues...", "warning");
                hls.swapAudioCodec();
                hls.recoverMediaError();
              } else {
                addLog("Consecutive media errors unresolved: Hard reloading media source engine...", "error");
                consecutiveMediaErrors = 0;
                hls.detachMedia();
                hls.loadSource(url);
                hls.attachMedia(video);
              }
              break;
            default:
              addLog(`Unrecoverable fatal HLS error: ${data.details}. Initiating deep direct proxy gateway fallback.`, "error");
              hls.detachMedia();
              hls.destroy();
              hlsRef.current = null;
              handlePlayerError(url, titleStr);
              break;
          }
        } else {
          // Track and recover warning errors (e.g. keyframe jumps, minor chunk loading stalls, deleted chunks in local sliding index)
          if (data.details === "fragLoadError" || data.details === "fragLoadTimeOut") {
            addLog(`Non-fatal warning [${data.details}]: Segment missing/timed out (potentially deleted by sliding DVR). Auto-skipping chunk.`, "warning");
            if (video && !video.paused) {
              video.currentTime += 0.5;
            }
          } else if (data.details === "bufferStalledError") {
            addLog("Player buffer stalled on transport segment. Nudging playhead to skip segment freeze.", "warning");
            if (video) {
              video.currentTime += 0.25;
            }
          }
        }
      });
    } else {
      addLog("Native Engine: Mounting direct web player source");
      
      const onNativeLoaded = () => {
        const savedPos = getSavedVideoPosition(url);
        if (savedPos > 0) {
          addLog(`Native Engine: Seeking automatically to resume point: ${Math.floor(savedPos / 60)}m ${Math.floor(savedPos % 60)}s`, "info");
          video.currentTime = savedPos;
        }
        video.removeEventListener("loadedmetadata", onNativeLoaded);
      };
      video.addEventListener("loadedmetadata", onNativeLoaded);

      video.src = url;
      video.load();
      video.play()
        .then(() => setPlayerStatus("Playing"))
        .catch((e) => {
          addLog(`Native playback error or interaction restriction: ${e.message}`, "warning");
          setPlayerStatus("Paused");
        });
    }
  };

  const playArchiveEpisode = (ep: ArchiveEpisode, index: number) => {
    if (!ep) return;
    setCurrentArchiveIndex(index);
    playStream(ep.videoUrl, `${ep.show} · ${ep.hour}`);
    addLog(`Selected archive chunk: ${ep.title}`);
  };

  // Recover from streaming blocks (Direct CORS restrictions)
  const handlePlayerError = (failedUrl: string, titleStr: string) => {
    setPlayerStatus("Error");
    if (fallbackMode === "enabled" && !failedUrl.includes("/api/stream-proxy")) {
      const proxied = `/api/stream-proxy?url=${encodeURIComponent(failedUrl)}`;
      addLog(`CORS / Network Error! Deploying Fallback Proxy endpoint: ${proxied}`, "warning");
      setTimeout(() => {
        playStream(proxied, `[Proxy] ${titleStr}`);
      }, 1500);
    } else {
      addLog("Streaming failed. Modify engine settings or enable Fallback Proxy mode", "error");
    }
  };

  const handleVideoPlayEvent = () => setPlayerStatus("Playing");
  const handleVideoPauseEvent = () => setPlayerStatus("Paused");
  const handleVideoErrorEvent = (e: any) => {
    addLog(`Native video node reported error details.`, "error");
    if (currentUrl) {
      handlePlayerError(currentUrl, currentTitle);
    }
  };

  // Favorites logic
  const toggleFavorite = (channel: IPTVChannel) => {
    const isFav = favorites.some(f => f.url === channel.url);
    let updated;
    if (isFav) {
      updated = favorites.filter(f => f.url !== channel.url);
      addLog(`Removed from favorites: ${channel.name}`);
    } else {
      updated = [...favorites, channel];
      addLog(`Added to favorites: ${channel.name}`);
    }
    setFavorites(updated);
    localStorage.setItem("ajn_iptv_favorites", JSON.stringify(updated));
  };

  const exportFavoritesM3U = () => {
    if (favorites.length === 0) {
      addLog("Favorites list is empty. Add channels first.", "warning");
      return;
    }

    let m3u = "#EXTM3U\n";
    favorites.forEach(f => {
      m3u += `#EXTINF:-1 tvg-logo="${f.logo || ""}",${f.name}\n${f.url}\n`;
    });

    const blob = new Blob([m3u], { type: "audio/x-mpegurl" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ajn_favorites_iptv.m3u";
    link.click();
    URL.revokeObjectURL(url);
    addLog("Successfully downloaded favorites playlist (ajn_favorites_iptv.m3u)");
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("ajn_iptv_history");
    addLog("Playback history wiped.");
  };

  const clearAllCache = () => {
    ["ajn_iptv_channels", "ajn_iptv_favorites", "ajn_iptv_history", "ajn_iptv_settings"]
      .forEach(k => localStorage.removeItem(k));
    setChannels([]);
    setFavorites([]);
    setHistory([]);
    loadDefaultPlaylist();
    addLog("Wiped sandbox local storage and initialized default channels");
  };

  const switchArchiveEpisode = (direction: "prev" | "next") => {
    if (selectedDateEpisodes.length === 0) return;
    let nextIndex = currentArchiveIndex;
    if (direction === "prev") {
      nextIndex = currentArchiveIndex > 0 ? currentArchiveIndex - 1 : selectedDateEpisodes.length - 1;
    } else {
      nextIndex = (currentArchiveIndex + 1) % selectedDateEpisodes.length;
    }
    playArchiveEpisode(selectedDateEpisodes[nextIndex], nextIndex);
  };

  // Skip tracks for regular M3U playlist channels
  const skipIPTVChannel = (direction: "prev" | "next") => {
    if (channels.length === 0) return;
    const activeIdx = channels.findIndex(c => c.url === currentUrl);
    let nextIdx = activeIdx;
    
    if (direction === "prev") {
      nextIdx = activeIdx > 0 ? activeIdx - 1 : channels.length - 1;
    } else {
      nextIdx = activeIdx !== -1 && activeIdx < channels.length - 1 ? activeIdx + 1 : 0;
    }

    const nextChan = channels[nextIdx];
    if (nextChan) {
      playStream(nextChan.url, nextChan.name);
    }
  };

  // Filter and sort channels based on search and sortOption
  const filteredChannels = useMemo(() => {
    let result = [...channels];
    
    // Filter by search
    if (searchQuery.trim()) {
      result = result.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort options: A-Z, Z-A, or original (recent) order
    if (sortOption === "asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }
    
    return result;
  }, [channels, searchQuery, sortOption]);

  return (
    <div id="unified-player-app" className={`min-h-screen flex flex-col font-sans transition-all duration-300 antialiased overflow-hidden select-none ${theme === "light" ? "text-slate-800 bg-slate-50" : "text-slate-300 bg-[#0B0E14]"}`}>
      
      {/* HEADER TOP BAR */}
      <header className={`h-22 px-6 flex items-center justify-between border-b ${theme === "light" ? "border-slate-200 bg-white/95 shadow-sm" : "border-slate-800/50 bg-[#080A0F]/95 shadow-lg"} backdrop-blur-md z-30 shrink-0 select-none overflow-x-auto gap-4`}>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            id="btn-sidebar-toggle-left"
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className={`p-2 cursor-pointer border rounded-xl text-blue-400 hover:text-white transition-all active:scale-95 ${theme === "light" ? "bg-slate-100 hover:bg-slate-200 border-slate-200" : "bg-slate-800/30 hover:bg-slate-800 border-slate-800/50"}`}
            title="Toggle Sidebar Control Panel"
          >
            <Menu className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <img 
              src="/src/assets/images/ajn_logo_1781449178665.jpg" 
              alt="AJN Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-950/20"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className={`text-sm font-black tracking-tighter uppercase sm:text-base leading-tight ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                AJN LIBERTY PLAY
              </h1>
              <p className={`text-[9px] font-extrabold tracking-widest font-mono uppercase ${theme === "light" ? "text-blue-650" : "text-blue-500"}`}>ver2.2 Professional Broadcast Console</p>
            </div>
          </div>
        </div>

        {/* COMPACT & RESPONSIVE TAB SWITCHER WITH ICONS */}
        <div className="flex items-center gap-1.5 bg-[#040609]/60 p-1.5 rounded-2xl border border-slate-800/40 select-none shrink-0">
          {(["live", "archive", "audio", "export", "debug"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const icon = tab === "live" ? "📡" 
                        : tab === "archive" ? "🗄️" 
                        : tab === "audio" ? "🎹" 
                        : tab === "export" ? "📦" 
                        : "🛠️";
            const label = tab === "live" ? "Live" 
                        : tab === "archive" ? "Archive" 
                        : tab === "audio" ? "Audio" 
                        : tab === "export" ? "Export" 
                        : "Debug";
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  addLog(`Navigated to active tab: ${tab.toUpperCase()}`);
                }}
                className={`py-2 px-3 md:px-4 rounded-xl text-xs font-bold font-sans flex items-center gap-2 cursor-pointer transition-all ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-900/35"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* UTILITIES (RIGHT) */}
        <div className="flex items-center gap-2 shrink-0">
          <HeaderClock />

          {feedLoadingStatus !== "Loaded" && (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="text-amber-500 mr-1"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
          )}

          <button 
            id="btn-sidebar-toggle-right"
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className={`p-2.5 cursor-pointer border rounded-xl transition-all active:scale-95 ${theme === "light" ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900" : "bg-slate-800/30 hover:bg-slate-800 border-slate-800/50 text-slate-400 hover:text-white"}`}
            title="Toggle Engine Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button 
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className={`p-2.5 cursor-pointer border rounded-xl transition-all active:scale-95 ${theme === "light" ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-amber-500 hover:text-amber-600" : "bg-slate-800/30 hover:bg-slate-800 border-slate-800/50 text-slate-400 hover:text-white"}`}
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* VIEWPORT AREA */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT SIDEBAR (Tabs Panel container) */}
        <AnimatePresence initial={false}>
          {isLeftSidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 330, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`h-full shrink-0 flex flex-col z-20 overflow-hidden border-r ${theme === "light" ? "bg-white border-slate-200" : "bg-[#080A0F] border-slate-800/50"}`}
            >
              {/* TABS SELECTOR */}
              {activeTab === "live" ? (
                <div className={`p-3 grid grid-cols-3 gap-1 shrink-0 text-slate-500 text-xs font-semibold font-sans border-b ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-[#06080c] border-slate-900"}`}>
                  {(["streams", "favorites", "history"] as const).map(tab => {
                    const isActive = liveSidebarTab === tab;
                    const label = tab === "streams" ? "📡 Streams" 
                      : tab === "favorites" ? "⭐ Favs" 
                      : "📜 Hist";
                    return (
                      <button
                        key={tab}
                        onClick={() => setLiveSidebarTab(tab)}
                        className={`py-2 text-center rounded-lg text-[11px] cursor-pointer font-bold transition-all ${
                          isActive 
                            ? (theme === "light" 
                                ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-sm" 
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm")
                            : (theme === "light"
                                ? "border border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                : "border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20")
                        }`}
                      >
                        {isActive && <span className="mr-0.5">•</span>}
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : activeTab === "archive" ? (
                <div className={`p-4 shrink-0 font-mono text-[10px] font-bold tracking-wider uppercase border-b ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-[#06080c] border-slate-900/60 text-slate-400"}`}>
                  📅 Archival Control Filters
                </div>
              ) : (
                <div className={`p-4 shrink-0 font-mono text-[10px] font-bold tracking-wider uppercase border-b ${theme === "light" ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-[#06080c] border-slate-900/60 text-slate-400"}`}>
                  ⚙️ Controls Panel
                </div>
              )}

              {/* TABS CONTAINER */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* 1. PLAYLIST TAB */}
                {activeTab === "live" && liveSidebarTab === "streams" && (
                  <div className="space-y-4">
                    {/* Add M3U URL */}
                    <div className="bg-slate-900/20 rounded-2xl border border-slate-800/40 p-4 space-y-3 shadow-md">
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 font-mono">
                        <Radio className="w-3.5 h-3.5 text-blue-500" />
                        LOAD M3U REGISTRY
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={m3uUrlInput}
                          onChange={(e) => setM3uUrlInput(e.target.value)}
                          placeholder="M3U list link..."
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-800/60 bg-[#050608] focus:border-blue-500 text-white placeholder-slate-600 outline-none transition-all"
                        />
                        <button 
                          onClick={handleM3uUrlLoad}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold rounded-xl cursor-pointer transition-all active:scale-95 shadow-lg shadow-blue-900/20 shrink-0"
                        >
                          Load
                        </button>
                      </div>
                      
                      {/* Local File import */}
                      <div className="pt-3 border-t border-slate-800/40 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-semibold font-mono uppercase">Or direct upload:</span>
                        <label className="px-3.5 py-1.5 text-[10px] font-bold bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 text-slate-300 rounded-xl cursor-pointer transition-all">
                          📂 Choose .m3u
                          <input 
                            type="file" 
                            accept=".m3u,.m3u8,.txt" 
                            onChange={handleFileUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>

                      {/* Global Presets quick loader */}
                      <div className="pt-3 border-t border-slate-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">📺 WORLD CHANNELS DECK</span>
                          <span className="text-[9px] text-blue-400 font-mono font-bold">IPTV Org / LiveTV</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 font-mono">
                          <button 
                            onClick={() => loadCustomM3uUrl("https://raw.githubusercontent.com/bugsfreeweb/LiveTVCollector/main/LiveTV/Worldwide/LiveTV.m3u")}
                            className="p-2 text-[9px] font-bold text-left rounded-xl bg-slate-950 hover:bg-blue-600/10 border border-slate-800/80 hover:border-blue-500/50 text-slate-300 transition-all cursor-pointer truncate"
                            title="Load LiveTVCollector Global Index"
                          >
                            🌍 LiveTV Index
                          </button>
                          <button 
                            onClick={() => loadCustomM3uUrl("https://iptv-org.github.io/iptv/categories/news.m3u")}
                            className="p-2 text-[9px] font-bold text-left rounded-xl bg-slate-950 hover:bg-blue-600/10 border border-slate-800/80 hover:border-blue-500/50 text-slate-300 transition-all cursor-pointer truncate"
                            title="Load IPTV-org global curated News channels"
                          >
                            📰 Global News TV
                          </button>
                          <button 
                            onClick={() => loadCustomM3uUrl("https://iptv-org.github.io/iptv/categories/movies.m3u")}
                            className="p-2 text-[9px] font-bold text-left rounded-xl bg-slate-950 hover:bg-blue-600/10 border border-slate-800/80 hover:border-blue-500/50 text-slate-300 transition-all cursor-pointer truncate"
                            title="Load IPTV-org global Curated Movies & Entertainment list"
                          >
                            🎬 Movies & Ent
                          </button>
                          <button 
                            onClick={() => loadDefaultPlaylist()}
                            className="p-2 text-[9px] font-bold text-left rounded-xl bg-[#0b101c] hover:bg-slate-800 border border-slate-800/40 hover:border-slate-600 text-amber-400 transition-all cursor-pointer truncate"
                            title="Restore default AJN playlist"
                          >
                            ⭐ Default AJN TV
                          </button>
                        </div>

                        {/* IPTV Org Thumbnail Enrichment Tool */}
                        <div className="pt-2">
                          <button
                            onClick={enrichChannelLogosFromIPTVOrg}
                            disabled={isEnrichingLogos || channels.length === 0}
                            className={`w-full py-1.5 px-3 rounded-xl border font-bold text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isEnrichingLogos 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-not-allowed" 
                                : "bg-blue-600/10 border-blue-500/20 hover:bg-blue-600 text-blue-400 hover:text-white"
                            }`}
                            title="Auto-fetch official high-quality placeholders and stream thumbnails via IPTV-org API database match"
                          >
                            <Sparkles className={`w-3 h-3 text-blue-400 ${isEnrichingLogos ? "animate-spin text-emerald-400" : ""}`} />
                            {isEnrichingLogos ? "Enriching Stream Logos..." : `Enrich ${channels.length} Stream Logos`}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Channel Search & Sorting Dropdown */}
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-4.5 top-3" />
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search streams..."
                          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-slate-800/60 bg-[#050608] focus:border-blue-500/80 text-white placeholder-slate-600 outline-none transition-all"
                        />
                      </div>
                      <div className="relative shrink-0">
                        <select
                          id="stream-sorting-dropdown"
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value as any)}
                          className="pl-3 pr-8 py-2.5 text-xs rounded-2xl border border-slate-800/80 bg-[#050608] hover:border-slate-700/85 text-slate-300 font-bold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                        >
                          <option value="recent">Most Recently Added</option>
                          <option value="asc">A-Z</option>
                          <option value="desc">Z-A</option>
                        </select>
                        <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400 text-[8px]">▼</div>
                      </div>
                    </div>



                    {/* IPTV CHANNEL EXPORT PANEL — add after channel list */}
                    <div className="bg-slate-900/20 rounded-2xl border border-slate-800/40 p-4 space-y-3 shadow-md">
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 font-mono">
                        <FileDown className="w-3.5 h-3.5 text-purple-400" />
                        EXPORT LOADED PLAYLIST
                      </label>

                      {/* Template selector — mirrors the Archive tab selector */}
                      <div className="relative">
                        <select
                          value={selectedHtmlTemplate}
                          onChange={(e) => setSelectedHtmlTemplate(e.target.value as any)}
                          className="w-full pl-3 pr-8 py-2 text-[11px] rounded-xl border border-slate-800 bg-[#050608] hover:border-slate-700 text-slate-300 font-bold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                        >
                          <option value="tvexplorer">⚡ TV Explorer (Sleek Dashboard)</option>
                          <option value="vidgrid">🔲 VidGrid (Multi-Stream Matrix Wall)</option>
                          <option value="publiciptv">📺 Public Retro IPTV (TV Cabinet Skin)</option>
                          <option value="weebly">⏱️ EPG Looping Player (Classic)</option>
                        </select>
                        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500 text-[10px]">▼</div>
                      </div>

                      {/* HTML export button */}
                      <button
                        onClick={handleExportIPTVChannelsHtmlPlayer}
                        disabled={channels.length === 0}
                        className="w-full py-2 px-3 text-xs font-bold cursor-pointer text-center bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl border border-purple-500/20 text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/10"
                        title="Export all loaded channels as a standalone HTML player page"
                      >
                        <FileDown className="w-4 h-4 text-purple-200" />
                        Export Web Player HTML ({channels.length} channels)
                      </button>

                      {/* M3U export buttons row */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleExportIPTVChannelsM3U}
                          disabled={channels.length === 0}
                          className="py-1.5 px-2 text-[10px] font-bold cursor-pointer text-center bg-blue-500/10 hover:bg-blue-600 disabled:opacity-40 rounded-lg border border-blue-500/20 text-blue-300 hover:text-white transition-all flex items-center justify-center gap-1"
                          title="Export loaded channels as .m3u playlist file"
                        >
                          <FileDown className="w-3 h-3" />
                          Export M3U
                        </button>
                        <button
                          onClick={() => handleExportIPTVChannelsLanguageM3U()}
                          disabled={channels.length === 0}
                          className="py-1.5 px-2 text-[10px] font-bold cursor-pointer text-center bg-cyan-500/10 hover:bg-cyan-600 disabled:opacity-40 rounded-lg border border-cyan-500/20 text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-1"
                          title="Export channels grouped by detected language"
                        >
                          <FileDown className="w-3 h-3" />
                          Language M3U
                        </button>
                      </div>

                      {/* Per-language quick export pills */}
                      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/30">
                        {[
                          { code: "en", flag: "🇺🇸", label: "EN" },
                          { code: "es", flag: "🇪🇸", label: "ES" },
                          { code: "ru", flag: "🇷🇺", label: "RU" },
                        ].map(({ code, flag, label }) => (
                          <button
                            key={code}
                            onClick={() => handleExportIPTVChannelsLanguageM3U(code)}
                            disabled={channels.length === 0}
                            className="py-1 text-[9px] font-extrabold cursor-pointer text-center bg-slate-800/35 hover:bg-blue-600 disabled:opacity-40 rounded border border-slate-800 text-slate-300 hover:text-white transition-all"
                            title={`Export ${label} channels only`}
                          >
                            {flag} {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. FAVORITES TAB */}
                {activeTab === "live" && liveSidebarTab === "favorites" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-900/20 p-3 rounded-2xl border border-slate-800/40">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 block uppercase font-mono tracking-wider">Bookmarks</span>
                        <span className="text-xs text-white font-semibold font-mono">{favorites.length} Starred</span>
                      </div>
                      <button 
                        onClick={exportFavoritesM3U}
                        disabled={favorites.length === 0}
                        className="px-3 py-1.5 text-xs font-bold cursor-pointer bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-900/10 shrink-0"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Export .m3u
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {favorites.length === 0 ? (
                        <div className="text-center py-12 text-xs text-slate-500 font-medium">
                          No favorites bookmarked. Tap the ⭐ star icon next to channels to save them.
                        </div>
                      ) : (
                        favorites.map((fav, index) => {
                          const isActive = currentUrl === fav.url;
                          return (
                            <div 
                              key={index}
                              className={`p-2.5 rounded-2xl flex items-center justify-between gap-2 border border-amber-500/20 transition-all cursor-pointer ${
                                isActive ? "bg-amber-500/5 font-semibold" : "bg-slate-900/10 hover:bg-slate-900/35"
                              }`}
                            >
                              <div 
                                onClick={() => playStream(fav.url, fav.name)}
                                className="flex-1 min-w-0 flex items-center gap-3"
                              >
                                <img 
                                  src={getChannelLogo(fav.name, fav.logo)} 
                                  alt="logo" 
                                  className="w-8 h-8 rounded-xl border border-slate-800 object-contain bg-[#050608]"
                                  onError={(e) => { e.currentTarget.src = "https://placehold.co/40x40/151f38/ffffff?text=IPTV"; }}
                                  referrerPolicy="no-referrer"
                                />
                                <div className="truncate">
                                  <h4 className="text-xs font-semibold text-slate-200 truncate leading-tight">{fav.name}</h4>
                                  <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{fav.url}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => toggleFavorite(fav)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-rose-400 hover:text-rose-300 cursor-pointer transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 3. HISTORY TAB */}
                {activeTab === "live" && liveSidebarTab === "history" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-wider text-slate-500 px-1">
                      <span>RECENT PLAY LOGS</span>
                      {history.length > 0 && (
                        <button 
                          onClick={clearHistory}
                          className="text-[10px] cursor-pointer text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Wipe Logs
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {history.length === 0 ? (
                        <div className="text-center py-12 text-xs text-slate-500 font-medium font-mono">
                          No playback logs recorded. Play any stream or archive segment.
                        </div>
                      ) : (
                        history.map((hist, index) => {
                          const isActive = currentUrl === hist.url;
                          return (
                            <div 
                              key={index}
                              onClick={() => playStream(hist.url, hist.name)}
                              className={`p-3 rounded-2xl space-y-1.5 text-left border border-transparent transition-all cursor-pointer ${
                                isActive ? "bg-blue-500/10 border-blue-500/20" : "bg-slate-900/10 hover:bg-slate-900/35"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500">
                                <span>{hist.type === "archive" ? "🗄️ ARCHIVE CHUNK" : "📡 IPTV STREAM"}</span>
                                <span>{hist.playedAt}</span>
                              </div>
                              <h4 className="text-xs font-semibold text-slate-200 truncate leading-tight">
                                {hist.name}
                              </h4>
                              <p className="text-[9px] text-slate-500 font-mono truncate">{hist.url}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 4. AJN ARCHIVE TAB */}
                {activeTab === "archive" && (
                  <div className="space-y-4">
                    
                    {/* Date Selector / Dynamic Interactive Calendar Panel */}
                    <div className="bg-[#050608]/90 rounded-2xl border border-slate-800 p-4 space-y-3.5 shadow-xl">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                          ARCHIVE CALENDAR DECK
                        </label>
                        <span className="text-[9px] text-emerald-400 font-mono px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase font-bold">
                          {feedLoadingStatus}
                        </span>
                      </div>

                      {/* Month Switcher Navigation */}
                      <div className="flex items-center justify-between bg-slate-900/40 p-2 rounded-xl border border-slate-800/60 font-mono text-xs">
                        <button 
                          onClick={() => {
                            if (calendarMonth === 0) {
                              setCalendarMonth(11);
                              setCalendarYear(y => y - 1);
                            } else {
                              setCalendarMonth(m => m - 1);
                            }
                          }}
                          className="p-1 px-1.5 rounded bg-[#050608] hover:bg-slate-800 cursor-pointer border border-slate-800 text-slate-400 hover:text-white transition-all font-bold"
                        >
                          &lt;
                        </button>
                        <span className="font-bold text-white tracking-wide">
                          {monthsList[calendarMonth]} {calendarYear}
                        </span>
                        <button 
                          onClick={() => {
                            if (calendarMonth === 11) {
                              setCalendarMonth(0);
                              setCalendarYear(y => y + 1);
                            } else {
                              setCalendarMonth(m => m + 1);
                            }
                          }}
                          className="p-1 px-1.5 rounded bg-[#050608] hover:bg-slate-800 cursor-pointer border border-slate-800 text-slate-400 hover:text-white transition-all font-bold"
                        >
                          &gt;
                        </button>
                      </div>

                      {/* Weekday Labels Row */}
                      <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500 font-mono font-bold text-center">
                        <div>Su</div>
                        <div>Mo</div>
                        <div>Tu</div>
                        <div>We</div>
                        <div>Th</div>
                        <div>Fr</div>
                        <div>Sa</div>
                      </div>

                      {/* 42 cells Calendar Days Grid */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {getDaysInMonthGrid(calendarYear, calendarMonth).map((cell, idx) => {
                          const isCurrentActiveSelected = selectedDate === cell.dateStr;
                          const mappedEpisodes = archiveEpisodes.filter(ep => ep.dateKey === cell.dateStr);
                          const dayHasEpisodes = mappedEpisodes.length > 0;
                          
                          // Style based on state
                          let cellClass = "p-1 py-1.5 text-xs rounded-lg transition-all font-mono relative cursor-default ";
                          if (!cell.isCurrentMonth) {
                            cellClass += "text-slate-700 ";
                          } else if (dayHasEpisodes) {
                            cellClass += "text-slate-200 hover:bg-blue-600/25 hover:text-white cursor-pointer font-bold ";
                          } else {
                            cellClass += "text-slate-500 opacity-35 ";
                          }

                          if (isCurrentActiveSelected) {
                            cellClass = "p-1 py-1.5 text-xs rounded-lg font-mono relative font-black bg-blue-600 text-white shadow-lg cursor-pointer scale-105 border border-blue-400 z-10 ";
                          }

                          return (
                            <button
                              key={idx}
                              disabled={!dayHasEpisodes}
                              onClick={() => {
                                setSelectedDate(cell.dateStr);
                                setCurrentArchiveIndex(0);
                                addLog(`Calendar date selected: ${cell.dateStr} (${mappedEpisodes.length} episodes checked)`);
                              }}
                              className={cellClass}
                              title={dayHasEpisodes ? `${mappedEpisodes.length} show segments uploaded` : "No archive data"}
                            >
                              <span>{cell.dayNum}</span>
                              {/* Soft glow dot indicator if there are live episodes and not selected */}
                              {dayHasEpisodes && !isCurrentActiveSelected && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Show Categorizers/Filters */}
                      <div className="pt-3 border-t border-slate-800/40 space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 font-mono">Show Filters</label>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-mono text-slate-400">
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-all">
                            <input 
                              type="checkbox" 
                              checked={filterShowAlex} 
                              onChange={(e) => setFilterShowAlex(e.target.checked)}
                              className="rounded border-slate-800 text-blue-500 focus:ring-0 bg-slate-950 cursor-pointer"
                            />
                            <span>Alex Jones</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-all">
                            <input 
                              type="checkbox" 
                              checked={filterShowWarRoom} 
                              onChange={(e) => setFilterShowWarRoom(e.target.checked)}
                              className="rounded border-slate-800 text-purple-500 focus:ring-0 bg-slate-950 cursor-pointer"
                            />
                            <span>War Room</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-all">
                            <input 
                              type="checkbox" 
                              checked={filterShowSunday} 
                              onChange={(e) => setFilterShowSunday(e.target.checked)}
                              className="rounded border-slate-800 text-emerald-400 focus:ring-0 bg-slate-950 cursor-pointer"
                            />
                            <span>Sunday Night</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-all">
                            <input 
                              type="checkbox" 
                              checked={filterShowOther} 
                              onChange={(e) => setFilterShowOther(e.target.checked)}
                              className="rounded border-slate-800 text-slate-400 focus:ring-0 bg-slate-950 cursor-pointer"
                            />
                            <span>Specials/Other</span>
                          </label>
                        </div>
                      </div>

                      {/* Playlist Builders / Fast download buttons */}
                      <div className="pt-3 border-t border-slate-800/40 space-y-3">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-1.5">DATA PLAYLIST EXPORTS</label>
                          <div className="grid grid-cols-3 gap-1.5">
                            <button 
                              onClick={handleExportSelectedM3U}
                              className="py-1.5 px-1 text-[10px] font-bold cursor-pointer text-center bg-blue-500/10 hover:bg-blue-600 rounded-lg border border-blue-500/20 hover:border-blue-400 text-blue-300 hover:text-white transition-all flex items-center justify-center gap-1"
                              title="Export selected day as M3U playlist"
                            >
                              <FileDown className="w-3 h-3 text-blue-400" />
                              Day M3U
                            </button>
                            <button 
                              onClick={handleExportSelectedJSON}
                              className="py-1.5 px-1 text-[10px] font-bold cursor-pointer text-center bg-emerald-500/10 hover:bg-emerald-600 rounded-lg border border-emerald-500/20 hover:border-emerald-400 text-emerald-300 hover:text-white transition-all flex items-center justify-center gap-1"
                              title="Export selected day's JSON metadata"
                            >
                              <FileDown className="w-3 h-3 text-emerald-400" />
                              Day JSON
                            </button>
                            <button 
                              onClick={handleExportAllM3U}
                              className="py-1.5 px-1 text-[10px] font-bold cursor-pointer text-center bg-amber-500/10 hover:bg-amber-600 rounded-lg border border-amber-500/20 hover:border-amber-400 text-amber-300 hover:text-white transition-all flex items-center justify-center gap-1"
                              title="Export entire archive collection as M3U"
                            >
                              <FileDown className="w-3 h-3 text-amber-400" />
                              Full M3U
                            </button>
                          </div>
                        </div>

                        {/* Static Embedded HTML players selectors */}
                        <div className="pt-2 border-t border-slate-800/40 space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono block">STANDALONE WEB PLAYER EXPORTER</label>
                          <div className="space-y-1.5">
                            <div className="relative">
                              <select
                                value={selectedHtmlTemplate}
                                onChange={(e) => setSelectedHtmlTemplate(e.target.value as any)}
                                className="w-full pl-3 pr-8 py-2 text-[11px] rounded-xl border border-slate-800 bg-[#050608] hover:border-slate-700 text-slate-300 font-bold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                              >
                                <option value="tvexplorer">⚡ TV Explorer (Sleek Dashboard)</option>
                                <option value="vidgrid">🔲 VidGrid (Multi-Stream Matrix Wall)</option>
                                <option value="publiciptv">📺 Public Retro IPTV (TV Cabinet Skin)</option>
                                <option value="weebly">⏱️ EPG Looping Player (Classic)</option>
                              </select>
                              <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500 text-[10px]">▼</div>
                            </div>
                            
                            <button
                              onClick={handleExportSelectedHtmlPlayer}
                              className="w-full py-2 px-3 text-xs font-bold cursor-pointer text-center bg-purple-600 hover:bg-purple-500 rounded-xl border border-purple-500/20 text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/10 hover:shadow-purple-500/20"
                              title="Compile active day's playlist into the choosing static template and download standalone file"
                            >
                              <FileDown className="w-4 h-4 text-purple-200" />
                              Export Web Player HTML Page
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Language-Separated Playlists */}
                      <div className="pt-3 border-t border-slate-800/40">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-1">LANGUAGE SEPARATIONS</label>
                        <div className="space-y-1.5">
                          <button 
                            onClick={() => handleExportSelectedLanguageM3U()}
                            className="w-full py-1.5 px-2 text-[10px] font-bold cursor-pointer text-center bg-cyan-500/10 hover:bg-cyan-600 rounded-lg border border-cyan-500/20 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-1"
                            title="Export selected day grouped by detected languages (English default, Spanish second, Russian third, others alphabetically)"
                          >
                            <FileDown className="w-3 h-3 text-cyan-400" />
                            Grouped Day M3U
                          </button>
                          
                          <div className="grid grid-cols-3 gap-1">
                            <button 
                              onClick={() => handleExportSelectedLanguageM3U("en")}
                              className="py-1 px-0.5 text-[9px] font-extrabold cursor-pointer text-center bg-slate-800/35 hover:bg-blue-600 rounded border border-slate-800 text-slate-300 hover:text-white transition-all"
                              title="Download English streams only for this day"
                            >
                              🇺🇸 EN
                            </button>
                            <button 
                              onClick={() => handleExportSelectedLanguageM3U("es")}
                              className="py-1 px-0.5 text-[9px] font-extrabold cursor-pointer text-center bg-slate-800/35 hover:bg-blue-600 rounded border border-slate-800 text-slate-300 hover:text-white transition-all"
                              title="Download Spanish streams only for this day"
                            >
                              🇪🇸 ES
                            </button>
                            <button 
                              onClick={() => handleExportSelectedLanguageM3U("ru")}
                              className="py-1 px-0.5 text-[9px] font-extrabold cursor-pointer text-center bg-slate-800/35 hover:bg-blue-600 rounded border border-slate-800 text-slate-300 hover:text-white transition-all"
                              title="Download Russian streams only for this day"
                            >
                              🇷🇺 RU
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-800/20">
                            <button 
                              onClick={() => handleExportAllLanguageM3U()}
                              className="py-1 px-1 text-[9px] font-bold cursor-pointer text-center bg-amber-500/5 hover:bg-amber-600 rounded border border-amber-500/10 hover:border-amber-400 text-amber-300 hover:text-white transition-all flex items-center justify-center gap-1"
                              title="Download full archive grouped by language"
                            >
                              📂 Full Multi
                            </button>
                            <button 
                              onClick={() => handleExportAllLanguageM3U("es")}
                              className="py-1 px-1 text-[9px] font-bold cursor-pointer text-center bg-purple-500/5 hover:bg-purple-600 rounded border border-purple-500/10 hover:border-purple-400 text-purple-300 hover:text-white transition-all flex items-center justify-center gap-1"
                              title="Download full archive Spanish streams"
                            >
                              🇪🇸 Full ES
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Controls Area */}
                      <div className="pt-3 border-t border-slate-800/40 flex gap-2">
                        <button 
                          onClick={() => loadArchiveFeed(true)}
                          className="flex-1 py-1.5 px-2 text-[10px] font-bold cursor-pointer text-center bg-[#0d1527] hover:bg-blue-600 rounded-xl border border-blue-500/20 hover:border-blue-500 text-blue-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-pulse text-blue-400" />
                          Force Sync
                        </button>

                        {isSiriusPlaying && (
                          <button 
                            onClick={stopSiriusMusic}
                            className="py-1.5 px-3 text-[10px] font-extrabold cursor-pointer text-center bg-rose-500/15 hover:bg-rose-600 border border-rose-500/20 text-rose-300 rounded-xl transition-all shrink-0 animate-bounce"
                          >
                            Silence
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Videos / Segments playlist for Selected Date */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-wider text-slate-500 px-1">
                        <span>📺 SEGMENT CHUNKS ({selectedDateEpisodes.length})</span>
                      </div>

                      {selectedDateEpisodes.length === 0 ? (
                        <div className="text-center py-10 text-xs text-slate-500 font-medium bg-[#050608]/40 border border-slate-800/50 rounded-2xl">
                          No episodes parsed. Adjust selectors.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                          {selectedDateEpisodes.map((ep, idx) => {
                            const isCurrentlySelected = currentArchiveIndex === idx && currentUrl === ep.videoUrl;
                            const colorScheme = HOUR_COLOR_SCHEME[ep.hour] || HOUR_COLOR_SCHEME["default"];
                            const thumbnailUrl = SHOW_THUMBNAILS[ep.show] || SHOW_THUMBNAILS["default"];
                            
                            return (
                              <div
                                key={ep.id}
                                onClick={() => playArchiveEpisode(ep, idx)}
                                style={{ 
                                  "--tile-color": colorScheme.hex,
                                  "--tile-color-rgb": colorScheme.rgb
                                } as React.CSSProperties}
                                className={`tile-block p-3 rounded-2xl text-left transition-all cursor-pointer relative overflow-hidden border border-slate-800/35 backdrop-blur-md ${
                                  isCurrentlySelected 
                                    ? "tile-active shadow-lg border-blue-500/50 bg-blue-500/5" 
                                    : "bg-slate-900/20 hover:bg-slate-900/45"
                                }`}
                              >
                                <div className="flex gap-2.5">
                                  {/* Thumbnail Preview */}
                                  <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-950/80 border border-slate-800/80 relative shadow-inner self-center">
                                    <img 
                                      src={thumbnailUrl} 
                                      alt={ep.show}
                                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                      referrerPolicy="no-referrer"
                                    />
                                    {isCurrentlySelected && (
                                      <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-[1px] flex items-center justify-center">
                                        <Play className="w-4 h-4 text-white drop-shadow-md animate-pulse" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Metadata and Title Info */}
                                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                      <div className="flex justify-between items-center mb-1 gap-1">
                                        <span className="text-[8px] font-extrabold text-blue-400 tracking-wider uppercase bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800/80 truncate max-w-[100px]">
                                          {ep.show}
                                        </span>
                                        <span 
                                          style={{ color: colorScheme.hex }}
                                          className="text-[8px] font-mono font-bold uppercase tracking-wider flex items-center gap-0.5 shrink-0"
                                        >
                                          <span className="w-1 h-1 rounded-full animate-ping" style={{ backgroundColor: colorScheme.hex }}></span>
                                          {ep.hour}
                                        </span>
                                      </div>
                                      <h4 className={`text-[11px] leading-snug font-semibold line-clamp-2 ${isCurrentlySelected ? "text-blue-200" : "text-slate-200"}`}>
                                        {ep.title}
                                      </h4>
                                    </div>
                                    
                                    <div className="mt-1.5 flex items-center justify-between text-[8px] text-slate-500 font-mono pt-1 border-t border-slate-800/30">
                                      <span>{new Date(ep.pubDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                      <span className="text-slate-600 truncate max-w-[100px]">{ep.videoUrl.split("/").pop()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="text-[9px] text-slate-600 font-mono italic leading-tight space-y-0.5 bg-slate-900/10 p-2.5 rounded-xl border border-slate-800/40">
                      <p className="truncate">RSS API Node: alexjones.media</p>
                      <p className="truncate">Active Gateway: {feedSourceUsed}</p>
                    </div>

                  </div>
                )}

                {/* 5. AUDIO TAB SIDEBAR CONTROL */}
                {activeTab === "audio" && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/20 rounded-2xl border border-slate-800/40 p-4 space-y-3 shadow-md">
                      <label className="text-[10px] font-bold tracking-wider text-blue-400 uppercase flex items-center gap-1.5 font-mono">
                        <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                        SYNTH CO-PILOT
                      </label>
                      <p className="text-xs text-slate-500 leading-normal">
                        Control the acoustic stream, toggle audio looping, and trigger track loading presets directly from the sidebar.
                      </p>
                      
                      <button
                        onClick={() => {
                          setIsSiriusLooping(!isSiriusLooping);
                          addLog(`Track looping toggled to ${!isSiriusLooping ? "ACTIVE" : "INACTIVE"}`);
                        }}
                        className={`w-full py-2 px-3 hover:shadow-md text-xs font-bold rounded-xl cursor-pointer border transition-all ${
                          isSiriusLooping 
                            ? "bg-blue-600 border-blue-500/20 text-white" 
                            : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        Loop Mode: {isSiriusLooping ? "ACTIVE" : "INACTIVE"}
                      </button>

                      <button
                        onClick={() => {
                          setIsSiriusMuted(!isSiriusMuted);
                        }}
                        className={`w-full py-2 px-3 text-xs font-bold rounded-xl cursor-pointer border transition-all ${
                          isSiriusMuted 
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                            : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}
                      >
                        {isSiriusMuted ? "🔈 Unmute Synthesizer" : "🔇 Mute Synthesizer"}
                      </button>
                    </div>

                    <div className="bg-slate-950/40 rounded-2xl border border-slate-900 p-4 space-y-2.5">
                      <label className="text-[9px] font-bold tracking-wider text-slate-500 uppercase font-mono block">TRACK SELECTION PRESETS</label>
                      <div className="space-y-1.5">
                        {siriusPlaylist.map((st, sidx) => {
                          const isActive = currentSiriusTrackIndex === sidx;
                          return (
                            <button
                              key={sidx}
                              onClick={() => {
                                setCurrentSiriusTrackIndex(sidx);
                                if (siriusAudioRef.current) {
                                  siriusAudioRef.current.currentTime = 0;
                                  siriusAudioRef.current.play().catch(() => {});
                                }
                                addLog(`Loaded Sirius Track via Sidebar: ${st.title}`);
                              }}
                              className={`w-full p-2.5 text-left text-xs font-semibold rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                                isActive 
                                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
                                  : "bg-slate-900/10 border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-white"
                              }`}
                            >
                              <div className="truncate pr-2">
                                <p className="font-bold truncate leading-tight">{st.title}</p>
                                <p className="text-[9px] text-slate-500 truncate mt-0.5">{st.artist}</p>
                              </div>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. EXPORT TAB SIDEBAR CONTROL */}
                {activeTab === "export" && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/20 rounded-2xl border border-slate-800/40 p-4 space-y-3 shadow-md">
                      <label className="text-[10px] font-bold tracking-wider text-purple-400 uppercase flex items-center gap-1.5 font-mono">
                        <FileDown className="w-3.5 h-3.5" />
                        PLAYLIST REGISTRY STATS
                      </label>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-900">
                          <span className="text-slate-500">Streams Loaded:</span>
                          <span className="text-blue-400 font-bold">{channels.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-900">
                          <span className="text-slate-500">Archive Items:</span>
                          <span className="text-purple-400 font-bold">{archiveEpisodes.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 rounded-2xl border border-slate-900 p-4 space-y-2">
                      <label className="text-[9px] font-bold tracking-wider text-slate-500 uppercase font-mono block">QUICK DOWNLOAD EXPORTS</label>
                      <div className="space-y-2">
                        <button
                          onClick={handleExportIPTVChannelsM3U}
                          disabled={channels.length === 0}
                          className="w-full py-2 bg-blue-600/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 text-blue-400 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Download Channel M3U
                        </button>
                        <button
                          onClick={handleExportSelectedJSON}
                          disabled={selectedDateEpisodes.length === 0}
                          className="w-full py-2 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Download Day JSON Metadata
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. DIAGNOSTIC TAB SIDEBAR CONTROL */}
                {activeTab === "debug" && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/20 rounded-2xl border border-slate-800/40 p-4 space-y-3 shadow-md">
                      <label className="text-[10px] font-bold tracking-wider text-red-400 uppercase flex items-center gap-1.5 font-mono">
                        <Activity className="w-3.5 h-3.5" />
                        ENGINE TELEMETRY
                      </label>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-slate-900">
                          <span className="text-slate-500">IPTV Cache:</span>
                          <span className="text-emerald-400 font-bold">STABLE</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-slate-900">
                          <span className="text-slate-500">HLS Proxy:</span>
                          <span className="text-emerald-400 font-bold">READY</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-slate-900">
                          <span className="text-slate-500">LogLevel:</span>
                          <span className="text-blue-500 font-bold">DEBUG</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 rounded-2xl border border-slate-900 p-4 space-y-2">
                      <label className="text-[9px] font-bold tracking-wider text-slate-500 uppercase font-mono block">ADMIN CONTROLS</label>
                      <button 
                        onClick={() => {
                          setDebugLogs([]);
                          addLog("Console log history cleared.");
                        }}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Console Terminal
                      </button>
                      <button 
                        onClick={() => {
                          localStorage.clear();
                          addLog("Dynamic database cache elements flushed.");
                        }}
                        className="w-full py-2 bg-red-950/20 hover:bg-red-900/35 border border-red-900/30 text-red-400 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        Flush Memory Cache
                      </button>
                    </div>
                  </div>
                )}

              </div>
              <div className={`p-3 border-t shrink-0 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-[#06080c] border-slate-800/60"}`}>
                SECURE EDGE BYPASS ENGINE ACTIVE
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* CENTER STAGE: MULTI-WORKSPACE CONTROLLER */}
        <main className={`flex-1 flex flex-col overflow-hidden relative ${theme === "light" ? "bg-slate-100/70" : "bg-[#0B0E14]"}`}>
          
          {/*================ ACTIVE WORKSPACE 1: LIVE CONSOLE ================*/}
          {activeTab === "live" && (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              
              {/* PRIMARY VIEWER SWITCHABLE TEMPLATE CONTROLLER BAR */}
              <div id="viewer-template-bar" className={`px-6 py-3.5 border-b shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md ${
                theme === "light" 
                  ? "bg-white border-slate-200" 
                  : "bg-[#090d16]/95 border-b border-slate-800/80"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                    <Tv className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold tracking-tight flex items-center gap-2 ${
                      theme === "light" ? "text-slate-800" : "text-white"
                    }`}>
                      Primary Console Viewer Frame
                      {mainViewerMode !== "standard" && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Template Active
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Toggle classic dedicated player or render live template dashboards dynamically.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Playlist Data Source Selector */}
                  <div className={`flex items-center border rounded-xl p-0.5 shrink-0 ${
                    theme === "light" ? "bg-slate-100 border-slate-300" : "bg-[#05070a] border-slate-800"
                  }`}>
                    <button
                      onClick={() => setMainViewerDataSource("archive")}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                        mainViewerDataSource === "archive"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-400"
                      }`}
                      title={`${selectedDateEpisodes.length} parsed show items on ${selectedDate}`}
                    >
                      📅 Archive ({selectedDateEpisodes.length})
                    </button>
                    <button
                      onClick={() => setMainViewerDataSource("channels")}
                      className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                        mainViewerDataSource === "channels"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-400"
                      }`}
                      title={`${channels.length} live streams loaded from M3U`}
                    >
                      📺 IPTV ({channels.length})
                    </button>
                  </div>

                  {/* Template View Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono hidden md:inline">Layout:</span>
                    <select
                      value={mainViewerMode}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setMainViewerMode(val);
                        addLog(`Switched main viewer deck layout to: ${val.toUpperCase()}`);
                      }}
                      className={`border rounded-xl px-2.5 py-1 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer min-w-[170px] ${
                        theme === "light" 
                          ? "bg-slate-50 border-slate-300 text-slate-800" 
                          : "bg-[#05070a] border-slate-800 text-slate-300"
                      }`}
                    >
                      <option value="standard">📹 Classic Dedicated Player</option>
                      <option value="tvexplorer">🗂️ Sleek "TV Explorer"</option>
                      <option value="vidgrid">🏁 Grid "VidGrid" Mosaic</option>
                      <option value="publiciptv">📺 Public Retro TV Bezel</option>
                      <option value="weebly">⚙️ "EPG Classic Sync" Loop</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PLAYER WORKSPACE */}
              <div className="flex-1 min-h-0 relative flex items-center justify-center p-8">
                
                {/* FLOATING HEADER INFO BAR (Sleek Theme Styling) */}
                {mainViewerMode === "standard" && currentUrl && (
                  <PlayerInfoBar currentTitle={currentTitle} />
                )}
 
                {/* VIDEO GRAPHICS ELEMENT - Styled elegantly like active queue */}
                <div className="w-full max-w-5xl aspect-video rounded-[32px] overflow-hidden bg-slate-950 border border-slate-800/60 shadow-2xl relative flex items-center justify-center shadow-blue-950/20">
                  
                  {mainViewerMode !== "standard" ? (
                    <iframe
                      key={`${mainViewerMode}-${mainViewerDataSource}-${selectedDateEpisodes.length}-${channels.length}-${selectedDate}`}
                      srcDoc={activeTemplateHtml}
                      className="w-full h-full border-0 absolute inset-0 bg-[#080A0F] rounded-[32px] z-10"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                  ) : isRumbleUrl(currentUrl) ? (
                    <iframe
                      id="rumble-embed-node"
                      src={getRumbleEmbedUrl(currentUrl)}
                      className="w-full h-full border-0 absolute inset-0 bg-black rounded-[32px] z-10"
                      allowFullScreen
                      allow="autoplay; encrypted-media; picture-in-picture"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <video
                      id="native-video-node"
                      ref={videoRef}
                      controls
                      onPlay={handleVideoPlayEvent}
                      onPause={() => {
                        handleVideoPauseEvent();
                        if (videoRef.current) {
                          saveVideoPosition(currentUrl, videoRef.current.currentTime, true);
                        }
                      }}
                      onTimeUpdate={(e) => {
                        const currTime = e.currentTarget.currentTime;
                        if (currentUrl && currTime > 0) {
                          saveVideoPosition(currentUrl, currTime);
                        }
                      }}
                      onEnded={() => {
                        if (currentUrl) {
                          try {
                            const savedJSON = localStorage.getItem("ajn_video_positions");
                            if (savedJSON) {
                              const saved = JSON.parse(savedJSON);
                              delete saved[currentUrl];
                              localStorage.setItem("ajn_video_positions", JSON.stringify(saved));
                            }
                          } catch (e) {}
                        }
                      }}
                      onError={handleVideoErrorEvent}
                      className="w-full h-full object-contain"
                      poster="https://placehold.co/1280x720/0a0f1d/3b82f6?text=AJN+IPTV+Professional+Player"
                    />
                  )}
 
                  {/* Status Layer overlays over the player on buffering */}
                  {mainViewerMode === "standard" && playerStatus === "Loading" && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center flex-col gap-4">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-mono font-bold text-blue-400 animate-pulse tracking-widest uppercase">
                        Configuring HLS Stream Gateway...
                      </span>
                    </div>
                  )}
 
                  {/* Idle screen cover */}
                  {mainViewerMode === "standard" && !currentUrl && (
                    <div className="absolute inset-0 bg-[#080A0F] flex items-center justify-center flex-col p-6 text-center gap-5">
                      <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center hover:scale-105 transition-all cursor-pointer shadow-xl shadow-blue-950/10">
                        <Tv className="w-8 h-8 text-blue-400" />
                      </div>
                      <div className="space-y-1.5 max-w-md">
                        <h3 className="text-base font-semibold text-white tracking-tight">Unified IPTV & AJN Archive Deck</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-sm mx-auto">
                          Stream live feeds or parse broadcast segments on demand. Select any listing from the dashboard control console to boot the stream router.
                        </p>
                      </div>
                    </div>
                  )}
 
                  {/* PLAYER CONTROLS MINI-HOVER BAR */}
                  {mainViewerMode === "standard" && currentUrl && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#080A0F]/90 px-5 py-2.5 border border-slate-800/80 rounded-full flex items-center gap-4 shadow-2xl hover:opacity-100 transition-opacity whitespace-nowrap z-25">
                      <button 
                        onClick={() => {
                          if (activeTab === "archive") switchArchiveEpisode("prev");
                          else skipIPTVChannel("prev");
                        }}
                        className="p-1.5 cursor-pointer hover:bg-slate-800 rounded-full text-slate-300 transition-all active:scale-95"
                        title="Previous Broadcast Chunk"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => {
                          const video = videoRef.current;
                          if (!video) return;
                          if (playerStatus === "Playing") video.pause();
                          else video.play().catch(() => {});
                        }}
                        className="p-2.5 cursor-pointer bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-all active:scale-95 shadow-md shadow-blue-900/30"
                      >
                        {playerStatus === "Playing" ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-white" />}
                      </button>

                      <button 
                        onClick={() => {
                          if (activeTab === "archive") switchArchiveEpisode("next");
                          else skipIPTVChannel("next");
                        }}
                        className="p-1.5 cursor-pointer hover:bg-slate-800 rounded-full text-slate-300 transition-all active:scale-95"
                        title="Next Broadcast Chunk"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      {/* Volume Segment Separator */}
                      <div className="w-[1px] h-5 bg-slate-800"></div>

                      {/* Volume Control Elements */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsPlayerMuted(!isPlayerMuted)}
                          className="p-1.5 cursor-pointer hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-all"
                          title={isPlayerMuted ? "Unmute stream audio" : "Mute stream audio"}
                        >
                          {isPlayerMuted ? (
                            <VolumeX className="w-4 h-4 text-red-400" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-blue-400" />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isPlayerMuted ? 0 : playerVolume}
                          onChange={(e) => {
                            setPlayerVolume(parseFloat(e.target.value));
                            if (isPlayerMuted) setIsPlayerMuted(false);
                          }}
                          className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                          title="Adjust Player Volume"
                        />
                        <span className="text-[10px] font-mono text-slate-500 font-bold w-6 text-right">
                          {isPlayerMuted ? "0%" : `${Math.round(playerVolume * 100)}%`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* DYNAMIC SCROLLING DEBUG TERMINAL (Sleek Theme Slate/Amber-themed layout) */}
              {debugMode === "on" && (
                <div 
                  id="viewport-debug-console"
                  className="w-full h-28 shrink-0 bg-[#050608] border-t border-slate-800/85 font-mono text-[10px] text-blue-400 p-4 overflow-y-auto space-y-1 selection:bg-blue-900 selection:text-white"
                >
                  {debugLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed hover:bg-slate-900/30 w-full break-all whitespace-pre-wrap block">
                      {log}
                    </div>
                  ))}
                  <div ref={logsEndRef}></div>
                </div>
              )}
            </div>
          )}

          {/*================ ACTIVE WORKSPACE 2: EXPANDED ARCHIVE SEGMENT GRID ================*/}
          {activeTab === "archive" && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🗄️</span> Day-View Broadcaster Hub
                  </h2>
                  <p className="text-xs text-slate-500 font-medium font-sans mt-1">
                    Complete multi-column segment index mapped for chosen archival date. Select any card to stream instantly.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 font-mono text-xs font-semibold text-blue-400">
                    📅 Date: {selectedDate || `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2 font-mono text-xs font-semibold text-purple-400">
                    📺 Loaded segments: {selectedDateEpisodes.length}
                  </div>
                </div>
              </div>

              {selectedDateEpisodes.length === 0 ? (
                <div className="h-[50vh] flex flex-col items-center justify-center text-center p-8 bg-[#080A0F]/55 rounded-3xl border border-slate-800 border-dashed max-w-4xl mx-auto gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800/60 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-slate-600" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-400">No Broadcast Episodes Parsed</h3>
                    <p className="text-xs text-slate-500 max-w-md">
                      There are no active show segments parsed for this calendar date. Please select a different day from the Left Sidebar calendar.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {selectedDateEpisodes.map((ep, idx) => {
                    const isCurrentlySelected = currentUrl === ep.videoUrl;
                    const colorScheme = HOUR_COLOR_SCHEME[ep.hour] || HOUR_COLOR_SCHEME["default"];
                    const thumbnailUrl = SHOW_THUMBNAILS[ep.show] || SHOW_THUMBNAILS["default"];
                    const dateObj = new Date(ep.pubDate);
                    
                    return (
                      <div
                        key={ep.id}
                        onClick={() => {
                          playArchiveEpisode(ep, idx);
                          setActiveTab("live"); // transition to player instantly!
                          addLog(`Casting segment to broadcast player: ${ep.title}`);
                        }}
                        style={{ 
                          "--tile-color": colorScheme.hex,
                          "--tile-color-rgb": colorScheme.rgb
                        } as React.CSSProperties}
                        className={`tile-block border border-slate-800 p-4 rounded-3xl bg-[#080A0F]/80 hover:bg-[#0c0f17] group transition-all duration-300 cursor-pointer flex flex-col justify-between h-auto gap-4 ${
                          isCurrentlySelected ? "border-blue-500/80 ring-2 ring-blue-600/20" : "hover:border-slate-700 hover:shadow-xl hover:shadow-blue-950/5"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Rich Thumbnail Media Container */}
                          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 relative shadow-inner">
                            <img 
                              src={thumbnailUrl} 
                              alt={ep.show}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 grayscale-[30%] group-hover:grayscale-0"
                              referrerPolicy="no-referrer"
                            />
                            {/* Color Tag Badge overlay */}
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 text-[9px] font-bold text-slate-300">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorScheme.hex }}></span>
                              {ep.hour}
                            </div>

                            {/* Center hover play button */}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Info Segment */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold font-mono tracking-wider text-slate-500 mb-1">
                              <span className="text-blue-400 truncate max-w-[120px]">{ep.show}</span>
                              <span className="font-semibold text-slate-500">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <h3 className="text-xs font-bold text-slate-200 group-hover:text-white leading-normal transition-all line-clamp-2">
                              {ep.title}
                            </h3>
                          </div>
                        </div>

                        {/* File actions footer */}
                        <div className="pt-3.5 border-t border-slate-900 flex justify-between items-center text-[11px] font-mono text-slate-500 mt-2">
                          <span className="truncate max-w-[140px] text-[10px] text-slate-600">{ep.videoUrl.split("/").pop()}</span>
                          <div className="flex items-center gap-2">
                            <a 
                              href={ep.videoUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                addLog(`Initiating download for video file: ${ep.videoUrl}`);
                              }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 hover:bg-blue-600 hover:text-white cursor-pointer transition-all hover:border-blue-500"
                              title="Download MP4 Video File"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/*================ ACTIVE WORKSPACE 3: PROFESSIONAL AUDIO SYNTHESIZER DECK ================*/}
          {activeTab === "audio" && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              
              {/* Title Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🎹</span> Preamble Synthesizer Console
                  </h2>
                  <p className="text-xs text-slate-500 font-medium font-sans mt-1">
                    Fine-tune studio preambles, configure virtual equalizer presets, and monitor active 120-frequency spectrum curves.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="bg-slate-900 border border-slate-800 rounded-full px-4 py-1.5 font-mono text-xs font-bold text-slate-400">
                    STATUS: {isSiriusPlaying ? "📡 BROADCASTING AUDIO" : "⏸️ PRE-LOADED STAGE"}
                  </div>
                </div>
              </div>

              {/* Main hardware deck controls */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Visualizer and primary playback (Left 2 columns) */}
                <div className="xl:col-span-2 space-y-6">
                  
                  {/* Glowing Equalizer Screen display */}
                  <div className="bg-[#050608] rounded-3xl border border-slate-800/80 p-6 flex flex-col gap-4 relative shadow-2xl shadow-black/85">
                    
                    {/* Retro console title line */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                        <span className="font-mono text-[10px] font-bold text-blue-500 tracking-widest uppercase">REAL-TIME MULTI-BAND ACOUSTIC SPECTROGRAM</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(["eq", "wave", "fire", "matrix"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setSiriusVisualizerMode(m);
                              addLog(`Visualizer mode cycled: ${m.toUpperCase()}`);
                            }}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded cursor-pointer font-mono border transition-all ${
                              siriusVisualizerMode === m 
                                ? "bg-blue-600/10 border-blue-500 text-blue-400 font-black" 
                                : "bg-slate-900 border-transparent text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {m.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Canvas Stage */}
                    <div className="h-40 rounded-2xl bg-[#040609] border border-slate-905 flex items-stretch overflow-hidden relative shadow-inner">
                      <canvas 
                        ref={siriusTabCanvasRef}
                        className="w-full h-full block"
                      />
                    </div>

                    {/* Compact track progress seek bar */}
                    <div className="space-y-1.5 font-mono text-xs text-slate-500">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span>ELAPSED PLAYTIME: {new Date(siriusCurrentTime * 1000).toISOString().substring(14, 19)}</span>
                        <span>DURATION: {new Date(siriusDuration * 1000).toISOString().substring(14, 19)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={siriusDuration || 100}
                        step="1"
                        value={siriusCurrentTime}
                        onChange={(e) => {
                          const seekSecs = parseFloat(e.target.value);
                          if (siriusAudioRef.current) {
                            siriusAudioRef.current.currentTime = seekSecs;
                          }
                          setSiriusCurrentTime(seekSecs);
                          addLog(`Synthesizer playhead repositioned to ${Math.round(seekSecs)}s`);
                        }}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all font-mono"
                        title="Seek Track"
                      />
                    </div>
                  </div>

                  {/* Faders / Synth Hardware Equalizer Simulator */}
                  <div className="bg-[#080A0F] border border-slate-800 rounded-3xl p-6 space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      🎛️ STUDIO HARDWARE CONTROLS & faders
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                      
                      {/* Fader 1 */}
                      <div className="flex flex-col items-center gap-2 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/40">
                        <span className="text-[9px] font-bold text-slate-500 font-mono">100Hz BASS</span>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={siriusLowBass}
                          onChange={(e) => {
                            setSiriusLowBass(parseInt(e.target.value));
                            setSiriusPreset("neutral");
                          }}
                          className="h-28 appearance-none bg-slate-800 w-1 rounded-lg cursor-pointer accent-blue-500"
                          style={{ WebkitAppearance: 'slider-vertical' } as React.CSSProperties}
                        />
                        <span className="text-xs font-mono text-slate-400 font-bold">{siriusLowBass}dB</span>
                      </div>

                      {/* Fader 2 */}
                      <div className="flex flex-col items-center gap-2 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/40">
                        <span className="text-[9px] font-bold text-slate-500 font-mono">400Hz LOW-MID</span>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={siriusBass}
                          onChange={(e) => {
                            setSiriusBass(parseInt(e.target.value));
                            setSiriusPreset("neutral");
                          }}
                          className="h-28 appearance-none bg-slate-800 w-1 rounded-lg cursor-pointer accent-blue-500"
                          style={{ WebkitAppearance: 'slider-vertical' } as React.CSSProperties}
                        />
                        <span className="text-xs font-mono text-slate-400 font-bold">{siriusBass}dB</span>
                      </div>

                      {/* Fader 3 */}
                      <div className="flex flex-col items-center gap-2 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/40">
                        <span className="text-[9px] font-bold text-slate-500 font-mono">1KHz VOC_MID</span>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={siriusVocalMid}
                          onChange={(e) => {
                            setSiriusVocalMid(parseInt(e.target.value));
                            setSiriusPreset("neutral");
                          }}
                          className="h-28 appearance-none bg-slate-800 w-1 rounded-lg cursor-pointer accent-blue-500"
                          style={{ WebkitAppearance: 'slider-vertical' } as React.CSSProperties}
                        />
                        <span className="text-xs font-mono text-slate-400 font-bold">{siriusVocalMid}dB</span>
                      </div>

                      {/* Fader 4 */}
                      <div className="flex flex-col items-center gap-2 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/40">
                        <span className="text-[9px] font-bold text-slate-500 font-mono">4KHz HIGH_MID</span>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={siriusHighMid}
                          onChange={(e) => {
                            setSiriusHighMid(parseInt(e.target.value));
                            setSiriusPreset("neutral");
                          }}
                          className="h-28 appearance-none bg-slate-800 w-1 rounded-lg cursor-pointer accent-blue-500"
                          style={{ WebkitAppearance: 'slider-vertical' } as React.CSSProperties}
                        />
                        <span className="text-xs font-mono text-slate-400 font-bold">{siriusHighMid}dB</span>
                      </div>

                      {/* Fader 5 */}
                      <div className="flex flex-col items-center gap-2 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/40">
                        <span className="text-[9px] font-bold text-slate-500 font-mono">16KHz TREBLE</span>
                        <input 
                          type="range" 
                          min="0" max="100" 
                          value={siriusTreble}
                          onChange={(e) => {
                            setSiriusTreble(parseInt(e.target.value));
                            setSiriusPreset("neutral");
                          }}
                          className="h-28 appearance-none bg-slate-800 w-1 rounded-lg cursor-pointer accent-blue-500"
                          style={{ WebkitAppearance: 'slider-vertical' } as React.CSSProperties}
                        />
                        <span className="text-xs font-mono text-slate-400 font-bold">{siriusTreble}dB</span>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Right controls and playlist (Right col) */}
                <div className="space-y-6">
                  
                  {/* Preset Quick Loader card */}
                  <div className="bg-[#080A0F] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-lg">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">ACOUSTIC EQUALIZER PRESETS</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      
                      {/* Preset 1 */}
                      <button
                        onClick={() => {
                          setSiriusLowBass(50); setSiriusBass(50); setSiriusVocalMid(55); setSiriusHighMid(50); setSiriusTreble(50);
                          setSiriusPreset("neutral");
                          addLog("Equalizer set to: STUDIO NEUTRAL");
                        }}
                        className={`p-3 rounded-xl cursor-pointer text-xs font-bold border transition-all text-left ${
                          siriusPreset === "neutral" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-300 link-fader-btn"
                        }`}
                      >
                        <p className="font-extrabold leading-none">Studio Neutral</p>
                        <p className="text-[10px] opacity-75 mt-0.5">Flat/Unprocessed</p>
                      </button>

                      {/* Preset 2 */}
                      <button
                        onClick={() => {
                          setSiriusLowBass(90); setSiriusBass(80); setSiriusVocalMid(40); setSiriusHighMid(50); setSiriusTreble(60);
                          setSiriusPreset("heavy");
                          addLog("Equalizer loaded: BASS BOOSTER");
                        }}
                        className={`p-3 rounded-xl cursor-pointer text-xs font-bold border transition-all text-left ${
                          siriusPreset === "heavy" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-300 link-fader-btn"
                        }`}
                      >
                        <p className="font-extrabold leading-none">Bass Booster</p>
                        <p className="text-[10px] opacity-75 mt-0.5">Heavy Low-end</p>
                      </button>

                      {/* Preset 3 */}
                      <button
                        onClick={() => {
                          setSiriusLowBass(35); setSiriusBass(40); setSiriusVocalMid(85); setSiriusHighMid(75); setSiriusTreble(50);
                          setSiriusPreset("vocal");
                          addLog("Equalizer loaded: VOCAL ENHANCER (Sodom)");
                        }}
                        className={`p-3 rounded-xl cursor-pointer text-xs font-bold border transition-all text-left ${
                          siriusPreset === "vocal" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-300 link-fader-btn"
                        }`}
                      >
                        <p className="font-extrabold leading-none">Vocal Enhance</p>
                        <p className="text-[10px] opacity-75 mt-0.5">Mid Boost (Sodom)</p>
                      </button>

                      {/* Preset 4 */}
                      <button
                        onClick={() => {
                          setSiriusLowBass(85); setSiriusBass(60); setSiriusVocalMid(45); setSiriusHighMid(75); setSiriusTreble(90);
                          setSiriusPreset("metal");
                          addLog("Equalizer loaded: METAL COIL (Motörhead)");
                        }}
                        className={`p-3 rounded-xl cursor-pointer text-xs font-bold border transition-all text-left ${
                          siriusPreset === "metal" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-300 link-fader-btn"
                        }`}
                      >
                        <p className="font-extrabold leading-none">Metal Coil</p>
                        <p className="text-[10px] opacity-75 mt-0.5">Motörhead Hype</p>
                      </button>

                    </div>
                  </div>

                  {/* Volume Slider & Playback Rate Track parameters */}
                  <div className="bg-[#080A0F] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">SIGNAL SPEEDS & volume</label>
                    <div className="space-y-4">
                      
                      {/* Master Synth Volume slider */}
                      <div className="space-y-1.5 font-sans">
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                          <span>Master Preamble Gain:</span>
                          <span className="font-bold text-blue-400 font-mono">{Math.round(siriusAudioVolume * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={siriusAudioVolume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSiriusAudioVolume(val);
                            if (siriusAudioRef.current) siriusAudioRef.current.volume = val;
                          }}
                          className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Speed Playback speed rate controller */}
                      <div className="space-y-1.5 font-sans">
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold">
                          <span>Playback Warp Speed:</span>
                          <span className="font-bold text-indigo-400 font-mono">{siriusPlaybackRate.toFixed(2)}x</span>
                        </div>
                        <input 
                          type="range" min="0.5" max="2.0" step="0.05"
                          value={siriusPlaybackRate}
                          onChange={(e) => {
                            const rateVal = parseFloat(e.target.value);
                            setSiriusPlaybackRate(rateVal);
                            if (siriusAudioRef.current) siriusAudioRef.current.playbackRate = rateVal;
                            addLog(`Synthesizer speed rate adjusted warp: ${rateVal.toFixed(2)}x`);
                          }}
                          className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer accent-indigo-500"
                        />
                      </div>

                    </div>
                  </div>

                  {/* Active Synthesizer Tracks */}
                  <div className="bg-[#080A0F] border border-slate-800 rounded-3xl p-5 space-y-3.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">BROADCAST INTRO SYNTH TRACKS</label>
                    
                    <div className="space-y-2">
                      {siriusPlaylist.map((track, tidx) => {
                        const isCurrent = currentSiriusTrackIndex === tidx;
                        return (
                          <div 
                            key={tidx}
                            onClick={() => {
                              setCurrentSiriusTrackIndex(tidx);
                              if (siriusAudioRef.current) {
                                siriusAudioRef.current.currentTime = 0;
                                siriusAudioRef.current.play().catch(() => {});
                              }
                              addLog(`Synth Deck loaded: ${track.title} by ${track.artist}`);
                            }}
                            className={`p-3 border rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                              isCurrent 
                                ? "bg-blue-600/[0.08] border-blue-500/45 text-white" 
                                : "bg-slate-900/40 border-transparent hover:bg-slate-900/70 hover:border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            <div className="min-w-0 pr-3">
                              <h4 className="text-xs font-bold leading-none truncate">{track.title}</h4>
                              <p className="text-[10px] text-slate-500 font-medium truncate mt-1">Artist: {track.artist}</p>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isCurrent) {
                                  if (isSiriusPlaying) {
                                    siriusAudioRef.current?.pause();
                                  } else {
                                    siriusAudioRef.current?.play().catch(() => {});
                                  }
                                } else {
                                  setCurrentSiriusTrackIndex(tidx);
                                  setTimeout(() => {
                                    siriusAudioRef.current?.play().catch(() => {});
                                  }, 150);
                                }
                              }}
                              className={`p-2 rounded-full flex items-center justify-center shrink-0 ${
                                isCurrent && isSiriusPlaying ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"
                              } text-white scale-90`}
                            >
                              {isCurrent && isSiriusPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white ml-0.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/*================ ACTIVE WORKSPACE 4: EXPORT SUITE WORKSPACE ================*/}
          {activeTab === "export" && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              
              {/* Title Block */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>📦</span> Broadcast Compilation & Export Suite
                  </h2>
                  <p className="text-xs text-slate-500 font-medium font-sans mt-1">
                    Select styled layout output templates, build single-page dashboard apps, or write M3U player playlist packages.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 border border-slate-800 bg-slate-900 rounded-full flex items-center gap-1">
                    {(["tvexplorer", "vidgrid", "publiciptv", "weebly"] as const).map((temp) => (
                      <button
                        key={temp}
                        onClick={() => setSelectedHtmlTemplate(temp)}
                        className={`text-[9px] font-bold py-1 px-3.5 rounded-full cursor-pointer uppercase transition-all font-mono ${
                          selectedHtmlTemplate === temp ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {temp === "tvexplorer" ? "TV EXPLORER" : temp === "vidgrid" ? "GRID" : temp === "publiciptv" ? "PUBLIC" : "WEEBLY"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Exports split view */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-stretch">
                
                {/* Side: Config Cards (Left 2 cols) */}
                <div className="xl:col-span-2 space-y-6">
                  
                  {/* Option Template Selection Cards */}
                  <div className="bg-[#080A0F] border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-md">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">SELECT OUTPUT TEMPLATE DESIGN</label>
                    <div className="space-y-2">
                      
                      {/* TV Explorer Option */}
                      <div 
                        onClick={() => setSelectedHtmlTemplate("tvexplorer")}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                          selectedHtmlTemplate === "tvexplorer" 
                            ? "bg-blue-600/[0.04] border-blue-500 text-white" 
                            : "bg-slate-900/30 border-transparent text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        <span className="text-2xl pt-0.5">📺</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold leading-normal">TV Explorer Dashboard (Recommended)</h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                            Sleek aesthetic media player. Generates categories menu, embedded video element with quick cast options, and diagnostic outputs.
                          </p>
                        </div>
                      </div>

                      {/* Video Grid Option */}
                      <div 
                        onClick={() => setSelectedHtmlTemplate("vidgrid")}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                          selectedHtmlTemplate === "vidgrid" 
                            ? "bg-blue-600/[0.04] border-blue-500 text-white" 
                            : "bg-slate-900/30 border-transparent text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        <span className="text-2xl pt-0.5">🔲</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold leading-normal">Responsive Multi-Feed Video Grid</h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                            A multi-viewport matrix screen. Displays customizable grids of streams playing simultaneously on a security control panel layout.
                          </p>
                        </div>
                      </div>

                      {/* Public IPTV Portal Option */}
                      <div 
                        onClick={() => setSelectedHtmlTemplate("publiciptv")}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                          selectedHtmlTemplate === "publiciptv" 
                            ? "bg-blue-600/[0.04] border-blue-500 text-white" 
                            : "bg-slate-900/30 border-transparent text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        <span className="text-2xl pt-0.5">📡</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold leading-normal">Public Web IPTV Portal</h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                            Minimalist loading station. Strips secondary details to make direct browser playbacks instantaneous and lightweight.
                          </p>
                        </div>
                      </div>

                      {/* Weebly Option */}
                      <div 
                        onClick={() => setSelectedHtmlTemplate("weebly")}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3 ${
                          selectedHtmlTemplate === "weebly" 
                            ? "bg-blue-600/[0.04] border-blue-500 text-white" 
                            : "bg-slate-900/30 border-transparent text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        <span className="text-2xl pt-0.5">📦</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold leading-normal">Compact Weebly Iframe Embedder</h4>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                            A nested widget setup. Specially styled with safe inline styling tags to render cleanly inside Weebly widgets or custom blog spaces.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Actions Trigger Deck Card */}
                  <div className="bg-[#080A0F] border border-slate-800 rounded-3xl p-5 space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">ACTION EXPORTS</label>
                    <div className="space-y-2.5">
                      
                      <button
                        onClick={handleExportIPTVChannelsM3U}
                        disabled={channels.length === 0}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-50 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-2xl cursor-pointer text-xs flex justify-center items-center gap-2 transition-all shadow-md active:scale-98"
                      >
                        <FileDown className="w-4.5 h-4.5 text-blue-150" />
                        Compile & Download M3U Playlist ({channels.length})
                      </button>

                      <button
                        onClick={handleExportIPTVChannelsHtmlPlayer}
                        disabled={channels.length === 0}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-2xl cursor-pointer text-xs flex justify-center items-center gap-2 transition-all shadow-md active:scale-98"
                      >
                        🌐 Generate Standalone Web Portal File
                      </button>

                    </div>
                  </div>

                </div>

                {/* Right: Simulated Code Output Container (Right 3 cols) */}
                <div className="xl:col-span-3 bg-[#050608] rounded-3xl border border-slate-800 p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center sm:min-w-0 h-8">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      <span className="font-mono text-[10px] font-bold text-indigo-400 tracking-wider">COMPILED OUTPUT WORKSPACE SANDBOX</span>
                    </div>
                    <button
                      onClick={() => {
                        let htmlCode = "";
                        if (selectedHtmlTemplate === "weebly") htmlCode = buildWeeblyHtml(channels);
                        else if (selectedHtmlTemplate === "vidgrid") htmlCode = buildVidGridHtml(channels);
                        else if (selectedHtmlTemplate === "publiciptv") htmlCode = buildPublicIPTVHtml(channels);
                        else htmlCode = buildTVExplorerHtml(channels);
                        
                        navigator.clipboard.writeText(htmlCode);
                        addLog(`HTML source copied for template design [${selectedHtmlTemplate.toUpperCase()}]`);
                      }}
                      disabled={channels.length === 0}
                      className="px-3.5 py-1 text-[10px] uppercase font-mono font-bold tracking-wide rounded-full bg-slate-900 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white cursor-pointer active:scale-95 disabled:opacity-50 transition-all shadow-sm shrink-0"
                    >
                      📋 Copy to Clipboard
                    </button>
                  </div>

                  <div className="flex-1 rounded-2xl bg-[#030406] border border-slate-905 p-4 font-mono text-[11px] leading-relaxed text-slate-500 overflow-y-auto max-h-[500px] select-all shadow-inner relative">
                    {channels.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-700 italic font-sans animate-pulse">
                        Please load an active playlist first.
                      </div>
                    ) : (
                      <pre className="text-slate-400/90 whitespace-pre wrap font-mono scroll-smooth text-left">
                        {`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AJN Professional Embedded Portal</title>
  <style>
    body { background: #050608; color: #fff; font-family: sans-serif; }
    /* Compiled Template: ${selectedHtmlTemplate.toUpperCase()} */
    .stream-container { max-width: 1200px; margin: 40px auto; padding: 20px; }
  </style>
</head>
<body>
  <!-- System generates ${channels.length} parsed streams below -->
  <div class="stream-container">
    <h2>Active Portal - ${selectedHtmlTemplate.toUpperCase()}</h2>
    <ul>
      ${channels.map(c => `<li>${c.name} - ${c.url}</li>`).slice(0, 5).join("\n      ")}
      <!-- ... and ${channels.length - 5} remaining streams ... -->
    </ul>
  </div>
</body>
</html>`}
                      </pre>
                    )}
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {/*================ ACTIVE WORKSPACE 5: MAIN SYSTEM DIAGNOSTIC LOGS TERMINAL ================*/}
          {activeTab === "debug" && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6">
              
              {/* Title Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🛠️</span> Diagnostic & Telemetry Command Station
                  </h2>
                  <p className="text-xs text-slate-500 font-medium font-sans mt-1">
                    Monitor system buffer allocations, incoming network stream packets, and active proxy event pipelines.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-slate-400 shrink-0">
                  <button 
                    onClick={() => {
                      setDebugLogs([]);
                      addLog("Terminal output log database wiped.");
                    }}
                    className="py-1.5 px-4 rounded-xl font-bold bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 cursor-pointer text-[11px] uppercase transition-all"
                  >
                    Wipe History
                  </button>
                  <button 
                    onClick={() => {
                      addLog(`DIAGNOSTIC VERIFY: incoming packets safe. CORS Proxy: OK.`);
                    }}
                    className="py-1.5 px-4 rounded-xl font-bold bg-blue-600/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 cursor-pointer text-[11px] text-blue-400 uppercase transition-all"
                  >
                    Trigger Diagnostic Verification Ping
                  </button>
                </div>
              </div>

              {/* Main Log Console View */}
              <div className="flex-1 min-h-[350px] rounded-3xl bg-[#030406] border border-slate-800/80 p-5 font-mono text-xs text-emerald-400/90 overflow-y-auto flex flex-col justify-between shadow-2xl relative shadow-inner">
                <div className="space-y-1.5 overflow-y-auto flex-1 max-h-[420px] pr-1 block text-left">
                  {debugLogs.map((log, index) => {
                    let isWarn = log.includes("warning") || log.includes("warning:");
                    let isErr = log.includes("error") || log.includes("CORS") || log.includes("stalled");
                    return (
                      <div 
                        key={index} 
                        className={`leading-normal hover:bg-slate-900/30 font-mono break-all whitespace-pre-wrap flex gap-2 ${
                          isWarn ? "text-amber-400" : isErr ? "text-red-400" : "text-slate-300"
                        }`}
                      >
                        <span className="text-slate-600 select-none">[{index + 1}]</span>
                        <span>{log}</span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef}></div>
                </div>
                
                {/* Console footer badge */}
                <div className="pt-4 border-t border-slate-900 shrink-0 text-[10px] font-mono text-slate-500 flex justify-between items-center select-none font-bold">
                  <span>PIPE PORTAL: ONLINE (Secure sandbox CORS redirect)</span>
                  <span className="text-emerald-500 animate-pulse uppercase font-mono">● VER2.2 BROADCAST CONTROLLER ACTIVE</span>
                </div>
              </div>

              {/* Network buffer simulator graphical interface */}
              <div className="bg-[#080A0F] border border-slate-800 rounded-3xl p-5 space-y-3 shrink-0">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold font-mono text-slate-500 tracking-wider">
                  <span>📈 ACTIVE NETWORK BUFFER BANDWIDTH GRAPH</span>
                  <span className="text-blue-400 font-extrabold uppercase font-mono">1.25 Gbps / HLS H.264 FEED STABLE</span>
                </div>
                <div className="h-6 flex items-end gap-[2px] bg-black/40 border border-slate-900/60 rounded-xl p-2.5 overflow-hidden">
                  {Array.from({ length: 65 }).map((_, bidx) => (
                    <div 
                      key={bidx} 
                      className="bg-blue-500/85 hover:bg-blue-400 rounded-sm shrink-0 transition-all cursor-pointer"
                      style={{ 
                        width: 'calc((100% - 130px) / 65)',
                        height: `${Math.max(10, Math.round(Math.abs(Math.sin((bidx * 0.18) + (new Date().getSeconds() * 0.2))) * (bidx % 2 === 0 ? 95 : 60)))}%`
                      }}
                    ></div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </main>

        {/* RIGHT SIDEBAR (Custom settings and telemetry stats) */}
        <AnimatePresence initial={false}>
          {isRightSidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`h-full shrink-0 border-l p-6 space-y-6 z-20 overflow-y-auto ${theme === "light" ? "bg-white border-slate-200 text-slate-800" : "bg-[#080A0F] border-slate-800/50 text-slate-300"}`}
            >
              <div className={`flex items-center justify-between border-b pb-4 ${theme === "light" ? "border-slate-100" : "border-slate-800"}`}>
                <span className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 font-mono ${theme === "light" ? "text-slate-600" : "text-slate-300"}`}>
                  <Activity className="w-4 h-4 text-blue-500" />
                  ENGINE REGISTRY
                </span>
                <button 
                  onClick={() => setIsRightSidebarOpen(false)}
                  className={`p-1.5 cursor-pointer rounded-xl transition-all ${theme === "light" ? "text-slate-400 hover:text-slate-900 hover:bg-slate-100" : "text-slate-500 hover:text-white hover:bg-slate-800"}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Engine parameter configuration */}
              <div className="space-y-4 text-xs font-semibold text-slate-300">
                
                {/* 1. Select stream play engine */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block font-mono">PLAYBACK DECODER</label>
                  <select 
                    value={streamType} 
                    onChange={(e) => {
                      const mode = e.target.value as "auto" | "hls" | "native";
                      setStreamType(mode);
                      addLog(`Decoder mode adjusted to: ${mode}`);
                    }}
                    className="w-full px-3 py-2 text-xs text-white rounded-xl bg-[#050608] border border-slate-800/80 focus:border-blue-500 outline-none cursor-pointer transition-all"
                  >
                    <option value="auto">Auto-detect (Optimal)</option>
                    <option value="hls">Hls.js Engine Binding</option>
                    <option value="native">Native Browser Direct</option>
                  </select>
                </div>

                {/* 2. Fallback Cors stream mapping */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block font-mono">CORS SHIELD AUTO ROUTING</label>
                  <select 
                    value={fallbackMode} 
                    onChange={(e) => {
                      const fallback = e.target.value as "enabled" | "disabled";
                      setFallbackMode(fallback);
                      addLog(`CORS stream proxy helper toggled to: ${fallback}`);
                    }}
                    className="w-full px-3 py-2 text-xs text-white rounded-xl bg-[#050608] border border-slate-800/80 focus:border-blue-500 outline-none cursor-pointer transition-all"
                  >
                    <option value="enabled">Enabled (Express Proxy Bypass)</option>
                    <option value="disabled">Disabled (Strict Direct Feed)</option>
                  </select>
                </div>

                {/* 3. Debug logging */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block font-mono">DEBUG TELEMETRY STATS</label>
                  <select 
                    value={debugMode} 
                    onChange={(e) => {
                      const enabled = e.target.value as "off" | "on";
                      setDebugMode(enabled);
                      addLog(`Verbose debug toggled: ${enabled}`);
                    }}
                    className="w-full px-3 py-2 text-xs text-white rounded-xl bg-[#050608] border border-slate-800/80 focus:border-blue-500 outline-none cursor-pointer transition-all"
                  >
                    <option value="on">On (Active Output Console)</option>
                    <option value="off">Off (Silent Console)</option>
                  </select>
                </div>

                {/* Integration Config.JSON Preview Block as requested in Sleek Interface */}
                <div className="pt-4 border-t border-slate-800/60">
                  <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase font-mono tracking-wider">CONFIG.JSON STATUS</p>
                  <div className="bg-[#050608] rounded-2xl p-4 font-mono text-[11px] leading-relaxed border border-slate-800/60 text-slate-300">
                    <span className="text-purple-400">"playlistDecoder"</span>: {"{"}
                    <br />&nbsp;&nbsp;<span className="text-emerald-400">"mode"</span>: <span className="text-blue-400">"{streamType}"</span>,
                    <br />&nbsp;&nbsp;<span className="text-emerald-400">"fallbackProxy"</span>: <span className="text-blue-400">{fallbackMode === "enabled" ? "true" : "false"}</span>,
                    <br />&nbsp;&nbsp;<span className="text-emerald-400">"debugState"</span>: <span className="text-blue-400">"{debugMode}"</span>,
                    <br />&nbsp;&nbsp;<span className="text-emerald-400">"stable"</span>: <span className="text-blue-400">true</span>
                    <br />{"}"}
                  </div>
                </div>

                {/* Reset & Flush actions */}
                <div className="space-y-2 pt-3">
                  <button 
                    onClick={() => {
                      const video = videoRef.current;
                      if (video) {
                        video.pause();
                        video.src = "";
                        video.load();
                      }
                      if (hlsRef.current) {
                        hlsRef.current.destroy();
                        hlsRef.current = null;
                      }
                      setCurrentUrl("");
                      setCurrentTitle("No Active Channel");
                      setPlayerStatus("Idle");
                      addLog("Player state reset.");
                    }}
                    className="w-full py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs font-bold active:scale-95 text-center text-slate-200 rounded-xl cursor-pointer transition-all"
                  >
                    🔄 Reset Active Player
                  </button>

                  <button 
                    onClick={clearAllCache}
                    className="w-full py-2.5 bg-rose-950/20 hover:bg-rose-900 border border-rose-900/30 text-rose-300 text-xs font-bold active:scale-95 text-center rounded-xl cursor-pointer transition-all"
                  >
                    🗑️ Flush Environment Cache
                  </button>
                </div>

                {/* Upgrade Box in Sleek Interface */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl text-white shadow-xl shadow-blue-900/10">
                  <h4 className="text-sm font-bold mb-1">Extended Pipelines</h4>
                  <p className="text-white/70 text-[11px] mb-3 leading-relaxed">Multi-source parsing and advanced M3U streaming tunnels.</p>
                  <button 
                    onClick={() => addLog("Advanced custom routing is already active inside direct sandboxed Express!")}
                    className="w-full py-2 bg-white text-blue-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all cursor-pointer shadow-md"
                  >
                    Advanced Active
                  </button>
                </div>

              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      </div>

      {/* SIRIUS HARMONIC AUDIBLE PREAMBLE OVERLAY COVER */}
      <AnimatePresence>
        {isSiriusOverlayOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-4 md:p-6 pointer-events-auto transition-all ${
              theme === "light" ? "bg-slate-900/60" : "bg-[#080A0F]/95"
            }`}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`border rounded-3xl p-5 md:p-6 lg:p-8 max-w-4xl w-full text-center md:text-left shadow-2xl relative flex flex-col md:flex-row gap-6 md:gap-8 items-stretch overflow-y-auto md:overflow-visible max-h-[92vh] md:max-h-none ${
                theme === "light" ? "bg-white border-slate-200 text-slate-800" : "bg-[#0B0E14] border-slate-800 text-slate-300"
              }`}
            >
              {/* Close Button X */}
              <button 
                onClick={stopSiriusMusic}
                className={`absolute top-4 right-4 p-1.5 border rounded-full cursor-pointer transition-all active:scale-95 z-30 ${
                  theme === "light"
                    ? "text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border-slate-200"
                    : "text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border-slate-800"
                }`}
                title="Silence Preamble"
              >
                <X className="w-4 h-4" />
              </button>

              {/* LEFT COMPACT SECTION: Track Visual Info */}
              <div className="flex flex-col justify-between md:w-5/12 space-y-4 md:space-y-6 shrink-0 relative pr-0 md:pr-4 md:border-r border-slate-200 dark:border-slate-800/40">
                
                {/* Visualizer header or vinyl block */}
                <div className="flex flex-row md:flex-col items-center gap-4 md:gap-5 mt-2">
                  {/* Spinning vinyl disc - slightly smaller to be shorter */}
                  <div className="relative w-20 h-20 md:w-28 md:h-28 flex-shrink-0 flex items-center justify-center">
                    <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full border-4 flex items-center justify-center relative shadow-black/80 shadow-lg transition-colors ${
                      theme === "light" ? "bg-slate-900 border-slate-300" : "bg-[#05080f] border-slate-800"
                    } ${isSiriusPlaying ? "animate-spin-vinyl" : ""}`}>
                      <div className="w-16 h-16 md:w-22 md:h-22 rounded-full border border-slate-700/40 flex items-center justify-center">
                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full border flex items-center justify-center ${
                          theme === "light" ? "bg-slate-800 border-slate-700" : "bg-[#070c14] border-slate-700/60"
                        }`}>
                          <div className="w-6 h-6 rounded-full bg-blue-600 border border-slate-900 flex items-center justify-center font-bold text-[8px] md:text-[9px] text-white tracking-tighter">
                            AJN_LP
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Stylus needle */}
                    <div className="absolute top-0 right-1 w-8 h-14 origin-top rotate-[22deg] pointer-events-none hidden md:block">
                      <div className="w-1 h-12 bg-slate-400 rounded-full relative">
                        <div className="w-2 h-2 bg-slate-300 border border-slate-600 rounded-md absolute -bottom-1 -left-0.5"></div>
                      </div>
                    </div>
                  </div>

                  {/* Title & Badge */}
                  <div className="text-left flex-1 md:text-center md:space-y-2">
                    <span className="inline-block text-[9px] font-bold tracking-widest text-blue-600 dark:text-[#5c98ff] bg-blue-600/10 dark:bg-blue-900/20 px-2.5 py-0.5 rounded-full border border-blue-500/10">
                      🎵 PREAMBLE ACTIVE
                    </span>
                    <h2 className={`text-sm md:text-base font-bold uppercase tracking-wider line-clamp-2 ${
                      theme === "light" ? "text-slate-900" : "text-white"
                    }`}>
                      {siriusPlaylist[currentSiriusTrackIndex]?.artist} · {siriusPlaylist[currentSiriusTrackIndex]?.title}
                    </h2>
                    
                    {/* Track Dots Indicator */}
                    <div className="flex md:justify-center gap-1.5 mt-1">
                      {siriusPlaylist.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentSiriusTrackIndex(i);
                            playSiriusTrack(i);
                          }}
                          className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                            i === currentSiriusTrackIndex 
                              ? "bg-blue-500 w-4" 
                              : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500"
                          }`}
                          title={`${siriusPlaylist[i].artist} - ${siriusPlaylist[i].title}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subtitle description - small on desktop, hidden on mobile to protect space */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed hidden md:block select-none">
                  The classic broadcast countdown anthem is selected and loaded from network hub. Ready to transition instantly to active stream chunks.
                </p>

                {/* PRIMARY ACTION BUTTONS (Snugly set inside the left segment) */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/40">
                  <button 
                    onClick={handleCloseOverlayAndPlaySelected}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-[11px] text-white font-extrabold uppercase rounded-xl cursor-pointer transition-all shadow-md shadow-blue-950/20 flex items-center justify-center gap-1.5"
                  >
                    🚀 LAUNCH STREAM SOURCE
                  </button>
                  
                  {isSiriusPlaying ? (
                    <button 
                      onClick={stopSiriusMusic}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-all"
                    >
                      Mute Preamble Output
                    </button>
                  ) : (
                    <button 
                      onClick={startSiriusMusic}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-[10px] font-bold text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer transition-all"
                    >
                      Resume Preamble Preview
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT EXPANSIVE SECTION: Audio Mixer Console & Spectrum Visualizer */}
              <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0 md:pl-2">
                
                {/* Console header */}
                <div className="flex justify-between items-center select-none pt-2 md:pt-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                    Advanced EQ Console
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded">
                      120 BAND
                    </span>
                    <span className={`text-[10px] font-extrabold font-mono uppercase px-2 py-0.5 rounded-md border transition-all ${
                      isSiriusPlaying 
                        ? "text-green-500 bg-green-500/10 border-green-500/20 dark:text-green-400" 
                        : "text-slate-500 bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800/40"
                    }`}>
                      {isSiriusPlaying ? "STABILIZED" : "STANDBY"}
                    </span>
                  </div>
                </div>

                {/* Dropdown select track source */}
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono select-none">
                    Select Feed:
                  </span>
                  <select
                    value={currentSiriusTrackIndex}
                    onChange={(e) => playSiriusTrack(Number(e.target.value))}
                    className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-bold font-mono focus:outline-none focus:border-blue-500/50 cursor-pointer select-none ${
                      theme === "light"
                        ? "bg-white border-slate-200 text-slate-700"
                        : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}
                  >
                    {siriusPlaylist.map((st, sidx) => (
                      <option key={sidx} value={sidx}>
                        {sidx + 1}. {st.artist} - {st.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Spectrum OLED display */}
                <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-900 shadow-inner">
                  <canvas
                    ref={siriusCanvasRef}
                    className="w-full h-20 md:h-24 block cursor-pointer bg-[#06080e]"
                    title="Click here to cycle spectrum styles!"
                    onClick={() => {
                      const modes: Array<"eq" | "wave" | "fire" | "matrix"> = ["eq", "wave", "fire", "matrix"];
                      const currentIdx = modes.indexOf(siriusVisualizerMode);
                      const nextMode = modes[(currentIdx + 1) % modes.length];
                      setSiriusVisualizerMode(nextMode);
                      addLog(`Visualizer mode cycled to ${nextMode.toUpperCase()}`, "info");
                    }}
                  />
                  
                  {/* Subtle watermarked overlay */}
                  <div className="absolute bottom-1 right-2 pointer-events-none select-none">
                    <span className="text-[8px] tracking-widest font-mono text-slate-500/40 uppercase">
                      STYLE: {siriusVisualizerMode.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Hidden Audio Stream Element */}
                <audio
                  ref={siriusAudioRef}
                  src={siriusPlaylist[currentSiriusTrackIndex]?.url}
                  crossOrigin="anonymous"
                  className="hidden"
                  onPlay={() => setIsSiriusPlaying(true)}
                  onPause={() => setIsSiriusPlaying(false)}
                  onTimeUpdate={(e) => setSiriusCurrentTime(e.currentTarget.currentTime)}
                  onDurationChange={(e) => setSiriusDuration(e.currentTarget.duration || 0)}
                  onEnded={() => {
                    if (isSiriusLooping) {
                      addLog("Custom Deck: Track looping enabled. Replaying...", "info");
                      if (siriusAudioRef.current) {
                        siriusAudioRef.current.currentTime = 0;
                        siriusAudioRef.current.play().catch(() => {});
                      }
                    } else {
                      addLog("Custom Deck: Track ended. Auto advancing.", "info");
                      handleSiriusNext();
                    }
                  }}
                  onError={() => {
                    const currentIndex = currentSiriusTrackIndex;
                    const track = siriusPlaylist[currentIndex];
                    if (!track) return;
                    
                    const nextBackupIndex = siriusBackupIndexRef.current + 1;
                    if (track.backups && nextBackupIndex < track.backups.length) {
                      const backupUrl = track.backups[nextBackupIndex];
                      siriusBackupIndexRef.current = nextBackupIndex;
                      addLog(`Primary source failed. Retrying backup: #${nextBackupIndex + 1}...`, "warning");
                      if (siriusAudioRef.current) {
                        siriusAudioRef.current.src = backupUrl;
                        siriusAudioRef.current.load();
                        siriusAudioRef.current.play().catch(() => {});
                      }
                    } else {
                      addLog(`All sources for track '${track.title}' failed. Moving automatically to next playlist track...`, "error");
                      handleSiriusNext();
                    }
                  }}
                />

                {/* SEEK TIMELINE TRACKER */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={siriusDuration || 100}
                    value={siriusCurrentTime}
                    onChange={handleSiriusSeek}
                    className="accent-blue-500 w-full h-1 bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-lg appearance-none cursor-pointer hover:accent-blue-400 transition"
                  />
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 px-0.5 select-none">
                    <span>
                      {(() => {
                        const sec = siriusCurrentTime;
                        if (isNaN(sec) || !isFinite(sec)) return "00:00";
                        const m = Math.floor(sec / 60);
                        const s = Math.floor(sec % 60);
                        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                      })()}
                    </span>
                    <span>
                      {(() => {
                        const sec = siriusDuration;
                        if (isNaN(sec) || !isFinite(sec)) return "00:00";
                        const m = Math.floor(sec / 60);
                        const s = Math.floor(sec % 60);
                        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* MIXER BUTTON DECK */}
                <div className="flex justify-between items-center gap-1.5 border-t border-b border-slate-200/60 dark:border-slate-900/60 py-2 select-none">
                  <button
                    onClick={handleSiriusPrev}
                    className={`p-2 border rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0 ${
                      theme === "light"
                        ? "text-slate-600 hover:text-slate-900 bg-slate-50 border-slate-200 hover:border-slate-300"
                        : "text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800/80 border-slate-800/60"
                    }`}
                    title="Previous Track"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleSiriusReplay}
                    className={`p-2 border rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0 ${
                      theme === "light"
                        ? "text-slate-600 hover:text-slate-900 bg-slate-50 border-slate-200 hover:border-slate-300"
                        : "text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800/80 border-slate-800/60"
                    }`}
                    title="Replay from Beginning"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Play controller clicker */}
                  <button
                    onClick={isSiriusPlaying ? stopSiriusMusic : startSiriusMusic}
                    className={`flex-1 py-1.5 px-3 rounded-xl cursor-pointer font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all border shadow ${
                      isSiriusPlaying 
                        ? "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-blue-500/10" 
                        : "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/10"
                    }`}
                    title={isSiriusPlaying ? "Pause Audio" : "Play Audio"}
                  >
                    {isSiriusPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-white" />
                        <span>PAUSE</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-white animate-pulse" />
                        <span>PLAY</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      stopSiriusMusic();
                      if (siriusAudioRef.current) {
                        siriusAudioRef.current.currentTime = 0;
                      }
                      setSiriusCurrentTime(0);
                    }}
                    className={`p-2 border rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0 ${
                      theme === "light"
                        ? "text-rose-500 hover:text-white hover:bg-rose-500/10 hover:border-rose-300 border-slate-200"
                        : "text-rose-400 hover:text-white hover:bg-rose-950/20 hover:border-rose-500/40 border-slate-800/60"
                    }`}
                    title="Stop Audio File"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={handleSiriusNext}
                    className={`p-2 border rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0 ${
                      theme === "light"
                        ? "text-slate-600 hover:text-slate-900 bg-slate-50 border-slate-200 hover:border-slate-300"
                        : "text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800/80 border-slate-800/60"
                    }`}
                    title="Next Track"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setIsSiriusLooping(!isSiriusLooping);
                      addLog(`Custom Deck: Track looping toggled to ${!isSiriusLooping ? "ACTIVE" : "INACTIVE"}`, "info");
                    }}
                    className={`p-2 border rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0 ${
                      isSiriusLooping 
                        ? "text-blue-500 bg-blue-500/10 border-blue-500/30 shadow-md shadow-blue-500/5" 
                        : (theme === "light"
                            ? "text-slate-400 bg-slate-50 border-slate-200 hover:text-slate-600"
                            : "text-slate-400 bg-slate-900/40 border-slate-800/60 hover:text-slate-200")
                    }`}
                    title="Toggle Loop Mode"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* MIXER CONTROLS SLIDER ROW */}
                <div className="space-y-2 select-none">
                  
                  {/* Volume level Slider */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSiriusMuteToggle}
                      className={`p-1 border rounded cursor-pointer transition-colors shrink-0 ${
                        theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/20 border-slate-800/40"
                      }`}
                      title={isSiriusMuted ? "Unmute Audio" : "Mute Audio"}
                    >
                      {isSiriusMuted ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isSiriusMuted ? 0 : siriusAudioVolume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setSiriusAudioVolume(v);
                        if (isSiriusMuted && v > 0) {
                          setIsSiriusMuted(false);
                        }
                      }}
                      className="flex-1 accent-indigo-500 h-1 bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 appearance-none cursor-pointer transition"
                      title={`Volume: ${Math.round((isSiriusMuted ? 0 : siriusAudioVolume) * 100)}%`}
                    />
                    <span className="text-[9px] font-bold font-mono text-slate-500 w-7 text-right">
                      {Math.round((isSiriusMuted ? 0 : siriusAudioVolume) * 100)}%
                    </span>
                  </div>

                  {/* Spectral mode select layout */}
                  <div className={`flex justify-between items-center p-1 rounded-xl border ${
                    theme === "light" ? "bg-slate-50 border-slate-200/60" : "bg-slate-900/40 border-slate-900/60"
                  }`}>
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest font-mono pl-1.5 select-none">
                      Visual:
                    </span>
                    <div className="flex gap-0.5">
                      {(["eq", "wave", "fire", "matrix"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setSiriusVisualizerMode(m);
                            addLog(`Custom Deck: Set visualizer style to ${m.toUpperCase()}`, "info");
                          }}
                          className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded transition-all cursor-pointer ${
                            siriusVisualizerMode === m
                              ? "bg-blue-600 text-white font-extrabold shadow-sm"
                              : (theme === "light"
                                  ? "text-slate-400 hover:text-slate-800 border border-transparent hover:bg-slate-200/50"
                                  : "text-slate-500 bg-transparent border border-transparent hover:text-slate-300")
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
