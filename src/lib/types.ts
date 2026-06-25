// Tipos do Tomoverso (frontend)

export type NovelStatus = "ongoing" | "completed" | "hiatus" | "dropped";
export type NovelType = "light-novel" | "web-novel" | "short" | "visual-novel";

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  role?: "user" | "admin" | "author";
  created_at: string;
}

export interface Novel {
  id: string;
  slug: string;
  title: string;
  title_en?: string | null;
  title_jp?: string | null;
  alternative_titles?: string[];
  synopsis: string;
  cover_url: string;
  cover_source_url?: string | null;
  cover_local_path?: string | null;
  author_id: string;
  author?: User;
  source?: string | null;
  source_id?: string | null;
  source_url?: string | null;
  type: NovelType;
  status: NovelStatus;
  genres: string[];
  tags: string[];
  views: number;
  rating_avg: number;
  rating_count: number;
  chapter_count: number;
  external_score?: number | null;
  is_featured: boolean;
  is_approved: boolean;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  novel_id: string;
  volume_id?: string | null;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  views: number;
  source_url?: string | null;
  published_at: string;
}

export interface Volume {
  id: string;
  novel_id: string;
  volume_number: number;
  title?: string | null;
  status: "ongoing" | "completed";
  chapter_count: number;
  source_url?: string | null;
  last_synced_at?: string | null;
}

export interface Source {
  id: string;
  name: string;
  display_name: string;
  type: "api" | "scrape";
  base_url?: string | null;
  rate_limit_per_sec: number;
  enabled: boolean;
  last_run_at?: string | null;
  last_run_status?: string | null;
}

export interface SourceLink {
  id: string;
  novel_id: string;
  source_id: string;
  external_id: string;
  external_url?: string | null;
  match_confidence: number;
  last_synced_at?: string | null;
}

export interface SyncRun {
  id: string;
  source_id?: string | null;
  source_name: string;
  mode: "initial" | "weekly" | "daily" | "manual";
  status: "running" | "success" | "partial" | "failed";
  started_at: string;
  finished_at?: string | null;
  duration_ms?: number | null;
  items_found: number;
  items_imported: number;
  items_updated: number;
  items_skipped: number;
  items_failed: number;
  metadata?: string;
}

export interface SyncError {
  id: string;
  run_id: string;
  external_id?: string | null;
  error_type?: string | null;
  error_message: string;
  stack_trace?: string | null;
  context?: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  category: "genre" | "tag";
  count: number;
}

export interface Review {
  id: string;
  novel_id: string;
  user_id: string;
  user?: User;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Favorite {
  user_id: string;
  novel_id: string;
  created_at: string;
}

export type ColorTheme = "purple" | "blue" | "sepia";
export type Mode = "dark" | "light";
