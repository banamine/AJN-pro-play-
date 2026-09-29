import express from "express";
import path from "path";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  app.set("trust proxy", 1);
  app.use(express.json());

  // API Route 1: Parse and serve AJN RSS video archive with zero CORS issues
  app.get("/api/ajn-archive", async (req, res) => {
    try {
      const RSS_URL = "https://rss.alexjones.media/AJNHourlyVideo.xml";
      console.log(`[Proxy] Fetching AJN RSS feed from: ${RSS_URL}`);

      const response = await fetch(RSS_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch RSS. Status: ${response.status}`);
      }

      const xmlText = await response.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      const episodes = [];

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
        if (hourMatch) hour = `Hour ${hourMatch[1]}`;

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

      console.log(`[Proxy] Successfully parsed ${episodes.length} episodes from AJN RSS`);
      res.json({ success: true, count: episodes.length, episodes });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[Proxy Error] Failed to process AJN Archive feed:", message);
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get("/api/stream-proxy", async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: "Missing required query parameter: url" });
    }

    const abortController = new AbortController();
    req.on("close", () => {
      console.log("[Stream Proxy] Client closed request. Aborting upstream connection.");
      abortController.abort();
    });

    try {
      const decodedUrl = decodeURIComponent(rawUrl);
      console.log(`[Stream Proxy] Fetching stream: ${decodedUrl}`);

      const response = await fetch(decodedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        },
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch remote stream. Status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache");

      if (response.body) {
        Readable.fromWeb(response.body as any).pipe(res);
      } else {
        res.status(500).send("No stream body found");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("[Stream Proxy] Connection aborted successfully.");
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Stream Proxy Error] Failed for ${rawUrl}:`, message);
      if (!res.headersSent) {
        res.status(502).json({ error: "Stream proxy error", details: message });
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Booting in DEVELOPMENT mode with Vite Middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Booting in PRODUCTION mode serving /dist");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] AJN IPTV Player server listening at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("[Server] Fatal startup error:", error);
  process.exitCode = 1;
});
