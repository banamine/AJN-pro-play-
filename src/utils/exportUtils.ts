/**
 * Pure client-side M3U and self-contained embedded HTML Web Player builders.
 * No server round-trip needed — builds directly from browser memory and triggers download.
 */

export interface ExportEpisode {
  title?: string | null;
  url?: string | null;
  duration?: number | null;
  groupTitle?: string | null;
  tvgLogo?: string | null;
}

// ── Language Classifier Helper ───────────────────────────────────────────────

export function detectLanguage(title: string, groupTitle = ""): { code: string; name: string } {
  const text = `${title} ${groupTitle}`.toLowerCase();

  // Spanish detection patterns: ESP, ES, Spanish, Español, Latino, etc.
  if (
    /\b(esp|es|spa|spanish|español|espanol|latino|univision|sudamerica|telemundo|mexico|colombia|argentina|chile|peru|venezuela|madrid|espana|españa)\b/i.test(text) ||
    /\[es\]|\[esp\]|\(es\)|\(esp\)|es:|esp:/i.test(text)
  ) {
    return { code: "es", name: "Spanish" };
  }

  // Russian detection patterns: RUS, RU, Russian, Русский, etc., or Cyrillic characters
  if (
    /\b(rus|ru|russian|русский|новости|россия|тв|russia)\b/i.test(text) ||
    /\[ru\]|\[rus\]|\(ru\)|\(rus\)|ru:|rus:/i.test(text) ||
    /[\u0400-\u04FF]/.test(text) // Cyrillic character set
  ) {
    return { code: "ru", name: "Russian" };
  }

  // Other languages detection
  // French
  if (
    /\b(fr|fra|french|français|francais|paris|belgique|belgium|canada-fr)\b/i.test(text) ||
    /\[fr\]|\[fra\]|\(fr\)|\(fra\)|fr:|fra:/i.test(text)
  ) {
    return { code: "fr", name: "French" };
  }
  // German
  if (
    /\b(de|deu|ger|german|deutsch|deutschland|austria|vienna|swiss|schweiz)\b/i.test(text) ||
    /\[de\]|\[ger\]|\(de\)|\(ger\)|de:|ger:/i.test(text)
  ) {
    return { code: "de", name: "German" };
  }
  // Italian
  if (
    /\b(it|ita|italian|italiano|italia|italy|rome)\b/i.test(text) ||
    /\[it\]|\[ita\]|\(it\)|\(ita\)|it:|ita:/i.test(text)
  ) {
    return { code: "it", name: "Italian" };
  }
  // Portuguese
  if (
    /\b(pt|por|portuguese|português|portugues|brasil|brazil|lisbon|portugal)\b/i.test(text) ||
    /\[pt\]|\[por\]|\(pt\)|\(por\)|pt:|por:/i.test(text)
  ) {
    return { code: "pt", name: "Portuguese" };
  }
  // Arabic
  if (
    /\b(ar|ara|arabic|arabi|news-ar|الجزيرة|العربية|مصر|دبي|لبنان|سعودية)\b/i.test(text) ||
    /[\u0600-\u06FF]/.test(text) ||
    /\[ar\]|\[ara\]|\(ar\)|\(ara\)|ar:|ara:/i.test(text)
  ) {
    return { code: "ar", name: "Arabic" };
  }
  // Chinese
  if (
    /\b(zh|chn|chi|chinese|china|cctv|cgtn|taiwan|hongkong|中文|北京|上海)\b/i.test(text) ||
    /[\u4e00-\u9fa5]/.test(text) ||
    /\[zh\]|\[chn\]|\(zh\)|\(chn\)|zh:|chn:/i.test(text)
  ) {
    return { code: "zh", name: "Chinese" };
  }
  // Japanese
  if (
    /\b(ja|jpn|japanese|tokyo|nhk|日本語|日本)\b/i.test(text) ||
    /[\u3040-\u309F\u30A0-\u30FF]/.test(text) ||
    /\[ja\]|\[jpn\]|\(ja\)|\(jpn\)|ja:|jpn:/i.test(text)
  ) {
    return { code: "ja", name: "Japanese" };
  }

  // Common other languages list
  const otherLanguages = [
    { code: "pl", name: "Polish", patterns: /\b(pl|pol|polish|polski|warsaw)\b/i },
    { code: "tr", name: "Turkish", patterns: /\b(tr|tur|turkish|türkçe|turkiye|istanbul)\b/i },
    { code: "ua", name: "Ukrainian", patterns: /\b(ua|ukr|ukrainian|україна|київ)\b/i },
    { code: "nl", name: "Dutch", patterns: /\b(nl|nld|dutch|nederlands|amsterdam)\b/i },
    { code: "gr", name: "Greek", patterns: /\b(gr|gre|greek|athens|Ελλάδα|ελληνικά)\b/i },
    { code: "ko", name: "Korean", patterns: /\b(ko|kor|korean|seoul|한국어|조선)\b/i },
    { code: "vi", name: "Vietnamese", patterns: /\b(vi|vie|vietnamese|viet|hanoi)\b/i },
    { code: "hi", name: "Hindi", patterns: /\b(hi|hin|hindi|india|delhi|हिंदी)\b/i },
    { code: "id", name: "Indonesian", patterns: /\b(id|ind|indonesian|jakarta)\b/i },
    { code: "cs", name: "Czech", patterns: /\b(cs|cze|czech|praha|prague)\b/i },
    { code: "ro", name: "Romanian", patterns: /\b(ro|ron|romanian|bucuresti|romania)\b/i },
    { code: "sv", name: "Swedish", patterns: /\b(sv|swe|swedish|stockholm|sverige)\b/i },
  ];

  for (const lang of otherLanguages) {
    if (lang.patterns.test(text)) {
      return { code: lang.code, name: lang.name };
    }
  }

  // DEFAULT is English
  return { code: "en", name: "English" };
}

// ── Standard M3U builder ───────────────────────────────────────────────────────

export function buildM3U(
  episodes: ExportEpisode[],
  playlistTitle = "AJN Playlist",
  ajnPrefix = true
): string {
  const lines = [`#EXTM3U x-tvg-name="${playlistTitle}"`];
  for (const ep of episodes) {
    const url = (ep.url ?? "").trim();
    if (!url) continue;
    const dur   = ep.duration && ep.duration > 0 ? Math.floor(ep.duration) : -1;
    const title = (ep.title ?? "").replace(/,/g, " ");
    const logo  = ep.tvgLogo   ? ` tvg-logo="${ep.tvgLogo}"`       : "";
    const group = ep.groupTitle ? ` group-title="${ep.groupTitle}"` : "";
    const displayTitle = ajnPrefix ? `🎬 AJN - ${title}` : title;
    lines.push(`#EXTINF:${dur}${logo}${group},${displayTitle}`);
    lines.push(url);
  }
  return lines.join("\n");
}

// ── Language-Separated M3U builder ────────────────────────────────────────────

export function buildLanguageSeparatedM3U(episodes: ExportEpisode[], playlistTitle = "AJN Language Playlist"): string {
  // First, group episodes by language
  const groups: Record<string, { name: string; items: ExportEpisode[] }> = {};
  
  for (const ep of episodes) {
    const url = (ep.url ?? "").trim();
    if (!url) continue;
    
    const title = ep.title ?? "Unnamed Segment";
    const groupTitle = ep.groupTitle ?? "";
    const { code, name } = detectLanguage(title, groupTitle);
    
    if (!groups[code]) {
      groups[code] = { name, items: [] };
    }
    groups[code].items.push(ep);
  }

  // Prescribed order: English first (default), Spanish second, Russian third,
  // and other languages sorted alphabetically by their language name thereafter.
  const mainKeys = ["en", "es", "ru"];
  const otherKeys = Object.keys(groups)
    .filter(k => !mainKeys.includes(k))
    .sort((a, b) => groups[a].name.localeCompare(groups[b].name));

  const orderedKeys = [...mainKeys.filter(k => groups[k]), ...otherKeys];

  const lines = [`#EXTM3U x-tvg-name="${playlistTitle}"`];

  for (const key of orderedKeys) {
    const langGroup = groups[key];
    if (!langGroup || langGroup.items.length === 0) continue;

    // Add a divider or section comment in M3U
    lines.push(`\n# =================================================================`);
    lines.push(`# LANGUAGE CHANNEL: ${langGroup.name.toUpperCase()} PANEL (${langGroup.items.length} streams)`);
    lines.push(`# =================================================================`);

    for (const ep of langGroup.items) {
      const url = (ep.url ?? "").trim();
      const dur = ep.duration && ep.duration > 0 ? Math.floor(ep.duration) : 3600;
      const title = (ep.title ?? "").replace(/,/g, " ");
      const logo = ep.tvgLogo ? ` tvg-logo="${ep.tvgLogo}"` : "";
      
      // Embed language as the group-title category
      lines.push(`#EXTINF:${dur}${logo} group-title="${langGroup.name}",🎬 AJN [${langGroup.name}] - ${title}`);
      lines.push(url);
    }
  }

  return lines.join("\n");
}

