/**
 * Tipos do sistema de mangá do Tomoverso.
 *
 * MangaCardData: tipo público mostrado na UI
 * External*: tipos do adapter (antes do upsert)
 */

// ── Tipo público (UI) ────────────────────────────────────────────────

export interface MangaCardData {
  id: string;
  slug: string;
  title: string;
  alternative_titles: string[];
  synopsis: string;
  cover_url: string | null;
  cover_local_path: string | null;
  author: string | null;
  artist: string | null;
  status: "ongoing" | "completed" | "hiatus" | "dropped";
  source: string | null;
  source_url: string | null;
  tags: string[];
  chapter_count: number;
}

// ── Adapter-side types ───────────────────────────────────────────────

export interface ExternalMangaData {
  externalId: string;
  title: string;
  alternativeTitles?: string[];
  synopsis?: string;
  coverUrl?: string;
  author?: string;
  artist?: string;
  status: "ongoing" | "completed" | "hiatus" | "dropped" | "unknown";
  genres?: string[];
  tags?: string[];
  sourceUrl: string;
  chapters?: ExternalMangaChapterData[];
}

export interface ExternalMangaChapterData {
  externalId: string;
  chapterNumber: number;
  title: string;
  slug: string;
  sourceUrl: string;
  pages?: ExternalMangaPageData[];
  publishedAt?: string;
}

export interface ExternalMangaPageData {
  imageUrl: string;
  width?: number;
  height?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

export function toMangaCardData(row: {
  id: string;
  slug: string;
  title: string;
  alternative_titles: string;
  synopsis: string;
  cover_url: string | null;
  cover_local_path: string | null;
  author: string | null;
  artist: string | null;
  status: string;
  source: string | null;
  source_url: string | null;
  chapter_count?: number;
}): MangaCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    alternative_titles: safeJsonArray(row.alternative_titles),
    synopsis: row.synopsis,
    cover_url: row.cover_url,
    cover_local_path: row.cover_local_path,
    author: row.author,
    artist: row.artist,
    status: (row.status as MangaCardData["status"]) || "ongoing",
    source: row.source,
    source_url: row.source_url,
    tags: [],
    chapter_count: row.chapter_count ?? 0,
  };
}

function safeJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}