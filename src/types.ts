/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IPTVChannel {
  name: string;
  logo: string | null;
  url: string;
  group: string;           // Parsed from group-title attribute in M3U #EXTINF line
  tvgId?: string;          // tvg-id
  tvgName?: string;        // tvg-name (canonical name for EPG)
  tvgChno?: string;        // tvg-chno (channel number)
  tvgLanguage?: string;    // tvg-language (ISO 639-1)
  tvgCountry?: string;     // tvg-country (ISO 3166-1 alpha-2)
  tvgGenre?: string;       // tvg-genre
  resolution?: string;     // resolution attribute
  bitrate?: string;        // bitrate (kbps)
  codec?: string;          // codec
  userAgent?: string;      // user-agent / http-user-agent
  referer?: string;        // referer / http-referrer
  auth?: string;           // auth token
  catchup?: string;        // catchup type (flussonic, vod, http)
  catchupDays?: number;    // catchup-days
  duration?: number;       // parsed from #EXTINF duration field: -1 for live, positive integer for VOD seconds
  description?: string;    // description
  status?: string;         // status (online/offline)
  _cyrillicTitle?: boolean; // internal: true if original display name was purely Cyrillic
  _inferredLanguage?: string; // internal: language code set by heuristic, not attribute
}

export interface PlaybackHistoryItem {
  id: string;
  type: "stream" | "archive";
  name: string;
  url: string;
  playedAt: string;
}

export interface ArchiveEpisode {
  id: string;
  title: string;
  videoUrl: string;
  pubDate: string;
  dateKey: string; // YYYY-MM-DD
  show: string;    // 'War Room' | 'Sunday Night Live' | 'Alex Jones Show'
  hour: string;    // 'Hour 1', 'Hour 2', 'Hour 3', 'Full Show'
}

export interface TimeRangeMetadata {
  hex: string;
  rgb: string;
  name: string;
  icon: string;
}

export type ColorScheme = Record<string, TimeRangeMetadata>;