// ── Full-broadcast Dynamic HTML Player builder ───────────────────────────────

export function buildWeeblyHtml(
  episodes: ExportEpisode[],
  playlistTitle = "AJN TV Broadcast Channel",
): string {
  // Map clean fields
  const playlist = episodes
    .filter((ep) => (ep.url ?? "").trim().length > 0)
    .map((ep, idx) => ({
      title: (ep.title ?? `Segment ${idx + 1}`).slice(0, 200),
      url: (ep.url ?? "").trim(),
      episode: (ep.title ?? `Segment ${idx + 1}`).slice(0, 200),
      group: (ep.groupTitle ?? "AJN Archive"),
      duration: ep.duration && ep.duration > 0 ? Math.floor(ep.duration) : 3600,
      "tvg-logo": (ep.tvgLogo ?? "https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/ajn_logo.png"),
    }));

  const safeTitle = playlistTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const playlistJson = JSON.stringify(playlist)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${safeTitle}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      background: radial-gradient(ellipse at center, #0a0c16 0%, #030408 100%);
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
    }
    
    /* 1. Constrained top bar (exactly 64px tall, absolute layout) */
    #top-banner {
      background: rgba(8, 10, 22, 0.95);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(59, 130, 246, 0.2);
      padding: 0 20px;
      height: 64px;
      width: 100%;
      flex-shrink: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    }
    .banner-content {
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .channel-info {
      display: flex;
      align-items: center;
      gap: 16px;
      overflow: hidden;
      flex: 1;
    }
    #top-banner h1 {
      margin: 0;
      font-size: 14px;
      color: #3b82f6;
      text-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
      font-weight: 950;
      letter-spacing: 1px;
      text-transform: uppercase;
      white-space: nowrap;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      padding-right: 16px;
    }
    .info-line {
      font-size: 11px;
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 320px;
    }
    .now { color: #10b981; font-weight: bold; }
    .next { color: #94a3b8; }
    .highlight { color: #f59e0b; font-weight: bold; }
    
    #clock-pill {
      background: rgba(15, 23, 42, 0.82);
      border: 1px solid rgba(59, 130, 246, 0.25);
      padding: 6px 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      background-color: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 8px #ef4444;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.15); }
      100% { opacity: 0.4; transform: scale(0.9); }
    }
    #clock {
      font-size: 12px;
      color: #10b981;
      font-weight: bold;
      font-family: monospace;
      text-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
    }

    /* 2. Centered Cinema Video Monitor console desk */
    #video-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    #video-desk-frame {
      width: 100%;
      max-width: 1000px; /* Constrained broadcast display monitor */
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 16px;
      border: 3px solid #1e293b;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.95),
                  0 0 40px rgba(59, 130, 246, 0.12);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #media-stage {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
    }
    #video-player {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
      display: block;
    }
    
    /* Elegant curtain animations during skips */
    #curtain-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 20;
      pointer-events: none;
      display: flex;
    }
    #curtain-left, #curtain-right {
      position: absolute;
      height: 100%; width: 50.5%;
      background: #04050a;
      transition: transform 0.45s cubic-bezier(0.77, 0, 0.175, 1);
    }
    #curtain-left { left: 0; transform: translateX(-100%); }
    #curtain-right { right: 0; transform: translateX(100%); }
    #curtain-overlay.closed #curtain-left { transform: translateX(0); }
    #curtain-overlay.closed #curtain-right { transform: translateX(0); }
    #curtain-left::after { content:''; position:absolute; top:0; right:0; width:2px; height:100%; background:#3b82f6; box-shadow:0 0 10px rgba(59,130,246,0.8); }
    #curtain-right::after { content:''; position:absolute; top:0; left:0; width:2px; height:100%; background:#3b82f6; box-shadow:0 0 10px rgba(59,130,246,0.8); }

    /* Overlay Control Bubble HUD button and full-screen state */
    #control-bubble {
      position: absolute;
      bottom: 24px; right: 84px;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 50%;
      width: 44px; height: 44px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 150;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 16px;
      color: #3b82f6;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    }
    #control-bubble:hover {
      background: rgba(59, 130, 246, 0.22);
      border-color: #3b82f6;
      transform: scale(1.08);
    }
    #fullscreen-btn {
      position: absolute;
      bottom: 24px; right: 24px;
      z-index: 150;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 50%;
      width: 44px; height: 44px;
      color: #3b82f6;
      font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    }
    #fullscreen-btn:hover {
      background: rgba(59, 130, 246, 0.22);
      border-color: #3b82f6;
      transform: scale(1.08);
    }

    /* 3. Constrained Playlist strip at bottom */
    #playlist-strip-container {
      background: rgba(8, 10, 22, 0.95);
      border-top: 1px solid rgba(59, 130, 246, 0.15);
      padding: 12px 20px;
      height: 96px;
      flex-shrink: 0;
      z-index: 900;
      display: flex;
      align-items: center;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
    }
    .strip-wrapper {
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 16px;
      height: 100%;
    }
    .strip-label {
      font-size: 10px;
      font-weight: 900;
      font-family: monospace;
      color: #64748b;
      writing-mode: vertical-lr;
      transform: rotate(180deg);
      letter-spacing: 2px;
      text-transform: uppercase;
      padding-right: 12px;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }
    .guide-strip {
      flex: 1;
      display: flex;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 4px 0;
      height: 100%;
      align-items: center;
    }
    .guide-strip::-webkit-scrollbar {
      height: 4px;
    }
    .guide-strip::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.2);
    }
    .guide-strip::-webkit-scrollbar-thumb {
      background: rgba(59, 130, 246, 0.25);
      border-radius: 2px;
    }
    
    /* Elegant Lazy Card Elements always showing at least three cards horizontally */
    .guide-item {
      flex: 0 0 200px;
      height: 58px;
      background: rgba(15, 23, 42, 0.62);
      border: 1px solid rgba(71, 85, 105, 0.32);
      border-radius: 10px;
      padding: 8px 12px;
      cursor: pointer;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    .guide-item:hover {
      background: rgba(59, 130, 246, 0.12);
      border-color: rgba(59, 130, 246, 0.6);
      transform: translateY(-2px);
    }
    .guide-item.current {
      background: rgba(16, 185, 129, 0.12);
      border-color: #10b981;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.22);
    }
    .guide-title {
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #e2e8f0;
      margin-bottom: 3px;
    }
    .guide-time {
      font-size: 9px;
      color: #64748b;
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    /* Card structural skeletons loaders */
    .card-skeleton {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
      justify-content: center;
    }
    .card-skeleton::before {
      content: '';
      width: 75%;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
      background-size: 200% 100%;
      animation: skelGlow 1.5s infinite linear;
    }
    .card-skeleton::after {
      content: '';
      width: 45%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
      background-size: 200% 100%;
      animation: skelGlow 1.5s infinite linear;
    }
    @keyframes skelGlow {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Responsive scaling styles */
    @media (max-width: 768px) {
      body {
        overflow-y: auto;
        overflow-x: hidden;
        height: auto;
        min-height: 100%;
      }
      #top-banner {
        height: auto;
        padding: 12px 16px;
      }
      .banner-content {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      .channel-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      #top-banner h1 {
        border-right: none;
        padding-right: 0;
        font-size: 13px;
      }
      #video-container {
        padding: 12px;
        min-height: 220px;
      }
      #playlist-strip-container {
        height: auto;
        padding: 14px 16px;
      }
      .strip-wrapper {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      .strip-label {
        writing-mode: horizontal-tb;
        transform: rotate(0deg);
        height: auto;
        justify-content: flex-start;
        border-right: none;
        padding-right: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 6px;
      }
      .guide-strip {
        gap: 10px;
        height: 60px;
      }
    }
  </style>
</head>
<body>
  <div id="top-banner">
    <div class="banner-content">
      <div class="channel-info">
        <h1>${safeTitle}</h1>
        <div class="info-line now">NOW: <span id="now-playing">Loading Track...</span> <span style="color:#64748b;">(<span id="played-time">0:00:00</span>)</span></div>
        <div class="info-line next">UP NEXT: <span id="next-title">...</span> <span class="highlight">at <span id="next-time">??:??</span></span></div>
      </div>
      <div id="clock-pill">
        <div class="live-dot"></div>
        <div id="clock">00:00:00</div>
      </div>
    </div>
  </div>

  <div id="video-container">
    <div id="video-desk-frame">
      <div id="media-stage">
        <video id="video-player" autoplay playsinline controls preload="auto"></video>
        <div id="curtain-overlay">
          <div id="curtain-left"></div>
          <div id="curtain-right"></div>
        </div>
      </div>
    </div>
    <button id="fullscreen-btn" title="Toggle Fullscreen (F)">⛶</button>
    <div id="control-bubble" title="Next channel segment loops">📺</div>
  </div>

  <div id="playlist-strip-container">
    <div class="strip-wrapper">
      <div class="strip-label">GUIDE FEED</div>
      <div class="guide-strip" id="guide-strip"></div>
    </div>
  </div>

<script>
var playlist = ${playlistJson};
var currentIndex = 0;
var video = document.getElementById('video-player');
var guideStrip = document.getElementById('guide-strip');
var curtainOverlay = document.getElementById('curtain-overlay');
var consecutiveErrorCount = 0;

function formatTime(seconds) {
  var h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  var m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  var s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return h + ':' + m + ':' + s;
}

function updatePlayedTime() {
  if (video && video.currentTime) {
    document.getElementById('played-time').textContent = formatTime(video.currentTime);
  }
}

function updateClock() {
  var d = new Date();
  document.getElementById('clock').textContent = d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
}

function calculateNextStart() {
  if(!video || !video.duration) return;
  var remaining = video.duration - video.currentTime;
  var nextStart = new Date(Date.now() + remaining * 1000);
  document.getElementById('next-time').textContent = nextStart.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

// Render lazy layout structures with skeletons, always hydrating neighboring items to ensure at least 3 visible items are filled
function renderGuideStrip() {
  if (!guideStrip) return;
  guideStrip.innerHTML = '';
  
  playlist.forEach(function(item, index) {
    var guideItem = document.createElement('div');
    guideItem.className = 'guide-item placeholder';
    guideItem.id = 'guide-item-' + index;
    guideItem.setAttribute('data-index', index);
    
    // Skeleton loader
    guideItem.innerHTML = '<div class="card-skeleton"></div>';
    
    guideItem.addEventListener('click', function(){
      playCurtainTransition(function(){
        playMovie(index);
      });
    });
    guideStrip.appendChild(guideItem);
  });

  initLazyObserver();
  updateActiveGuideItem();
}

function hydrateCard(index) {
  var card = document.getElementById('guide-item-' + index);
  if (!card || !card.classList.contains('placeholder')) return;
  
  card.classList.remove('placeholder');
  var item = playlist[index];
  card.innerHTML = '<div class="guide-title">' + item.title + '</div>' + 
                   '<div class="guide-time">#' + (index+1) + ' • ' + (item.group || 'AJN Broadcast') + '</div>';
}

function forceHydrateAdjacent() {
  var prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  var nextIndex = (currentIndex + 1) % playlist.length;
  hydrateCard(currentIndex);
  hydrateCard(prevIndex);
  hydrateCard(nextIndex);
}

function initLazyObserver() {
  if (!window.IntersectionObserver) {
    // Fallback if browser environment lacks IntersectionObserver
    for (var i = 0; i < playlist.length; i++) {
      hydrateCard(i);
    }
    return;
  }
  
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var idx = parseInt(entry.target.getAttribute('data-index'), 10);
        hydrateCard(idx);
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: guideStrip,
    rootMargin: '120px',
    threshold: 0.05
  });
  
  var cards = guideStrip.querySelectorAll('.guide-item');
  cards.forEach(function(card) {
    observer.observe(card);
  });
  
  forceHydrateAdjacent();
}

