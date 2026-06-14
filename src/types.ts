/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IPTVChannel {
  name: string;
  logo: string | null;
  url: string;
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
