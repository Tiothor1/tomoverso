/**
 * JIKAN Adapter — MyAnimeList unofficial API (https://jikan.moe)
 *
 * API: https://api.jikan.moe/v4
 * - Sem autenticação
 * - Rate limit: ~2 req/s (mais conservador que VNDB)
 * - Paginação: ?page=N (1-indexed)
 *
 * Pra Light Novels:
 *   GET /manga?type=lightnovel&order_by=score&sort=desc&limit=25
 *   GET /manga/{id}
 *
 * Pra Web Novels (seção "novels" do MAL):
 *   GET /manga?type=novel&order_by=score&sort=desc
 *
 * NOTA: MAL não distingue bem "light novel" vs "novel". O filtro type=lightnovel
 *       retorna LNs publicadas em formato físico/digital. type=novel inclui
 *       web novels. Vamos importar os dois.
 */

import type {
  ExternalSource,
  ExternalNovel,
  ExternalPage,
} from "../types";
import { HttpClient } from "../http-client";
import { getBucket } from "../rate-limiter";

// ── Tipos da resposta JIKAN ───────────────────────────────────────────

interface JikanMangaResponse {
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: { count: number; total: number; per_page: number };
  };
  data: Array<{
    mal_id: number;
    url: string;
    title: string;
    title_english?: string | null;
    title_japanese?: string | null;
    title_synonyms?: string[];
    type?: "Manga" | "Light Novel" | "Novel" | "One-shot" | "Doujinshi" | "Manhwa" | "Manhua" | "OEL";
    chapters?: number | null;
    volumes?: number | null;
    status?: "Finished" | "Publishing" | "On Hiatus" | "Discontinued" | "Not yet published";
    publishing?: boolean;
    published?: { from: string | null; to: string | null; prop: { from: { year: number | null }; to: { year: number | null } } };
    score?: number | null;
    scored_by?: number | null;
    rank?: number | null;
    popularity?: number | null;
    members?: number | null;
    favorites?: number | null;
    synopsis?: string | null;
    background?: string | null;
    authors?: Array<{ mal_id: number; name: string; type: string }>;
    serializations?: Array<{ mal_id: number; name: string; type: string }>;
    genres?: Array<{ mal_id: number; name: string; type: string }>;
    themes?: Array<{ mal_id: number; name: string; type: string }>;
    demographics?: Array<{ mal_id: number; name: string; type: string }>;
    images?: {
      jpg?: { image_url?: string; small_image_url?: string; large_image_url?: string };
      webp?: { image_url?: string; small_image_url?: string; large_image_url?: string };
    };
  }>;
}

// ── Adapter ────────────────────────────────────────────────────────────

export class JikanAdapter implements ExternalSource {
  readonly name = "jikan";
  readonly displayName = "MyAnimeList (via JIKAN)";
  readonly type = "api" as const;
  readonly baseUrl = "https://api.jikan.moe/v4";
  /** JIKAN recomenda ~2 req/s (free tier, sem auth) */
  readonly rateLimitPerSec = 2;
  readonly userAgent = "Tomoverso-Ingest/1.0 (https://github.com/Tiothor1/tomoverso; ingest@jikan)";

  private client: HttpClient;
  private bucket = getBucket("jikan", this.rateLimitPerSec, this.rateLimitPerSec);

  /** Tipo de obra MAL a importar: "lightnovel" | "novel" | "both" */
  private mangaType: "lightnovel" | "novel" | "both";

  constructor(opts: { mangaType?: "lightnovel" | "novel" | "both" } = {}) {
    this.mangaType = opts.mangaType ?? "both";
    this.client = new HttpClient({
      userAgent: this.userAgent,
      timeoutMs: 20_000,
      maxRetries: 3,
      initialBackoffMs: 2000, // 429s são comuns — espera mais
      onLog: (msg, meta) => console.log(`[jikan:${msg}]`, meta),
    });
  }