function updateActiveGuideItem() {
  if (!guideStrip) return;
  
  var items = guideStrip.querySelectorAll('.guide-item');
  items.forEach(function(item) {
    var idx = parseInt(item.getAttribute('data-index'), 10);
    if (idx === currentIndex) {
      item.classList.add('current');
    } else {
      item.classList.remove('current');
    }
  });

  forceHydrateAdjacent();
  
  var current = guideStrip.querySelector('.current');
  if (current) {
    current.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'});
  }
}

function playCurtainTransition(onMidpoint) {
  if(!curtainOverlay) { if(onMidpoint) onMidpoint(); return; }
  curtainOverlay.classList.add('closed');
  setTimeout(function(){
    if(onMidpoint) onMidpoint();
    setTimeout(function(){
      curtainOverlay.classList.remove('closed');
    }, 150);
  }, 480);
}

function playMovie(index, initialSeekTime) {
  if (playlist.length === 0) return;
  if(index < 0 || index >= playlist.length) index = 0;
  currentIndex = index;
  var movie = playlist[index];
  var nextMovie = playlist[(index + 1) % playlist.length];
  
  document.getElementById('now-playing').textContent = movie.title;
  document.getElementById('next-title').textContent = nextMovie ? nextMovie.title : 'End of Loop';
  
  video.src = movie.url;
  video.load();
  
  if (initialSeekTime && initialSeekTime > 0) {
    var handleSeek = function() {
      video.removeEventListener('loadedmetadata', handleSeek);
      video.currentTime = Math.min(initialSeekTime, video.duration - 1);
    };
    video.addEventListener('loadedmetadata', handleSeek);
  }

  video.play().catch(function(e) {
    console.log('Autoplay blocked. Awaiting user gesture.');
  });
  
  updateActiveGuideItem();
  calculateNextStart();
  updatePlayedTime();
}

video.addEventListener('ended', function(){
  consecutiveErrorCount = 0;
  playCurtainTransition(function(){
    playMovie((currentIndex + 1) % playlist.length);
  });
});

video.addEventListener('error', function(e){
  consecutiveErrorCount++;
  console.error("Playback error encountered on source:", video.src);
  if(consecutiveErrorCount < 5) {
    setTimeout(function(){
      playMovie((currentIndex + 1) % playlist.length);
    }, 2000);
  }
});

video.addEventListener('canplay', function(){
  consecutiveErrorCount = 0;
});

video.addEventListener('timeupdate', function(){
  updatePlayedTime();
  calculateNextStart();
});

function toggleFullscreen() {
  if(!document.fullscreenElement && !document.webkitFullscreenElement) {
    var el = document.body;
    if(el.requestFullscreen) el.requestFullscreen();
    else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if(document.exitFullscreen) document.exitFullscreen();
    else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

document.getElementById('control-bubble').addEventListener('click', function() {
  playCurtainTransition(function() {
    playMovie((currentIndex + 1) % playlist.length);
  });
});

var fsBtn = document.getElementById('fullscreen-btn');
if(fsBtn) fsBtn.addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', function(e) {
  if(e.key === 'ArrowRight') {
    playCurtainTransition(function(){ playMovie((currentIndex + 1) % playlist.length); });
  }
  if(e.key === 'ArrowLeft') {
    playCurtainTransition(function(){ playMovie((currentIndex - 1 + playlist.length) % playlist.length); });
  }
  if(e.key === ' '){
    e.preventDefault();
    video.paused ? video.play() : video.pause();
  }
  if(e.key === 'f' || e.key === 'F') toggleFullscreen();
});

