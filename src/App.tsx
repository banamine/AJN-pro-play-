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
  Info 
} from "lucide-react";
import Hls from "hls.js";
import { motion, AnimatePresence } from "motion/react";
import { IPTVChannel, PlaybackHistoryItem, ArchiveEpisode, ColorScheme } from "./types";

// Static Default M3U Playlist Source
const DEFAULT_M3U = `#EXTM3U
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/e/e1/Comedy_Central_logo_2018.svg",🎬 Big Buck Bunny (M3U8)
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
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

export default function App() {
  // Navigation & Sidebars State
  const [activeTab, setActiveTab] = useState<"playlist" | "favorites" | "history" | "archive">("playlist");
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // IPTV Core Data State
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [m3uUrlInput, setM3uUrlInput] = useState("");
  const [favorites, setFavorites] = useState<IPTVChannel[]>([]);
  const [history, setHistory] = useState<PlaybackHistoryItem[]>([]);

  // AJN Archive Specific State
  const [archiveEpisodes, setArchiveEpisodes] = useState<ArchiveEpisode[]>([]);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentArchiveIndex, setCurrentArchiveIndex] = useState<number>(0);
  const [feedLoadingStatus, setFeedLoadingStatus] = useState("Unloaded");
  const [isSiriusOverlayOpen, setIsSiriusOverlayOpen] = useState(false);
  const [isSiriusPlaying, setIsSiriusPlaying] = useState(false);
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
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [nextHourCountdown, setNextHourCountdown] = useState("00:00");

  // REFS
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const siriusAudioRef = useRef<HTMLAudioElement | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

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

    // Initialize Web Audio Object for Alan Parsons Project - Sirius Track
    const audio = new Audio("https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/The%20Alan%20Parsons%20Project%20-%20Sirius%20(Official%20Audio).mp3");
    audio.loop = true;
    audio.volume = 0.45;
    siriusAudioRef.current = audio;

    // Load AJN RSS Archive silencely
    loadArchiveFeed(false);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (siriusAudioRef.current) {
        siriusAudioRef.current.pause();
        siriusAudioRef.current = null;
      }
    };
  }, []);

  // Update clocks every second
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString());

      // Countdown to next show segment or hour
      const nextHour = new Date();
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const diffMs = nextHour.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      setNextHourCountdown(
        `${String(diffMins).padStart(2, "0")}:${String(diffSecs).padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

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
    const lines = rawText.split("\n");
    const parsedChannels: IPTVChannel[] = [];
    let currentChannel: Partial<IPTVChannel> | null = null;

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith("#EXTINF")) {
        const nameMatch = line.match(/,([^,]+)$/);
        const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
        currentChannel = {
          name: nameMatch ? nameMatch[1].trim() : "Unnamed Stream",
          logo: logoMatch ? logoMatch[1] : null,
          url: ""
        };
      } else if (line && !line.startsWith("#")) {
        if (currentChannel) {
          currentChannel.url = line;
          parsedChannels.push(currentChannel as IPTVChannel);
          currentChannel = null;
        }
      }
    }

    if (parsedChannels.length > 0) {
      setChannels(parsedChannels);
      localStorage.setItem("ajn_iptv_channels", JSON.stringify(parsedChannels));
      addLog(`Loaded and parsed ${parsedChannels.length} stream channels from Playlist`);
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

  const handleM3uUrlLoad = async () => {
    if (!m3uUrlInput.trim()) return;
    addLog(`Fetching external M3U playlist from: ${m3uUrlInput}`);
    setFeedLoadingStatus("Fetching M3U...");

    try {
      // Fetch directly or via proxy if direct fails
      let response = await fetch(m3uUrlInput);
      if (!response.ok) {
        addLog(`Direct M3U load blocked, trying stream proxy...`, "warning");
        response = await fetch(`/api/stream-proxy?url=${encodeURIComponent(m3uUrlInput)}`);
      }
      
      const text = await response.text();
      parseAndLoadM3U(text);
      setM3uUrlInput("");
    } catch (e: any) {
      addLog(`M3U playlist load failure: ${e.message}`, "error");
    }
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
          }

          let hour = "Full Show";
          const hourMatch = title.match(/Hr\s*(\d)/i) || title.match(/Hour\s*(\d)/i) || title.match(/Part\s*(\d)/i);
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

  // Filter episodes matching the selected date
  const selectedDateEpisodes = useMemo(() => {
    return archiveEpisodes.filter(ep => ep.dateKey === selectedDate);
  }, [archiveEpisodes, selectedDate]);

  // Handle Sirius Music Overlay Control
  const startSiriusMusic = async () => {
    if (siriusAudioRef.current) {
      try {
        siriusAudioRef.current.currentTime = 30; // Skipped introductory hums, get straight to Alan Parsons Project synthesizer lead!
        await siriusAudioRef.current.play();
        setIsSiriusPlaying(true);
        addLog("Preamble Sound: The Alan Parsons Project - 'Sirius' is playing");
      } catch (e: any) {
        addLog("Audio autoplay blocked by system. Click overlay to trigger.", "warning");
      }
    }
  };

  const stopSiriusMusic = () => {
    if (siriusAudioRef.current) {
      siriusAudioRef.current.pause();
      setIsSiriusPlaying(false);
      addLog("Sirius preamble background music paused");
    }
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
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const typeToUse = streamType === "auto" ? (url.endsWith(".m3u8") || url.includes("m3u8") ? "hls" : "native") : streamType;

    if (typeToUse === "hls" && Hls.isSupported()) {
      addLog("HLS Engine: Building Hls.js bindings");
      const hls = new Hls({
        maxMaxBufferLength: 20, // Low buffering latency
        enableWorker: true
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play()
          .then(() => setPlayerStatus("Playing"))
          .catch(() => addLog("Awaiting human tap to start play audio"));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          addLog(`HLS Engine Encountered fatal error: ${data.details}`, "error");
          handlePlayerError(url, titleStr);
        }
      });
    } else {
      addLog("Native Engine: Mounting direct web player source");
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
    localStorage.clear();
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

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    return channels.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  return (
    <div id="unified-player-app" className="min-h-screen flex flex-col font-sans transition-all duration-300 antialiased overflow-hidden select-none text-slate-300 bg-[#0B0E14]">
      
      {/* HEADER TOP BAR */}
      <header className="h-20 px-8 flex items-center justify-between border-b border-slate-800/50 bg-[#080A0F]/95 backdrop-blur-md z-30 shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            id="btn-sidebar-toggle-left"
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className="p-2.5 cursor-pointer bg-slate-800/30 hover:bg-slate-800 border border-slate-800/50 rounded-xl text-blue-400 hover:text-white transition-all active:scale-95"
            title="Toggle Sidebar Control Panel"
          >
            <Menu className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-950/40">
              A
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white uppercase sm:text-base">
                AJN Professional Player
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide">IPTV & Segmented Video Archives</p>
            </div>
          </div>
        </div>

        {/* MIDDLE DISPLAY: TIME & Countdown */}
        <div className="hidden sm:flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2 bg-[#050608] px-4 py-2 rounded-full border border-slate-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-500 font-mono text-[10px] uppercase tracking-wider">CLOCK:</span>
            <span className="font-mono text-white tracking-widest">{currentTimeStr || "--:--:--"}</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/10">
            <span className="text-blue-400 font-bold font-mono text-[10px] uppercase tracking-widest">⏱️ NEXT SEGMENT IN:</span>
            <span className="font-mono text-white text-xs">{nextHourCountdown}</span>
          </div>
        </div>

        {/* UTILITIES (RIGHT) */}
        <div className="flex items-center gap-2">
          {feedLoadingStatus !== "Loaded" && (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="text-amber-500 mr-2"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
          )}

          <button 
            onClick={() => {
              setIsSiriusOverlayOpen(true);
              startSiriusMusic();
            }}
            className="px-4 py-2 text-xs cursor-pointer bg-slate-800/40 hover:bg-blue-600 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-sm"
            title="Launch Sirius Sound Overlay"
          >
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            Sirius Preamble
          </button>

          <button 
            id="btn-sidebar-toggle-right"
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className="p-2.5 cursor-pointer bg-slate-800/30 hover:bg-slate-800 border border-slate-800/50 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
            title="Toggle Engine Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button 
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="p-2.5 cursor-pointer bg-slate-800/30 hover:bg-slate-800 border border-slate-800/50 rounded-xl text-amber-500 hover:text-white transition-all active:scale-95"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
              className="h-full bg-[#080A0F] shrink-0 flex flex-col border-r border-slate-800/50 z-20 overflow-hidden"
            >
              {/* TABS SELECTOR */}
              <div className="p-3 grid grid-cols-4 gap-1 bg-[#06080c] shrink-0 text-slate-500 text-xs font-semibold font-sans border-b border-slate-900">
                {(["playlist", "favorites", "history", "archive"] as const).map(tab => {
                  const isActive = activeTab === tab;
                  const label = tab === "playlist" ? "📡 Streams" 
                    : tab === "favorites" ? "⭐ Favs" 
                    : tab === "history" ? "📜 Hist" 
                    : "🗄️ AJN";
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-2 text-center rounded-lg text-[11px] cursor-pointer font-bold transition-all ${
                        isActive 
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm" 
                          : "border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20"
                      }`}
                    >
                      {isActive && <span className="mr-0.5">•</span>}
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* TABS CONTAINER */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* 1. PLAYLIST TAB */}
                {activeTab === "playlist" && (
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
                    </div>

                    {/* Channel Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-4.5 top-3" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search channel registry..."
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-slate-800/60 bg-[#050608] focus:border-blue-500/80 text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>

                    {/* Channels List */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-wider text-slate-500 px-1">
                        <span>📡 REGISTERED STREAMS</span>
                        <span className="bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-800">{filteredChannels.length} total</span>
                      </div>
                      
                      {filteredChannels.length === 0 ? (
                        <div className="text-center py-10 text-xs text-slate-500 font-medium">
                          No matching streams. Try loading another list!
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                          {filteredChannels.map((channel, idx) => {
                            const isCurrentlyActive = currentUrl === channel.url;
                            const isFav = favorites.some(f => f.url === channel.url);
                            return (
                              <div 
                                key={idx}
                                className={`group p-2.5 rounded-2xl flex items-center justify-between gap-2 border border-slate-800/20 transition-all cursor-pointer ${
                                  isCurrentlyActive 
                                    ? "bg-blue-500/10 border-blue-500/30 shadow-md shadow-blue-950/20" 
                                    : "bg-slate-900/10 hover:bg-slate-900/35 border-transparent hover:border-slate-800/50"
                                }`}
                              >
                                <div 
                                  onClick={() => playStream(channel.url, channel.name)}
                                  className="flex-1 min-w-0 flex items-center gap-3"
                                >
                                  <img 
                                    src={channel.logo || "https://placehold.co/40x40/151f38/ffffff?text=📡"} 
                                    alt="logo" 
                                    className="w-8 h-8 rounded-xl border border-slate-800 object-contain shrink-0 bg-[#050608]"
                                    onError={(e) => {
                                      e.currentTarget.src = "https://placehold.co/40x40/151f38/ffffff?text=IPTV";
                                    }}
                                  />
                                  <div className="truncate">
                                    <h4 className={`text-xs font-semibold leading-tight group-hover:text-blue-400 ${isCurrentlyActive ? "text-blue-400" : "text-slate-200"}`}>
                                      {channel.name}
                                    </h4>
                                    <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{channel.url}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => toggleFavorite(channel)}
                                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-amber-400 cursor-pointer transition-all"
                                  title="Add to Favorites"
                                >
                                  <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. FAVORITES TAB */}
                {activeTab === "favorites" && (
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
                                  src={fav.logo || "https://placehold.co/40x40/151f38/ffffff?text=⭐"} 
                                  alt="logo" 
                                  className="w-8 h-8 rounded-xl border border-slate-800 object-contain bg-[#050608]"
                                  onError={(e) => { e.currentTarget.src = "https://placehold.co/40x40/151f38/ffffff?text=IPTV"; }}
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
                {activeTab === "history" && (
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
                    
                    {/* Date Selector */}
                    <div className="bg-slate-900/20 rounded-2xl border border-slate-800/40 p-4 space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          ARCHIVE TEMPLATE
                        </label>
                        <span className="text-[9px] text-emerald-400 font-mono px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase font-bold">
                          {feedLoadingStatus}
                        </span>
                      </div>

                      {archiveDates.length === 0 ? (
                        <div className="py-2 text-[10px] text-slate-500 font-semibold font-mono">
                          Awaiting sync feed parsing...
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block font-mono">Select Segment Date:</span>
                          <select 
                            value={selectedDate}
                            onChange={(e) => {
                              setSelectedDate(e.target.value);
                              setCurrentArchiveIndex(0);
                              addLog(`Archive date changed to: ${e.target.value}`);
                            }}
                            className="w-full px-3 py-2 text-xs text-white rounded-xl bg-[#050608] border border-slate-800 focus:border-blue-500 outline-none cursor-pointer transition-all"
                          >
                            {archiveDates.map(date => (
                              <option key={date} value={date}>{date} (Daily Segments)</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-800/40 flex gap-2">
                        <button 
                          onClick={() => loadArchiveFeed(true)}
                          className="flex-1 py-1.5 px-2 text-[10px] font-bold cursor-pointer text-center bg-slate-800/50 hover:bg-blue-600 rounded-xl border border-slate-700/50 hover:border-blue-500 text-slate-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                          Reload Feed
                        </button>

                        {isSiriusPlaying && (
                          <button 
                            onClick={stopSiriusMusic}
                            className="py-1.5 px-3 text-[10px] font-extrabold cursor-pointer text-center bg-rose-500/15 hover:bg-rose-600 border border-rose-500/20 text-rose-300 rounded-xl transition-all shrink-0"
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
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                          {selectedDateEpisodes.map((ep, idx) => {
                            const isCurrentlySelected = currentArchiveIndex === idx && currentUrl === ep.videoUrl;
                            const colorScheme = HOUR_COLOR_SCHEME[ep.hour] || HOUR_COLOR_SCHEME["default"];
                            
                            return (
                              <div
                                key={ep.id}
                                onClick={() => playArchiveEpisode(ep, idx)}
                                style={{ 
                                  "--tile-color": colorScheme.hex,
                                  "--tile-color-rgb": colorScheme.rgb
                                } as React.CSSProperties}
                                className={`tile-block p-3.5 rounded-2xl text-left transition-all cursor-pointer relative overflow-hidden border border-slate-800/30 ${
                                  isCurrentlySelected ? "tile-active shadow-md" : "bg-slate-900/10 hover:bg-slate-900/30"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                    {ep.show}
                                  </span>
                                  <span 
                                    style={{ color: colorScheme.hex }}
                                    className="text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorScheme.hex }}></span>
                                    {ep.hour}
                                  </span>
                                </div>
                                <h4 className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2">
                                  {ep.title}
                                </h4>
                                <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono pt-1.5 border-t border-slate-800/40">
                                  <span>{new Date(ep.pubDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                  <span className="text-slate-600 truncate max-w-[120px]">{ep.videoUrl.split("/").pop()}</span>
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

              </div>
              <div className="p-3 bg-[#06080c] border-t border-slate-800/60 shrink-0 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                SECURE EDGE BYPASS ENGINE ACTIVE
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* CENTER STAGE: VIDEO PLAYER */}
        <main className="flex-1 flex flex-col bg-[#0B0E14] overflow-hidden relative">
          
          {/* PLAYER WORKSPACE */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-8">
            
            {/* FLOATING HEADER INFO BAR (Sleek Theme Styling) */}
            {currentUrl && (
              <div 
                id="gold-info-bar"
                className="absolute top-8 left-1/2 -translate-x-1/2 bg-[#080A0F]/90 border border-slate-800 rounded-full px-6 py-3 backdrop-blur-md z-10 flex items-center gap-5 text-slate-300 text-[11px] font-mono tracking-wider shadow-2xl shadow-black/80 font-medium max-w-[90%] truncate shrink-0"
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">CLOCK:</span>
                  <span className="text-white tracking-widest">{currentTimeStr || "--:--:--"}</span>
                </div>
                <div className="w-[1px] h-3 bg-slate-800"></div>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest">PLAYING:</span>
                  <span className="text-white font-semibold truncate max-w-[180px] md:max-w-[360px]">{currentTitle}</span>
                </div>
                <div className="hidden md:flex items-center gap-5">
                  <div className="w-[1px] h-3 bg-slate-800"></div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">⚡ INTRO COUNTDOWN:</span>
                    <span className="text-slate-100">{nextHourCountdown}</span>
                  </div>
                </div>
              </div>
            )}

            {/* VIDEO GRAPHICS ELEMENT - Styled elegantly like active queue */}
            <div className="w-full max-w-5xl aspect-video rounded-[32px] overflow-hidden bg-slate-950 border border-slate-800/60 shadow-2xl relative flex items-center justify-center shadow-blue-950/20">
              
              <video
                id="native-video-node"
                ref={videoRef}
                controls
                onPlay={handleVideoPlayEvent}
                onPause={handleVideoPauseEvent}
                onError={handleVideoErrorEvent}
                className="w-full h-full object-contain"
                poster="https://placehold.co/1280x720/0a0f1d/3b82f6?text=AJN+IPTV+Professional+Player"
              />

              {/* Status Layer overlays over the player on buffering */}
              {playerStatus === "Loading" && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center flex-col gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-mono font-bold text-blue-400 animate-pulse tracking-widest uppercase">
                    Configuring HLS Stream Gateway...
                  </span>
                </div>
              )}

              {/* Idle screen cover */}
              {!currentUrl && (
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
              {currentUrl && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#080A0F]/90 px-5 py-2.5 border border-slate-800/80 rounded-full flex items-center gap-4 shadow-2xl hover:opacity-100 transition-opacity whitespace-nowrap">
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
                </div>
              )}
            </div>

          </div>

          {/* DYNAMIC SCROLLING DEBUG TERMINAL (Sleek Theme Slate/Amber-themed layout) */}
          {debugMode === "on" && (
            <div 
              id="viewport-debug-console"
              className="h-28 shrink-0 bg-[#050608] border-t border-slate-800/80 font-mono text-[10px] text-blue-400 p-4 overflow-y-auto space-y-1 selection:bg-blue-900 selection:text-white"
            >
              {debugLogs.map((log, index) => (
                <div key={index} className="leading-relaxed hover:bg-slate-900/30">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef}></div>
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
              className="h-full bg-[#080A0F] shrink-0 border-l border-slate-800/50 p-6 space-y-6 z-20 overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2 font-mono">
                  <Activity className="w-4 h-4 text-blue-500" />
                  ENGINE REGISTRY
                </span>
                <button 
                  onClick={() => setIsRightSidebarOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-white cursor-pointer hover:bg-slate-800 rounded-xl transition-all"
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
            className="fixed inset-0 bg-[#080A0F]/95 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-[#0B0E14] border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative"
            >
              <button 
                onClick={stopSiriusMusic}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-full cursor-pointer transition-all active:scale-95"
                title="Silence Preamble"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 1. SPINNING VINTAGE VINYL INNER */}
              <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
                
                {/* Outward Vinyl groove lines */}
                <div className={`w-36 h-36 rounded-full bg-[#05080f] border-4 border-slate-800 flex items-center justify-center relative shadow-black/80 shadow-xl ${
                  isSiriusPlaying ? "animate-spin-vinyl" : ""
                }`}>
                  
                  {/* Internal tracks highlights */}
                  <div className="w-28 h-28 rounded-full border border-slate-700/60 flex items-center justify-center animate-pulse">
                    <div className="w-20 h-20 rounded-full border border-slate-700/60 flex items-center justify-center bg-[#070c14]">
                      
                      {/* Central label */}
                      <div className="w-10 h-10 rounded-full bg-blue-600 border border-slate-900 flex items-center justify-center font-bold text-[9px] text-white tracking-tighter">
                        AJN_LP
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stylus needle hook */}
                <div className="absolute top-0 right-2 w-10 h-20 origin-top rotate-[20deg] pointer-events-none">
                  <div className="w-1.5 h-16 bg-slate-400 rounded-full relative">
                    <div className="w-3 h-3 bg-slate-300 border border-slate-600 rounded-md absolute -bottom-1.5 -left-0.5"></div>
                  </div>
                </div>
              </div>

              {/* 2. AUDIO WAVE INDICATOR LINES */}
              {isSiriusPlaying && (
                <div className="h-6 flex items-center justify-center gap-1 mb-4 select-none">
                  <div className="w-1 h-5 bg-blue-500 rounded animate-wave-1"></div>
                  <div className="w-1 h-5 bg-blue-400 rounded animate-wave-2"></div>
                  <div className="w-1 h-5 bg-indigo-500 rounded animate-wave-3"></div>
                  <div className="w-1 h-5 bg-[#3B82F6] rounded animate-wave-4"></div>
                  <div className="w-1 h-5 bg-[#8B5CF6] rounded animate-wave-5"></div>
                </div>
              )}

              {/* TITLE */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold tracking-widest text-[#5c98ff] uppercase bg-blue-900/20 px-3 py-1 rounded-full border border-blue-500/10">
                  🎵 Broadcast Preamble Theme Active
                </span>
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                  The Alan Parsons Project · Sirius
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  The classic broadcast countdown anthem is selected and loaded from network hub. Ready to transition instantly to active stream chunks.
                </p>
              </div>

              {/* CONTROL BUTTONS */}
              <div className="mt-6 flex flex-col gap-2">
                <button 
                  onClick={handleCloseOverlayAndPlaySelected}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-xs text-white font-bold uppercase rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-900/20"
                >
                  ▶️ Close Music & Play Direct Stream
                </button>

                {isSiriusPlaying ? (
                  <button 
                    onClick={stopSiriusMusic}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg cursor-pointer transition-all"
                  >
                    Silence Music Preamble
                  </button>
                ) : (
                  <button 
                    onClick={startSiriusMusic}
                    className="w-full py-2 bg-blue-950 hover:bg-blue-900 text-xs font-bold text-blue-400 rounded-lg cursor-pointer transition-all"
                  >
                    Resume Prelude Theme
                  </button>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
