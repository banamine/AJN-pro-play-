# AJN Professional Player — Enterprise Media Console

A high-performance, single-screen broadcast control deck engineered for seamless live IPTV playback & segmented time-anchored archive streaming. Built on React 18, Vite, and an Express proxy backend, this application integrates resilient automatic HLS buffer orchestration, secure CORS pass-through streaming, category-preserving M3U parsers, and custom multi-format web player export options.

---

## 📡 Core Capabilities

- **Unified Stream Console**: Support for standard and customizable M3U stream indexing. Implements real-time text querying, fuzzy search, stream categorization, and persistent favorite management.
- **Precision Archive Scheduler**: Parses live feed manifest records, partitions broadcast segments by hour, and applies interactive color-coded status badges for instant access.
- **Resilient Playback Engine**: Driven by custom automatic `hls.js` attach pipelines. Features automatic keyframe recovery, proactive garbage collection, blocky/choppy video decoding prevention, and aggressive `.detachMedia()` cleanup to prevent browser memory leaks.
- **Sirius Preamble Synthesizer**: Connects an ambient client-side audio deck directly into the primary player workspace. Features an upgraded premium horizontal, studio rack-mount console with visual disk animation, integrated timeline scrubbing controls, loop selector, volume levels, and a responsive 120-frequency simulated spectrum visualizer supporting multiple distinct style sweeps: EQ, Wave, Fire, and Matrix. Fully compatible with both Light and Dark mode interfaces.
- **Smart Adaptive Themes**: Adapts its layout and visual hierarchy gracefully across Dark (default slate theme) and Light mode options (seamlessly toggled with the header moon/sun controllers).
- **Diagnostic Debug Terminal**: Displays live diagnostic data stream reports tracing live buffer latency, active segment indices, and Express proxy thread states.

---

## 🚀 Advanced Export Suite (New)

The application has been upgraded with a powerful local export interface on the Playlist tab that transforms loaded playlists into standard files or custom self-contained web applications:

1. **⚡ TV Explorer Sleek Dashboard**: Generates a modern high-contrast black grid dashboard featuring lazy-loading stream cards, category division rails, search controls, and dynamic fullscreen players.
2. **🔲 VidGrid Multi-Monitor Matrix Wall**: Compiles selected channels into parallel grid blocks. Ideal for viewing up to 9 live sports, news, or camera feeds simultaneously on a single monitor.
3. **📺 Public Retro IPTV (TV Cabinet Skin)**: Embeds the interactive video player into an aesthetic, analog wood-grain home entertainment television cabinet with animated channel change curtains.
4. **⏱️ EPG Classic Sync Loop**: Outputs a clean, lightweight looping TV display with synchronized wall-clock schedules, next-segment alerts, and smooth CSS slide crossfades.
5. **📜 Multi-Language M3U Serializer**: Integrates automated group-title/source-string parser logic to categorize, tag, and split stream libraries by language indicators (`EN` / `ES` / `RU`).

---

## 🛠️ Architecture and Data Flow

```
+--------------------------------------------------------------+
|                    [ EXTERNAL SOURCES ]                      |
|                  (HLS M3U8, IPTV M3U, XML)                   |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                  [ NODE.JS EXPRESS PROXY ]                   |
|  - Bypasses strict browser CORS restrictions                 |
|  - Tracks AbortSignal to disconnect upstream media feeds     |
|  - Streamlines network backpressure via Web Streams          |
+--------------------------------------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                  [ REFINED CLIENT DECK ]                     |
|  - Dynamic HLS.js Segment Buffer Config (50MB capacity)      |
|  - M3U Group-Title Category & Language Tag Extraction        |
|  - Isolated HeaderClock & PlayerInfoBar ticking intervals    |
+--------------------------------------------------------------+
```

### Key Technical Improvements

- **Category Preservation**: The parser actively parses `group-title="..."` attributes from incoming M3U `#EXTINF` metadata records, allowing video playlists to retain their structure (Movies, Sports, News, etc.) across imports and exports.
- **Memory Lifetime Optimization**: Swapping active channels triggers formal stream destructuring, terminating pending requests and releasing unmanaged system handles.
- **Decoupled Render Cycles**: High-frequency ticking widgets (the system clock and segment playhead) are isolated in dedicated subcomponents, keeping the root application container's redraw overhead minimal.

---

## ⚙️ Configuration & Environment

Ensure you establish a `.env` configuration file inside your deploy container or hosting environment referencing these variables:

```env
# .env.example
PORT=3000
NODE_ENV=production
```

- **Express Server Port**: Hardcoded by infrastructure requirements to port `3000` for hosting routing compatibility.
- **Node Environment**: Configured during initial construction builds to output compressed CJS server bundles to `/dist/server.cjs`.

---

## 📋 Build and Run Guideline

To compile and execute the system in a production or staging container:

```bash
# Install package dependencies
npm install

# Compile the React bundle & Bundle the Express backend
npm run build

# Boot the integrated environment
npm run start
```

---

## ⚠️ Limitations & Best Practices

- **Browser Sandboxing**: Certain interactive media APIs require full browser frame authority. If playback stutters, open the live dashboard directly in a dedicated tab.
- **CORS Restricted Streams**: Direct network loading is subject to browser permissions. Ensure the Express Proxy option is active on custom outer servers when loading restricted video segments.