// Midnight synchronization anchor loop calculations
function initMidnightBroadcastSync() {
  var now = new Date();
  var hours = now.getHours();
  var minutes = now.getMinutes();
  var seconds = now.getSeconds();
  var secondsPastMidnight = (hours * 3600) + (minutes * 60) + seconds;

  var totalPlaylistDuration = 0;
  for (var p = 0; p < playlist.length; p++) {
    totalPlaylistDuration += (playlist[p].duration || 3600);
  }

  if (totalPlaylistDuration <= 0) {
    playMovie(0);
    return;
  }

  var relativeOffsetSeconds = secondsPastMidnight % totalPlaylistDuration;
  var accumulated = 0;
  var targetIndex = 0;
  var targetSeekOffset = 0;

  for (var i = 0; i < playlist.length; i++) {
    var itemDuration = playlist[i].duration || 3600;
    if (accumulated + itemDuration > relativeOffsetSeconds) {
      targetIndex = i;
      targetSeekOffset = relativeOffsetSeconds - accumulated;
      break;
    }
    accumulated += itemDuration;
  }

  playMovie(targetIndex, targetSeekOffset);
}

if(playlist.length > 0) {
  updateClock();
  setInterval(updateClock, 1000);
  renderGuideStrip();
  initMidnightBroadcastSync();
} else {
  document.getElementById('now-playing').textContent = 'No active segments loaded in the playlist.';
}
</script>
</body>
</html>`;
}

export function buildTVExplorerHtml(
  episodes: ExportEpisode[],
  playlistTitle = "TV Explorer - AJN",
): string {
  const playlist = episodes
    .filter((ep) => (ep.url ?? "").trim().length > 0)
    .map((ep, idx) => ({
      id: `ep-${idx}`,
      title: (ep.title ?? `Stream ${idx + 1}`).slice(0, 200),
      url: (ep.url ?? "").trim(),
      group: (ep.groupTitle ?? "General IPTV"),
      logo: (ep.tvgLogo ?? "https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/ajn_logo.png"),
    }));

  const safeTitle = playlistTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const playlistJson = JSON.stringify(playlist)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - TV Explorer</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #06080c; color: #f1f5f9; }
    .heading { font-family: 'Space Grotesk', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #080b11; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
  </style>
</head>
<body class="h-screen overflow-hidden flex flex-col">
  <!-- App Header -->
  <header class="bg-[#090d16] border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">📡</div>
      <div>
        <h1 class="heading text-md font-extrabold tracking-tight text-white">${safeTitle}</h1>
        <p class="text-[9px] text-blue-400 font-bold tracking-widest font-mono">TV EXPLORER ENGINE</p>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <div class="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span id="active-count-label">0 Streams Loaded</span>
      </div>
    </div>
  </header>

  <!-- Main Workspace -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Sidebar: Channels Navigator -->
    <aside class="w-80 bg-[#080b11] border-r border-slate-900 flex flex-col overflow-hidden shrink-0">
      <!-- Search & Filtering Box -->
      <div class="p-4 bg-[#090d16]/50 border-b border-slate-900 space-y-3 shrink-0">
        <div class="relative">
          <input 
            type="text" 
            id="search-box" 
            placeholder="Search streams..." 
            class="w-full bg-[#05070a] border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl py-2 pl-3 pr-10 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
          <div class="absolute right-3.5 top-2.5 text-slate-600 text-xs">🔍</div>
        </div>
        <div>
          <select 
            id="category-filter" 
            class="w-full bg-[#05070a] border border-slate-800 text-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="ALL">🔍 All Categories</option>
          </select>
        </div>
      </div>

      <!-- Navigation Feed -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1" id="channel-list">
        <!-- Dyn contents -->
      </div>
    </aside>

    <!-- Center Screen Playback Stage -->
    <main class="flex-1 flex flex-col bg-[#050608] relative overflow-hidden">
      <!-- Embedded Interactive Video Player Container -->
      <div class="flex-1 relative bg-black flex items-center justify-center group overflow-hidden">
        <video 
          id="player" 
          class="w-full h-full object-contain" 
          autoplay 
          controls 
          playsinline 
          preload="auto"
        ></video>
        
        <!-- Status indicator overlay on error / buffering -->
        <div id="player-banner" class="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-10 hidden">
          <div class="w-16 h-16 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mb-4 animate-bounce">📺</div>
          <h2 class="heading text-xl font-bold text-white mb-2" id="banner-title">No Active Stream selected</h2>
          <p class="text-sm text-slate-400 max-w-sm" id="banner-subtitle">Pick any stream channels or segments from the explorer panel on the left to activate playback.</p>
        </div>
      </div>

      <!-- Live Stream Info Bar (Bottom) -->
      <div class="bg-[#090d16] border-t border-slate-900 p-5 shrink-0">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-start gap-3.5">
            <img id="active-logo" src="https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/ajn_logo.png" alt="Stream Logo" class="w-11 h-11 rounded-xl object-contain bg-slate-950 p-1.5 border border-slate-805" />
            <div>
              <div id="active-category" class="text-[10px] uppercase font-bold tracking-wider text-blue-500 font-mono">STANDBY</div>
              <h2 id="active-title" class="heading text-md font-bold text-slate-100 mt-0.5 leading-snug">Welcome to TV Explorer</h2>
              <p id="active-url" class="text-[11px] text-slate-500 font-mono select-all truncate mt-1 max-w-[400px] md:max-w-[600px] hover:text-slate-400 cursor-pointer" title="Click to copy stream URL">Select a stream above</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2.5">
            <button 
              id="copy-stream-btn" 
              class="px-4.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-350 transition-all cursor-pointer"
            >
              📋 Copy Direct Stream
            </button>
            <button 
              id="next-stream-btn" 
              class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer"
            >
              Skip Channel ➡️
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    const playlist = ${playlistJson};
    let currentIdx = null;
    let hlsInstance = null;

    // Elements
    const player = document.getElementById("player");
    const searchBox = document.getElementById("search-box");
    const categoryFilter = document.getElementById("category-filter");
    const channelList = document.getElementById("channel-list");
    const activeCountLabel = document.getElementById("active-count-label");
    const playerBanner = document.getElementById("player-banner");
    const bannerTitle = document.getElementById("banner-title");
    const bannerSubtitle = document.getElementById("banner-subtitle");
    const activeLogo = document.getElementById("active-logo");
    const activeCategory = document.getElementById("active-category");
    const activeTitle = document.getElementById("active-title");
    const activeUrl = document.getElementById("active-url");
    const copyStreamBtn = document.getElementById("copy-stream-btn");
    const nextStreamBtn = document.getElementById("next-stream-btn");

    // Initialize layout
    function init() {
      activeCountLabel.textContent = \`\${playlist.length} Streams Active\`;

      // Extract unique categories
      const categories = new Set();
      playlist.forEach(ep => { if(ep.group) categories.add(ep.group); });
      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = "📁 " + cat;
        categoryFilter.appendChild(opt);
      });

      renderList();

      // Bind events
      searchBox.addEventListener("input", renderList);
      categoryFilter.addEventListener("change", renderList);
      nextStreamBtn.addEventListener("click", () => {
        if(playlist.length === 0) return;
        const next = currentIdx === null ? 0 : (currentIdx + 1) % playlist.length;
        playStream(next);
      });
      copyStreamBtn.addEventListener("click", () => {
        if(currentIdx === null) return;
        navigator.clipboard.writeText(playlist[currentIdx].url);
        const originalText = copyStreamBtn.textContent;
        copyStreamBtn.textContent = "📋 Copied!";
        copyStreamBtn.classList.add("text-blue-400");
        setTimeout(() => {
          copyStreamBtn.textContent = originalText;
          copyStreamBtn.classList.remove("text-blue-400");
        }, 1500);
      });

      // Auto start first screen
      if (playlist.length > 0) {
        playStream(0);
      } else {
        showStatusBanner("Playlist empty", "Assemble your personal feeds & archives in the AJN dashboard before downloading.");
      }
    }

    function renderList() {
      const q = searchBox.value.toLowerCase().trim();
      const cat = categoryFilter.value;
      channelList.innerHTML = "";

      playlist.forEach((item, index) => {
        const matchesQuery = item.title.toLowerCase().includes(q) || item.group.toLowerCase().includes(q);
        const matchesCategory = cat === "ALL" || item.group === cat;

        if (matchesQuery && matchesCategory) {
          const btn = document.createElement("button");
          btn.className = \`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all border border-transparent cursor-pointer \${
            index === currentIdx 
              ? "bg-blue-600/10 border-blue-500/20 text-blue-400 font-semibold" 
              : "hover:bg-slate-900/50 text-slate-350"
          }\`;

          btn.innerHTML = \`
            <img src="\${item.logo}" alt="" class="w-8 h-8 rounded-lg object-contain bg-black/40 border border-slate-800 shrink-0 p-1" onerror="this.src='https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/ajn_logo.png'" />
            <div class="min-w-0 flex-1">
              <div class="text-[9px] text-slate-500 font-bold truncate tracking-wider font-mono uppercase">\${item.group}</div>
              <div class="text-xs font-semibold truncate leading-tight mt-0.5">\${item.title}</div>
            </div>
            <div class="text-[10px] text-slate-500 font-mono shrink-0">\${index + 1}</div>
          \`;

          btn.onclick = () => playStream(index);
          channelList.appendChild(btn);
        }
      });
    }

    function playStream(index) {
      if(index < 0 || index >= playlist.length) return;
      currentIdx = index;
      const stream = playlist[index];

      // Styles
      renderList();
      hideStatusBanner();

      // Set Metadata
      activeLogo.src = stream.logo;
      activeLogo.onerror = () => { activeLogo.src = "https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/ajn_logo.png"; };
      activeCategory.textContent = stream.group;
      activeTitle.textContent = stream.title;
      activeUrl.textContent = stream.url;

      // Handle custom high-resolution streaming engine
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
      }

      if (stream.url.endsWith(".m3u8") || stream.url.includes("m3u8")) {
        if (Hls.isSupported()) {
          const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
          let maxBufferLength = 30;
          let maxMaxBufferLength = 60;
          let maxBufferSizeValue = 50 * 1024 * 1024;
          let backBufferLen = 90;
          let extraSync = {};

          if (conn) {
            const type = conn.effectiveType || "4g";
            const speed = conn.downlink || 10;
            const isSaveData = conn.saveData || false;

            if (type === "slow-2g" || type === "2g" || speed < 1.5 || isSaveData) {
              maxBufferLength = 8;
              maxMaxBufferLength = 16;
              maxBufferSizeValue = 8 * 1024 * 1024; // Purget segment footprint
              backBufferLen = 10;
              extraSync = {
                maxBufferHole: 2.0,            // Bypass structural packet holes
                nudgeMaxRetries: 15,           // Recover live playhead instantly
                nudgeOffset: 0.15,
                highBufferWatchdogPeriod: 2,   // Aggressive A/V check cycles
              };
            } else if (type === "3g" || speed < 4.0) {
              maxBufferLength = 15;
              maxMaxBufferLength = 30;
              maxBufferSizeValue = 20 * 1024 * 1024;
              backBufferLen = 30;
              extraSync = {
                maxBufferHole: 1.5,
                nudgeMaxRetries: 10,
                highBufferWatchdogPeriod: 3,
              };
            } else {
              maxBufferLength = 40;
              maxMaxBufferLength = 80;
              maxBufferSizeValue = 65 * 1024 * 1024;
              backBufferLen = 120;
              extraSync = {
                maxBufferHole: 0.8,
                nudgeMaxRetries: 5,
              };
            }
          }

          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            maxBufferLength: maxBufferLength,
            maxMaxBufferLength: maxMaxBufferLength,
            maxBufferSize: maxBufferSizeValue,
            backBufferLength: backBufferLen,
            ...extraSync
          });
          hlsInstance.loadSource(stream.url);
          hlsInstance.attachMedia(player);
          hlsInstance.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log("fatal network error, attempting recovery");
                  hlsInstance.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log("fatal media error, attempting recovery");
                  hlsInstance.recoverMediaError();
                  break;
                default:
                  console.log("unrecoverable fatal stream error");
                  showStatusBanner("Playback Stream Blocked", "This live channel endpoint returned network block or is momentarily unresponsive. Skip to play the next stream.");
                  break;
              }
            }
          });
        } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
          player.src = stream.url;
        } else {
          showStatusBanner("unsupported livestream codec", "Your browser does not support HLS streaming natively. Try on Chrome, Safari, or Microsoft Edge.");
        }
      } else {
        // Direct media loader
        player.src = stream.url;
      }

      player.play().catch(err => {
        console.log("Waiting for user interaction to begin playback: " + err);
      });
    }

    function showStatusBanner(title, subtitle) {
      playerBanner.classList.remove("hidden");
      bannerTitle.textContent = title;
      bannerSubtitle.textContent = subtitle;
    }

    function hideStatusBanner() {
      playerBanner.classList.add("hidden");
    }

    // Capture arrow hotkeys represent linear channel dialing
    document.addEventListener("keydown", (e) => {
      if(e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        nextStreamBtn.click();
      } else if(e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = currentIdx === null ? 0 : (currentIdx - 1 + playlist.length) % playlist.length;
        playStream(prev);
      } else if(e.key === " ") {
        e.preventDefault();
        player.paused ? player.play() : player.pause();
      }
    });

    init();
  </script>
</body>
</html>`;
}

