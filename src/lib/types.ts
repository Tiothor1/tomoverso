// ===== Tipos do Tomoverso =====

export type NovelStatus = "ongoing" | "completed" | "hiatus" | "dropped";
export type NovelType = "light-novel" | "web-novel" | "short";

export interface Author {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

export interface Novel {
  id: string;
  slug: string;
  title: string;
  alternative_titles?: string[];
  synopsis: string;
  cover_url: string;
  author_id: string;
  author?: Author;
  type: NovelType;
  status: NovelStatus;
  genres: string[];
  tags: string[];
  views: number;
  rating_avg: number;
  rating_count: number;
  chapter_count: number;
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  views: number;
  published_at: string;
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
  user?: Author;
  rating: number; // 1-5
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
