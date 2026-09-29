import type { RumbleVideoMetadata } from "../types/rumble";
const MAX_BYTES = 1_000_000;
const MAX_ITEMS = 50;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
export interface RumbleRssGatewayDependencies { fetch?: typeof fetch; }
export type RumbleRssResult = { ok: true; feedUrl: string; videos: RumbleVideoMetadata[] } | { ok: false; status: number; error: string };
function validFeedUrl(raw: string): URL | null { try { const url = new URL(raw); if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "rumble.com") return null; if (!/^\/c\/[^/]+\/feed\/?$/i.test(url.pathname) || url.username || url.password) return null; return url; } catch { return null; } }
function decodeXml(value: string): string { return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, String.fromCharCode(34)).replace(/&apos;/g, String.fromCharCode(39)).replace(/&amp;/g, "&").trim(); }
function textOf(item: string, tag: string): string { const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const match = item.match(new RegExp("<" + escaped + "\\b[^>]*>([\\s\\S]*?)</" + escaped + "\\s*>", "i")); return match ? decodeXml(match[1]) : ""; }
function attrOf(item: string, tag: string, attribute: string): string {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = item.match(
    new RegExp(
      `<${escapedTag}\\b[^>]*\\b${escapedAttribute}\\s*=\\s*[\"']([^\"']*)[\"']`,
      "i",
    ),
  );

  return match ? decodeXml(match[1]) : "";
}
function parseItem(item: string): RumbleVideoMetadata | null { const title = textOf(item, "title"); const link = textOf(item, "link") || textOf(item, "guid"); const published = textOf(item, "pubDate") || textOf(item, "published") || textOf(item, "dc:date"); if (!title || !link || !published) return null; let url: URL; try { url = new URL(link); } catch { return null; } if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "rumble.com") return null; const date = new Date(published); if (!Number.isFinite(date.getTime())) return null; const id = url.pathname.match(/\/(?:v|embed\/v)([a-z0-9]+)(?:[-/?]|$)/i)?.[1] ?? ""; if (!id) return null; const thumbnail = attrOf(item, "media:thumbnail", "url") || attrOf(item, "media:content", "url"); let safeThumbnail = ""; try { const t = new URL(thumbnail); if (t.protocol === "https:" && t.hostname.toLowerCase() === "rumble.com") safeThumbnail = t.toString(); } catch {} return { videoId: id, title, embedUrl: url.toString(), publishDate: date.toISOString(), isLive: /\blive\b/i.test(title), thumbnailUrl: safeThumbnail }; }
export function parseRumbleRss(xml: string): RumbleVideoMetadata[] { if (new TextEncoder().encode(xml).byteLength > MAX_BYTES || /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml)) return []; if (!/<rss\b[^>]*>[\s\S]*<\/rss>/i.test(xml)) return []; return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)].slice(0, MAX_ITEMS).map((match) => parseItem(match[1])).filter((item): item is RumbleVideoMetadata => item !== null); }
async function readBounded(response: Response): Promise<string> { const length = response.headers.get("content-length"); if (length && Number(length) > MAX_BYTES) throw new Error("RSS response exceeds maximum size"); const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength > MAX_BYTES) throw new Error("RSS response exceeds maximum size"); return new TextDecoder().decode(bytes); }
export async function fetchRumbleRss(rawFeedUrl: string, dependencies: RumbleRssGatewayDependencies = {}): Promise<RumbleRssResult> { const initial = validFeedUrl(rawFeedUrl); if (!initial) return { ok: false, status: 400, error: "Invalid Rumble RSS feed URL" }; const fetchImpl = dependencies.fetch ?? fetch; let current = initial; try { for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TIMEOUT_MS); try { const response = await fetchImpl(current, { method: "GET", redirect: "manual", headers: { Accept: "application/rss+xml, application/xml, text/xml;q=0.9", "User-Agent": "AJN-Rumble-RSS-Gateway/1.0" }, signal: controller.signal }); if (response.status >= 300 && response.status < 400) { const location = response.headers.get("location"); if (!location || redirect === MAX_REDIRECTS) return { ok: false, status: 502, error: "Rumble RSS redirect limit exceeded" }; const next = validFeedUrl(new URL(location, current).toString()); if (!next) return { ok: false, status: 502, error: "Rumble RSS redirect rejected" }; current = next; continue; } if (!response.ok) return { ok: false, status: response.status, error: "Rumble RSS request failed: HTTP " + response.status }; const videos = parseRumbleRss(await readBounded(response)); if (!videos.length) return { ok: false, status: 502, error: "Rumble RSS feed contained no valid video items" }; return { ok: true, feedUrl: current.toString(), videos }; } finally { clearTimeout(timer); } } } catch (error) { return { ok: false, status: 502, error: error instanceof Error ? error.message : String(error) }; } return { ok: false, status: 502, error: "Rumble RSS redirect limit exceeded" }; }
export { MAX_BYTES, MAX_ITEMS };