export function buildVidGridHtml(
  episodes: ExportEpisode[],
  playlistTitle = "VidGrid - AJN",
): string {
  const playlist = episodes
    .filter((ep) => (ep.url ?? "").trim().length > 0)
    .map((ep, idx) => ({
      id: `ep-${idx}`,
      title: (ep.title ?? `Stream ${idx + 1}`).slice(0, 200),
      url: (ep.url ?? "").trim(),
      group: (ep.groupTitle ?? "General IPTV"),
      logo: (ep.tvgLogo ?? "https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/ajn_logo.png"),
    }));

  const safeTitle = playlistTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const playlistJson = JSON.stringify(playlist)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - VidGrid Multi-Monitor</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #040508; color: #e2e8f0; }
    .heading { font-family: 'Space Grotesk', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #06070a; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
  </style>
</head>
<body class="h-screen overflow-hidden flex flex-col">
  <!-- Grid Control Center Header -->
  <header class="bg-[#080a0f] border-b border-slate-800/80 px-5 py-3 flex flex-wrap items-center justify-between shrink-0 gap-3">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20">🔲</div>
      <div>
        <h1 class="heading text-sm font-extrabold tracking-tight text-white">${safeTitle}</h1>
        <p class="text-[9px] text-orange-400 font-bold tracking-widest font-mono">VIDGRID MULTI-STREAM MONITOR</p>
      </div>
    </div>

    <!-- Active Configurations Toolbar -->
    <div class="flex items-center gap-2">
      <span class="text-[10px] text-slate-500 font-bold uppercase mr-1">Grid Layout:</span>
      <button onclick="setLayout(1)" id="lay-1" class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-350 hover:bg-slate-800 cursor-pointer">1x1 Solo</button>
      <button onclick="setLayout(2)" id="lay-2" class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-350 hover:bg-slate-800 cursor-pointer">1x2 Dual</button>
      <button onclick="setLayout(3)" id="lay-3" class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-350 hover:bg-slate-800 cursor-pointer">Triple (1+2)</button>
      <button onclick="setLayout(4)" id="lay-4" class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-350 hover:bg-slate-800 cursor-pointer">2x2 Quad</button>
    </div>
  </header>

  <!-- Interactive Grid Workspace -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Channel Picker Side Drawer -->
    <aside class="w-72 bg-[#06080d] border-r border-slate-900 flex flex-col overflow-hidden shrink-0">
      <div class="p-3 bg-slate-950/40 border-b border-slate-900">
        <input 
          type="text" 
          id="pick-search" 
          placeholder="Filtering channels..." 
          class="w-full bg-[#05070a] border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl py-1.5 px-3 text-[11px] focus:outline-none focus:border-orange-500"
        />
        <div class="text-[9px] text-slate-500 font-bold uppercase mt-2 ml-1">👇 Assign to: <span id="target-cell-label" class="text-orange-400 font-mono">Cell 1</span></div>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1" id="pick-list">
        <!-- dyn content -->
      </div>
    </aside>

    <!-- Monitor Matrix Screen stage -->
    <main class="flex-1 bg-[#020305] p-3 overflow-hidden flex flex-col justify-center">
      <div id="grid-container" class="grid w-full h-full gap-2 transition-all duration-300">
        <!-- populated dynamically by current grid layout count -->
      </div>
    </main>
  </div>

  <script>
    const playlist = ${playlistJson};
    let currentLayout = 4; // default to 2x2 grid
    let focusedCellId = 0; // index of cell getting new assignments
    
    // Hold video player instances
    const activeInstances = {};

    const gridContainer = document.getElementById("grid-container");
    const pickSearch = document.getElementById("pick-search");
    const pickList = document.getElementById("pick-list");
    const targetCellLabel = document.getElementById("target-cell-label");

    function init() {
      renderChannels();
      setLayout(4);

      pickSearch.addEventListener("input", renderChannels);
    }

    function renderChannels() {
      const q = pickSearch.value.toLowerCase().trim();
      pickList.innerHTML = "";

      playlist.forEach((item, index) => {
        if (q && !item.title.toLowerCase().includes(q) && !item.group.toLowerCase().includes(q)) return;

        const btn = document.createElement("button");
        btn.className = "w-full text-left p-2.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800/80 transition-all flex items-center gap-3 cursor-pointer group";
        btn.innerHTML = \`
          <img src="\${item.logo}" class="w-7 h-7 rounded object-contain bg-black/50 border border-slate-800 p-0.5 shrink-0" onerror="this.src='https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/ajn_logo.png'" />
          <div class="min-w-0 flex-1">
            <h4 class="text-[11px] font-semibold text-slate-350 truncate leading-tight group-hover:text-white transition-colors">\${item.title}</h4>
            <span class="text-[8px] font-bold font-mono text-slate-500">\${item.group}</span>
          </div>
        \`;
        
        btn.onclick = () => assignChannelToFocusedCell(item);
        pickList.appendChild(btn);
      });
    }

    function setLayout(mode) {
      currentLayout = mode;

      // Reset tabs style
      [1, 2, 3, 4].forEach(m => {
        const btn = document.getElementById("lay-" + m);
        if(m === mode) {
          btn.className = "px-3 py-1.5 rounded-lg bg-orange-600/15 border border-orange-500/20 text-xs font-bold text-orange-400 transition-all shadow-md";
        } else {
          btn.className = "px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-350 hover:bg-slate-800 cursor-pointer transition-all";
        }
      });

      // Redraw grid structures
      let cellsCount = 4;
      if (mode === 1) {
        cellsCount = 1;
        gridContainer.className = "grid grid-cols-1 w-full h-full gap-2";
      } else if (mode === 2) {
        cellsCount = 2;
        gridContainer.className = "grid grid-cols-1 md:grid-cols-2 w-full h-full gap-2";
      } else if (mode === 3) {
        cellsCount = 3;
        gridContainer.className = "grid grid-cols-12 w-full h-full gap-2";
      } else if (mode === 4) {
        cellsCount = 4;
        gridContainer.className = "grid grid-cols-2 w-full h-full gap-2";
      }

      // Save previous slots
      const oldStreams = {};
      Object.keys(activeInstances).forEach(id => {
        if(activeInstances[id] && activeInstances[id].currentStream) {
          oldStreams[id] = activeInstances[id].currentStream;
        }
      });

      // Clean up previous elements and recreate
      gridContainer.innerHTML = "";

      for (let i = 0; i < cellsCount; i++) {
        const cell = document.createElement("div");
        
        let customSpan = "";
        if (mode === 3) {
          // Triple monitor layout (1 main stream on bottom or top, 2 smaller monitors)
          if(i === 0) customSpan = "col-span-12 md:col-span-8";
          else customSpan = "col-span-12 md:col-span-4";
        }

        cell.className = \`rounded-xl border \${customSpan} \${
          i === focusedCellId 
            ? "border-orange-500 bg-slate-950" 
            : "border-slate-808/80 bg-[#090b11]"
        } relative group overflow-hidden flex flex-col transition-all\`;
        
        cell.id = \`grid-cell-\${i}\`;
        cell.onclick = () => focusCell(i);

        cell.innerHTML = \`
          <!-- Video Screen container -->
          <div class="flex-1 relative bg-black flex items-center justify-center">
            <video id="cell-player-\${i}" class="w-full h-full object-contain hidden" autoplay controls playsinline preload="auto"></video>
            
            <!-- Empty channel assignment action overlay -->
            <div id="cell-empty-\${i}" class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-slate-900/40 transition-colors">
              <span class="text-xl mb-1.5 text-slate-600">➕</span>
              <h3 class="text-xs font-semibold text-slate-400">Cell \${i + 1}</h3>
              <p class="text-[9px] text-slate-500 mt-0.5 font-mono">Select a stream from side panel</p>
            </div>

            <!-- Custom cell controls HUD -->
            <div class="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button onclick="toggleCellVolume(\${i}, event)" id="cell-vol-\${i}" class="w-6 h-6 rounded bg-black/60 border border-slate-700 hover:border-slate-500 text-[10px] text-white flex items-center justify-center cursor-pointer" title="Pin / Toggle Audio">🔇</button>
              <button onclick="reassignCell(\${i}, event)" class="w-6 h-6 rounded bg-black/60 border border-slate-700 hover:border-slate-500 text-[11px] text-white flex items-center justify-center cursor-pointer" title="Clear stream">❌</button>
            </div>

            <!-- Small bottom overlay info card -->
            <div id="cell-hud-\${i}" class="absolute bottom-2 left-2 right-2 bg-black/85 border border-slate-800/80 px-2.5 py-1 rounded-lg flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity min-w-0 z-20">
              <span id="cell-title-\${i}" class="text-[9px] font-bold truncate text-slate-200 flex-1 mr-2 leading-none">Standby</span>
              <span class="text-[8px] font-bold bg-orange-600/20 text-orange-400 px-1 py-0.5 rounded font-mono uppercase">MONITOR \${i + 1}</span>
            </div>
          </div>
        \`;

        gridContainer.appendChild(cell);

        // Recover previous stream if it was playing and exists
        if(oldStreams[i]) {
          assignChannelToCell(i, oldStreams[i]);
        }
      }

      // Default focus first cell if the previous focused is larger than current active slots
      if (focusedCellId >= cellsCount) {
        focusCell(0);
      } else {
        focusCell(focusedCellId);
      }
    }

    function focusCell(id) {
      // Clean previous highlight
      const prevCell = document.getElementById("grid-cell-" + focusedCellId);
      if(prevCell) prevCell.classList.replace("border-orange-500", "border-slate-808/80");

      focusedCellId = id;
      const targetCell = document.getElementById("grid-cell-" + id);
      if(targetCell) targetCell.classList.replace("border-slate-808/80", "border-orange-500");

      targetCellLabel.textContent = \`Cell \${id + 1}\`;
    }

    function reassignCell(id, event) {
      if(event) event.stopPropagation();

      const player = document.getElementById(\`cell-player-\${id}\`);
      const placeholder = document.getElementById(\`cell-empty-\${id}\`);
      const hudTitle = document.getElementById(\`cell-title-\${id}\`);

      player.pause();
      player.classList.add("hidden");
      placeholder.classList.remove("hidden");
      hudTitle.textContent = "Standby";

      if(activeInstances[id]) {
        if(activeInstances[id].hls) {
          activeInstances[id].hls.destroy();
        }
        delete activeInstances[id];
      }
    }

    function toggleCellVolume(id, event) {
      if(event) event.stopPropagation();
      
      const targetPlayer = document.getElementById(\`cell-player-\${id}\`);
      const btn = document.getElementById(\`cell-vol-\${id}\`);

      // We implement audio Pin mode: pin this stream volume, unmute it, and mute all others in grid!
      const totalCellsCount = currentLayout === 1 ? 1 : currentLayout === 2 ? 2 : currentLayout === 3 ? 3 : 4;
      
      for(let i = 0; i < totalCellsCount; i++) {
        const otherPlayer = document.getElementById(\`cell-player-\${i}\`);
        const otherBtn = document.getElementById(\`cell-vol-\${i}\`);
        if(!otherPlayer) continue;

        if (i === id) {
          // Unmute target
          otherPlayer.muted = !otherPlayer.muted;
          if (otherBtn) otherBtn.textContent = otherPlayer.muted ? "🔇" : "🔊";
        } else {
          // Mute others
          otherPlayer.muted = true;
          if (otherBtn) otherBtn.textContent = "🔇";
        }
      }
    }

    function assignChannelToFocusedCell(item) {
      assignChannelToCell(focusedCellId, item);

      // Auto cycle focus to next empty cell if available
      const cellsCount = currentLayout === 1 ? 1 : currentLayout === 2 ? 2 : currentLayout === 3 ? 3 : 4;
      let nextCellId = (focusedCellId + 1) % cellsCount;
      focusCell(nextCellId);
    }

    function assignChannelToCell(id, item) {
      // Reset cell details
      const player = document.getElementById(\`cell-player-\${id}\`);
      const placeholder = document.getElementById(\`cell-empty-\${id}\`);
      const hudTitle = document.getElementById(\`cell-title-\${id}\`);

      if(!player) return;

      player.classList.remove("hidden");
      placeholder.classList.add("hidden");
      hudTitle.textContent = item.title;

      // Clean existing HLS play link
      if(activeInstances[id] && activeInstances[id].hls) {
        activeInstances[id].hls.destroy();
      }

      let hlsObj = null;

      if(item.url.endsWith(".m3u8") || item.url.includes("m3u8")) {
        if(Hls.isSupported()) {
          const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
          let maxBufferLength = 15; // default safe budget for multi-grid cells
          let maxMaxBufferLength = 30;
          let maxBufferSizeValue = 15 * 1024 * 1024; // 15MB per cell
          let backBufferLen = 15;
          let extraSync = {
            maxBufferHole: 1.5,
            nudgeMaxRetries: 10,
            nudgeOffset: 0.1,
          };

          if (conn) {
            const type = conn.effectiveType || "4g";
            const speed = conn.downlink || 10;
            const isSaveData = conn.saveData || false;

            if (type === "slow-2g" || type === "2g" || speed < 1.5 || isSaveData) {
              maxBufferLength = 4; // micro buffers for high network pressure
              maxMaxBufferLength = 8;
              maxBufferSizeValue = 4 * 1024 * 1024; // 4MB per feed
              backBufferLen = 2; // don't hold past memory
              extraSync = {
                maxBufferHole: 2.2,
                nudgeMaxRetries: 15,
                nudgeOffset: 0.2,
                highBufferWatchdogPeriod: 2,
              };
            } else if (type === "3g" || speed < 4.0) {
              maxBufferLength = 8;
              maxMaxBufferLength = 16;
              maxBufferSizeValue = 8 * 1024 * 1024; // 8MB per feed
              backBufferLen = 10;
              extraSync = {
                maxBufferHole: 1.8,
                nudgeMaxRetries: 12,
                highBufferWatchdogPeriod: 3,
              };
            } else {
              maxBufferLength = 25;
              maxMaxBufferLength = 50;
              maxBufferSizeValue = 30 * 1024 * 1024; // 30MB top-band budget
              backBufferLen = 45;
            }
          }

          hlsObj = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            maxBufferLength: maxBufferLength,
            maxMaxBufferLength: maxMaxBufferLength,
            maxBufferSize: maxBufferSizeValue,
            backBufferLength: backBufferLen,
            ...extraSync
          });
          hlsObj.loadSource(item.url);
          hlsObj.attachMedia(player);
        } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
          player.src = item.url;
        }
      } else {
        player.src = item.url;
      }

      // Default mute all screens on loading to satisfy browser policies
      player.muted = true;
      const btn = document.getElementById(\`cell-vol-\${id}\`);
      if(btn) btn.textContent = "🔇";

      player.play().catch(err => {
        console.log("Awaiting customer interaction on multi-cell playback startup.");
      });

      activeInstances[id] = {
        hls: hlsObj,
        currentStream: item
      };
    }

    init();
  </script>
</body>
</html>`;
}

export function buildPublicIPTVHtml(
  episodes: ExportEpisode[],
  playlistTitle = "Public IPTV - AJN",
): string {
  const playlist = episodes
    .filter((ep) => (ep.url ?? "").trim().length > 0)
    .map((ep, idx) => ({
      id: `ep-${idx}`,
      title: (ep.title ?? `Channel ${idx + 1}`).slice(0, 200),
      url: (ep.url ?? "").trim(),
      group: (ep.groupTitle ?? "General IPTV"),
      logo: (ep.tvgLogo ?? "https://raw.githubusercontent.com/banamine/AJN-Resource-Hub/main/ajn_logo.png"),
    }));

  const safeTitle = playlistTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const playlistJson = JSON.stringify(playlist)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - Retro Cinema Player</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #030406; color: #f1f5f9; }
    .heading { font-family: 'Space Grotesk', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    
    /* CRT Scanlines / Bezel effects */
    .tv-frame { border: 14px solid #141721; border-radius: 28px; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.9); }
    .crt-glow::after { content: " "; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); z-index: 5; background-size: 100% 4px, 6px 100%; pointer-events: none; }
    .tv-static { background: repeating-radial-gradient(circle, #2d3748, #1a202c 5px); opacity: 0.15; animation: noise 0.2s infinite; }
    
    @keyframes noise {
      0% { transform: scale(1); }
      50% { transform: scale(1.02) translate(1px, -1px); }
      100% { transform: scale(0.98) translate(-1px, 1px); }
    }
    
    /* Elegant guide carousel transition scroll */
    ::-webkit-scrollbar { height: 6px; width: 6px; }
    ::-webkit-scrollbar-track { background: #07090e; }
    ::-webkit-scrollbar-thumb { background: #232d42; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #b45309; }
  </style>
</head>
<body class="h-screen flex flex-col justify-between overflow-hidden relative">
  <!-- Top Minimal HUD Header -->
  <header class="bg-[#0c0f17]/45 border-b border-white/5 px-6 py-3.5 flex items-center justify-between shrink-0 z-10 select-none">
    <div class="flex items-center gap-3">
      <span class="text-xs">📺</span>
      <h1 class="heading text-xs font-bold tracking-widest text-[#ff9000] uppercase">${safeTitle} RETRO CABINET</h1>
    </div>
    <div class="text-[10px] text-slate-500 font-mono tracking-wide">KEYS: [ ▲ / ▼ ] CHANNELS • [ SPACE ] PLAY-PAUSE • [ F ] FULLSCREEN</div>
  </header>

  <!-- Interactive Retro Television Area -->
  <main class="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-10">
    <div class="w-full max-w-4xl aspect-video tv-frame relative bg-[#090b11] flex flex-col overflow-hidden group">
      <!-- Direct Video display layout -->
      <div class="flex-1 relative bg-black flex items-center justify-center crt-glow">
        <!-- Static noise overlay background (visible when connecting or idle) -->
        <div id="static-screen" class="absolute inset-0 tv-static z-10 pointer-events-none hidden"></div>
        
        <video 
          id="retro-player" 
          class="w-full h-full object-contain" 
          autoplay 
          controls 
          playsinline 
          preload="auto"
        ></video>

        <!-- Static OSD indicator display overlay -->
        <div id="osd-overlay" class="absolute top-5 left-5 bg-black/85 border border-white/10 px-4 py-2.5 rounded-xl z-20 pointer-events-none opacity-0 transition-opacity duration-300">
          <div class="flex items-center gap-2.5">
            <span class="text-md">⚡</span>
            <div>
              <div id="osd-chan-num" class="text-[10px] text-amber-500 font-bold font-mono">CH-01</div>
              <h3 id="osd-chan-title" class="text-xs font-bold text-white tracking-wide">Connecting...</h3>
              <p id="osd-chan-group" class="text-[8px] text-slate-400 font-mono uppercase mt-0.5 font-semibold">STANDBY</p>
            </div>
          </div>
        </div>

        <!-- TV Bezel Power Indicator Light -->
        <div class="absolute bottom-4 right-4 z-25 flex items-center gap-1.5 bg-black/75 px-3 py-1.5 rounded-full border border-white/15 cursor-pointer hover:bg-black/90 active:scale-95 transition-all select-none" onclick="toggleTvPower()">
          <span id="power-led" class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-400/50"></span>
          <span class="text-[8px] tracking-widest font-mono font-extrabold text-slate-400">POWER</span>
        </div>
      </div>
    </div>
  </main>

  <!-- Bottom Interactive Horizontal Grid Selector Deck -->
  <footer class="bg-[#0c0f17] border-t border-slate-900 px-5 py-4 shrink-0 z-10 selection-none">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="min-w-0 flex-1 flex flex-col gap-1 md:pr-4">
        <div class="text-[9px] uppercase font-bold tracking-widest font-mono text-amber-500">NOW CAPTURE TUNING</div>
        <h2 id="active-playing-title" class="heading text-md font-bold text-white truncate">Select from Dial Stream</h2>
        <p id="active-playing-group" class="text-xs text-slate-500 truncate mt-0.5">Dial vertical list</p>
      </div>

      <!-- Linear Guide list display row -->
      <div class="w-full md:w-[60%] flex gap-2.5 overflow-x-auto pb-1" id="channels-deck">
        <!-- dyn deck buttons loaded here -->
      </div>
    </div>
  </footer>

  <script>
    const playlist = ${playlistJson};
    let currentIdx = null;
    let hlsInstance = null;
    let isTvOn = true;
    let osdTimer = null;

    const player = document.getElementById("retro-player");
    const staticScreen = document.getElementById("static-screen");
    const osdOverlay = document.getElementById("osd-overlay");
    const osdChanNum = document.getElementById("osd-chan-num");
    const osdChanTitle = document.getElementById("osd-chan-title");
    const osdChanGroup = document.getElementById("osd-chan-group");
    const powerLed = document.getElementById("power-led");
    const activePlayingTitle = document.getElementById("active-playing-title");
    const activePlayingGroup = document.getElementById("active-playing-group");
    const channelsDeck = document.getElementById("channels-deck");

    function init() {
      renderDeck();
      
      if(playlist.length > 0) {
        dialChannel(0);
      } else {
        triggerStaticScene(true);
        activePlayingTitle.textContent = "Cabinet empty";
        activePlayingGroup.textContent = "Connect feeds inside building panel before export.";
      }
    }

    function renderDeck() {
      channelsDeck.innerHTML = "";
      playlist.forEach((item, index) => {
        const btn = document.createElement("button");
        btn.id = \`deck-item-\${index}\`;
        btn.className = \`px-4.5 py-2.5 rounded-xl border flex-shrink-0 text-left transition-all cursor-pointer \${
          index === currentIdx 
            ? "border-amber-500/30 bg-amber-600/10 text-amber-400" 
            : "border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-white"
        }\`;
        
        btn.innerHTML = \`
          <div class="text-[9px] font-bold font-mono text-slate-500">CH-\${(index + 1).toString().padStart(2, '0')}</div>
          <div class="text-[11px] font-semibold truncate leading-tight mt-0.5 max-w-[120px]">\${item.title}</div>
        \`;

        btn.onclick = () => dialChannel(index);
        channelsDeck.appendChild(btn);
      });
    }

    function dialChannel(index) {
      if(!isTvOn) return;
      if(index < 0 || index >= playlist.length) return;
      
      currentIdx = index;
      const channel = playlist[index];

      // Reset static noise briefly mimic tuner search
      triggerStaticScene(true);
      setTimeout(() => {
        triggerStaticScene(false);
      }, 350);

      // Deck highlighting styles
      renderDeck();
      
      const currentDeckBtn = document.getElementById(\`deck-item-\${index}\`);
      if(currentDeckBtn) {
        currentDeckBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }

      // Metadata Update
      activePlayingTitle.textContent = channel.title;
      activePlayingGroup.textContent = channel.group;

      // Handle Direct Playback Connections
      if(hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
      }

      if(channel.url.endsWith(".m3u8") || channel.url.includes("m3u8")) {
        if(Hls.isSupported()) {
          const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
          let maxBufferLength = 30;
          let maxMaxBufferLength = 60;
          let maxBufferSizeValue = 50 * 1024 * 1024;
          let backBufferLen = 90;
          let extraSync = {};

          if (conn) {
            const type = conn.effectiveType || "4g";
            const speed = conn.downlink || 10;
            const isSaveData = conn.saveData || false;

            if (type === "slow-2g" || type === "2g" || speed < 1.5 || isSaveData) {
              maxBufferLength = 8;
              maxMaxBufferLength = 16;
              maxBufferSizeValue = 8 * 1024 * 1024;
              backBufferLen = 10;
              extraSync = {
                maxBufferHole: 2.0,
                nudgeMaxRetries: 15,
                nudgeOffset: 0.15,
                highBufferWatchdogPeriod: 2,
              };
            } else if (type === "3g" || speed < 4.0) {
              maxBufferLength = 15;
              maxMaxBufferLength = 30;
              maxBufferSizeValue = 20 * 1024 * 1024;
              backBufferLen = 30;
              extraSync = {
                maxBufferHole: 1.5,
                nudgeMaxRetries: 10,
                highBufferWatchdogPeriod: 3,
              };
            } else {
              maxBufferLength = 40;
              maxMaxBufferLength = 80;
              maxBufferSizeValue = 65 * 1024 * 1024;
              backBufferLen = 120;
              extraSync = {
                maxBufferHole: 0.8,
                nudgeMaxRetries: 5,
              };
            }
          }

          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            maxBufferLength: maxBufferLength,
            maxMaxBufferLength: maxMaxBufferLength,
            maxBufferSize: maxBufferSizeValue,
            backBufferLength: backBufferLen,
            ...extraSync
          });
          hlsInstance.loadSource(channel.url);
          hlsInstance.attachMedia(player);
        } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
          player.src = channel.url;
        } else {
          triggerStaticScene(true);
        }
      } else {
        player.src = channel.url;
      }

      player.play().catch(err => {
        console.log("Cabinet tuner waiting for mouse interaction to trigger audio.");
      });

      // Flash CRT screen OSD
      triggerOsd(index + 1, channel.title, channel.group);
    }

    function triggerOsd(num, title, group) {
      if(osdTimer) clearTimeout(osdTimer);

      osdChanNum.textContent = \`CH-\${num.toString().padStart(2, '0')}\`;
      osdChanTitle.textContent = title;
      osdChanGroup.textContent = group;

      osdOverlay.classList.remove("opacity-0");
      
      osdTimer = setTimeout(() => {
        osdOverlay.classList.add("opacity-0");
      }, 3000);
    }

    function triggerStaticScene(visible) {
      if(visible) {
        staticScreen.classList.remove("hidden");
      } else {
        staticScreen.classList.add("hidden");
      }
    }

    function toggleTvPower() {
      isTvOn = !isTvOn;
      if(isTvOn) {
        powerLed.classList.replace("bg-red-500", "bg-emerald-500");
        powerLed.classList.add("shadow-emerald-400/50");
        powerLed.classList.remove("shadow-red-400/50");
        if(currentIdx !== null) dialChannel(currentIdx);
      } else {
        powerLed.classList.replace("bg-emerald-500", "bg-red-500");
        powerLed.classList.remove("shadow-emerald-400/50");
        powerLed.classList.add("shadow-red-400/50");
        
        player.pause();
        if(hlsInstance) {
          hlsInstance.destroy();
          hlsInstance = null;
        }
        player.src = "";
        triggerStaticScene(true);
        osdOverlay.classList.add("opacity-0");

        activePlayingTitle.textContent = "TELEVISION POWER OFF";
        activePlayingGroup.textContent = "Toggle bezel power switch to return dial focus.";
      }
    }

    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if(!isTvOn) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = currentIdx === null ? 0 : (currentIdx + 1) % playlist.length;
        dialChannel(next);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = currentIdx === null ? 0 : (currentIdx - 1 + playlist.length) % playlist.length;
        dialChannel(prev);
      } else if (e.key === " ") {
        e.preventDefault();
        player.paused ? player.play() : player.pause();
      } else if (e.key === "f" || e.key === "F") {
        if(!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    });

    init();
  </script>
</body>
</html>`;
}

export function triggerClientDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