  async listNovels(opts: { cursor?: string; limit?: number } = {}): Promise<ExternalPage<ExternalNovel>> {
    // `cursor` aqui é a página (1-indexed como string)
    const page = opts.cursor ? parseInt(opts.cursor, 10) : 1;
    const perPage = 25; // JIKAN max é 25 por request
    const items: ExternalNovel[] = [];

    // Pra "both", faz 2 requests (lightnovel + novel). Pra cada tipo, faz 1 página.
    const types: ("lightnovel" | "novel")[] = this.mangaType === "both"
      ? ["lightnovel", "novel"]
      : [this.mangaType];

    for (const type of types) {
      await this.bucket.acquire();
      const response = await this.client.get<JikanMangaResponse>(
        `${this.baseUrl}/manga?type=${type}&order_by=score&sort=desc&limit=${perPage}&page=${page}`
      );
      for (const manga of response.data.data) {
        items.push(this.mapToExternal(manga, type));
      }
    }

    // JIKAN retorna 25 itens por página (assumindo mesma paginação pros dois tipos)
    const hasMore = items.length >= perPage;
    return {
      items,
      nextCursor: hasMore ? String(page + 1) : null,
      total: null,
    };
  }

  async getNovel(externalId: string): Promise<ExternalNovel | null> {
    await this.bucket.acquire();
    try {
      const response = await this.client.get<{ data: JikanMangaResponse["data"][number] }>(
        `${this.baseUrl}/manga/${externalId}/full`
      );
      const manga = response.data.data;
      const inferredType: "lightnovel" | "novel" =
        manga.type === "Light Novel" ? "lightnovel" : "novel";
      return this.mapToExternal(manga, inferredType);
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  }

  // JIKAN não retorna capítulos individuais (só contagem total)
  async listChapters(): Promise<never[]> {
    return [];
  }

  async listVolumes(): Promise<never[]> {
    return [];
  }

  // ── Mapping MAL → ExternalNovel ────────────────────────────────────

  private mapToExternal(manga: JikanMangaResponse["data"][number], type: "lightnovel" | "novel"): ExternalNovel {
    // Títulos alternativos
    const alternativeTitles: string[] = [];
    if (manga.title_english && manga.title_english !== manga.title) alternativeTitles.push(manga.title_english);
    if (manga.title_japanese && manga.title_japanese !== manga.title) alternativeTitles.push(manga.title_japanese);
    if (manga.title_synonyms) {
      for (const syn of manga.title_synonyms) {
        if (syn && syn !== manga.title && !alternativeTitles.includes(syn)) {
          alternativeTitles.push(syn);
        }
      }
    }

    // Gêneros (só os principais, sem demographics/themes)
    const genres = (manga.genres ?? []).slice(0, 5).map((g) => g.name);

    // Tags (themes + demographics)
    const tags: string[] = [];
    for (const t of manga.themes ?? []) tags.push(t.name);
    for (const d of manga.demographics ?? []) tags.push(d.name);

    // Status: mapear MAL → nosso enum
    const status: "ongoing" | "completed" | "hiatus" | "dropped" | "unknown" =
      manga.status === "Finished" ? "completed" :
      manga.status === "Publishing" ? "ongoing" :
      manga.status === "On Hiatus" ? "hiatus" :
      manga.status === "Discontinued" ? "dropped" :
      "unknown";

    // Tipo
    const novelType: "light-novel" | "web-novel" | "short" =
      type === "lightnovel" ? "light-novel" : "web-novel";

    return {
      externalId: String(manga.mal_id),
      title: manga.title,
      alternativeTitles: alternativeTitles.slice(0, 5),
      synopsis: manga.synopsis ?? "",
      coverUrl: manga.images?.jpg?.large_image_url ?? manga.images?.jpg?.image_url,
      type: novelType,
      status,
      genres,
      tags: tags.slice(0, 10),
      score: manga.score ?? undefined,
      chapterCount: manga.chapters ?? null,
      volumeCount: manga.volumes ?? null,
      releasedAt: manga.published?.from ?? null,
      author: manga.authors?.[0]?.name,
      sourceUrl: manga.url,
    };
  }
}
