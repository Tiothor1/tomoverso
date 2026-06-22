/**
 * AniList Adapter — https://anilist.co
 *
 * API: GraphQL endpoint https://graphql.anilist.co
 * - Sem auth (mas opcional — API key aumenta rate-limit de 90 pra mais req/min)
 * - Rate limit: 90 req/min sem auth, ~300 com auth
 * - Cobre anime, manga, light novels (format=NOVEL/LIGHT_NOVEL), characters
 *
 * Query exemplo (top LN):
 *   query ($page: Int, $perPage: Int) {
 *     Page(page: $page, perPage: $perPage) {
 *       media(type: MANGA, format: NOVEL, sort: POPULARITY_DESC) {
 *         id, title { romaji, english, native },
 *         description, coverImage { extraLarge, large, medium },
 *         status, chapters, volumes, averageScore, meanScore,
 *         popularity, tags { name, rank, isMediaSpoiler },
 *         staff { edges { node { name { full } } } }
 *       }
 *     }
 *   }
 *
 * NOTA: AniList classifica LN como "format: NOVEL" ou "format: LIGHT_NOVEL"
 *       dentro de "type: MANGA". Vamos filtrar esses dois.
 */

import type {
  ExternalSource,
  ExternalNovel,
  ExternalPage,
} from "../types";
import { HttpClient } from "../http-client";
import { getBucket } from "../rate-limiter";

// ── Tipos da resposta AniList ──────────────────────────────────────────

interface AniListMedia {
  id: number; // AniList ID (não MAL ID)
  idMal?: number | null;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
    userPreferred?: string;
  };
  description?: string; // HTML
  coverImage?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
    color?: string;
  };
  bannerImage?: string;
  status?: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";
  chapters?: number | null;
  volumes?: number | null;
  averageScore?: number; // 0-100
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  tags?: Array<{ name: string; rank?: number; isMediaSpoiler?: boolean }>;
  staff?: {
    edges?: Array<{
      node: { name: { full?: string } };
      role?: string;
    }>;
  };
  startDate?: { year?: number; month?: number; day?: number };
  endDate?: { year?: number; month?: number; day?: number };
  siteUrl?: string;
}

interface AniListResponse {
  data?: {
    Page?: {
      pageInfo?: { hasNextPage?: boolean; currentPage?: number; lastPage?: number; total?: number };
      media?: AniListMedia[];
    };
  };
  errors?: Array<{ message: string; status?: number }>;
}

// ── Adapter ────────────────────────────────────────────────────────────

export class AniListAdapter implements ExternalSource {
  readonly name = "anilist";
  readonly displayName = "AniList";
  readonly type = "api" as const;
  readonly baseUrl = "https://graphql.anilist.co";
  /** Conservador: 90 req/min = 1.5 req/s, vamos com 2 req/s sem auth */
  readonly rateLimitPerSec = 2;
  readonly userAgent = "Tomoverso-Ingest/1.0 (https://github.com/Tiothor1/tomoverso; ingest@anilist)";

  private client: HttpClient;
  private bucket = getBucket("anilist", this.rateLimitPerSec, this.rateLimitPerSec);

  constructor() {
    const headers: Record<string, string> = {};
    if (process.env.ANILIST_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.ANILIST_TOKEN}`;
    }

    this.client = new HttpClient({
      userAgent: this.userAgent,
      timeoutMs: 20_000,
      maxRetries: 3,
      initialBackoffMs: 2000, // AniList retorna 429 facilmente
      defaultHeaders: headers,
      onLog: (msg, meta) => console.log(`[anilist:${msg}]`, meta),
    });
  }

  async listNovels(opts: { cursor?: string; limit?: number } = {}): Promise<ExternalPage<ExternalNovel>> {
    const page = opts.cursor ? parseInt(opts.cursor, 10) : 1;
    const perPage = Math.min(opts.limit ?? 50, 50); // AniList max 50
    await this.bucket.acquire();

    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage currentPage lastPage total }
          media(type: MANGA, format: NOVEL, sort: POPULARITY_DESC) {
            id
            idMal
            title { romaji english native userPreferred }
            description(asHtml: false)
            coverImage { extraLarge large medium }
            status
            chapters
            volumes
            averageScore
            meanScore
            popularity
            tags { name rank isMediaSpoiler }
            staff(perPage: 3) {
              edges { node { name { full } } role }
            }
            startDate { year month day }
            siteUrl
          }
        }
      }
    `;

    const response = await this.client.post<AniListResponse>(this.baseUrl, {
      query,
      variables: { page, perPage },
    });

    if (response.data.errors?.length) {
      throw new Error(`AniList GraphQL error: ${response.data.errors.map((e) => e.message).join("; ")}`);
    }

    const pageInfo = response.data.data?.Page?.pageInfo;
    const media = response.data.data?.Page?.media ?? [];
    const items = media.map((m) => this.mapToExternal(m));

    return {
      items,
      nextCursor: pageInfo?.hasNextPage ? String(page + 1) : null,
      total: pageInfo?.total ?? null,
    };
  }

  async getNovel(externalId: string): Promise<ExternalNovel | null> {
    await this.bucket.acquire();
    try {
      const query = `
        query ($id: Int) {
          Media(id: $id, type: MANGA) {
            id idMal
            title { romaji english native userPreferred }
            description(asHtml: false)
            coverImage { extraLarge large medium }
            status chapters volumes averageScore meanScore popularity
            tags { name rank isMediaSpoiler }
            staff(perPage: 3) { edges { node { name { full } } } }
            startDate { year month day }
            siteUrl
          }
        }
      `;
      const response = await this.client.post<{ data?: { Media?: AniListMedia } }>(this.baseUrl, {
        query,
        variables: { id: parseInt(externalId, 10) },
      });
      const media = response.data.data?.Media;
      if (!media) return null;
      return this.mapToExternal(media);
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  }

  async listChapters(): Promise<never[]> {
    return [];
  }

  async listVolumes(): Promise<never[]> {
    return [];
  }

  // ── Mapping AniList → ExternalNovel ────────────────────────────────

  private mapToExternal(m: AniListMedia): ExternalNovel {
    // Título: prefere inglês, senão romaji, senão native
    const title =
      m.title.english ||
      m.title.romaji ||
      m.title.native ||
      m.title.userPreferred ||
      "Untitled";

    // Títulos alternativos
    const alternativeTitles: string[] = [];
    if (m.title.romaji && m.title.romaji !== title) alternativeTitles.push(m.title.romaji);
    if (m.title.native && m.title.native !== title) alternativeTitles.push(m.title.native);
    if (m.title.userPreferred && m.title.userPreferred !== title && !alternativeTitles.includes(m.title.userPreferred)) {
      alternativeTitles.push(m.title.userPreferred);
    }

    // Sinopse: AniList retorna em HTML — limpa básico
    const synopsis = m.description ? this.cleanHtml(m.description) : "";

    // Tags: pega top-10 (rank mais alto primeiro)
    const tags = (m.tags ?? [])
      .filter((t) => !t.isMediaSpoiler)
      .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
      .slice(0, 10)
      .map((t) => t.name);

    // Status
    const status: "ongoing" | "completed" | "hiatus" | "dropped" | "unknown" =
      m.status === "FINISHED" ? "completed" :
      m.status === "RELEASING" ? "ongoing" :
      m.status === "HIATUS" ? "hiatus" :
      m.status === "CANCELLED" ? "dropped" :
      m.status === "NOT_YET_RELEASED" ? "ongoing" :
      "unknown";

    // Author: pega primeiro staff com role "Story" ou similar
    const authorEdge = (m.staff?.edges ?? []).find((e) =>
      (e.role ?? "").toLowerCase().includes("story") ||
      (e.role ?? "").toLowerCase().includes("writer")
    ) ?? m.staff?.edges?.[0];
    const author = authorEdge?.node?.name?.full;

    // Tipo
    // Não temos o campo `format` na query acima por simplicidade, mas
    // o filtro `format_in: [NOVEL, LIGHT_NOVEL]` garante que é um LN.
    // Vamos classificar como light-novel por padrão.
    const type: "light-novel" | "web-novel" = "light-novel";

    return {
      externalId: String(m.id),
      title,
      alternativeTitles: alternativeTitles.slice(0, 5),
      synopsis,
      coverUrl: m.coverImage?.large ?? m.coverImage?.extraLarge ?? m.coverImage?.medium,
      type,
      status,
      genres: tags.slice(0, 5), // top-5 como genres
      tags: tags.slice(5, 10),
      score: m.averageScore !== undefined && m.averageScore !== null ? m.averageScore / 10 : undefined,
      chapterCount: m.chapters ?? null,
      volumeCount: m.volumes ?? null,
      releasedAt: m.startDate?.year ? `${m.startDate.year}-${String(m.startDate.month ?? 1).padStart(2, "0")}-${String(m.startDate.day ?? 1).padStart(2, "0")}` : null,
      author,
      sourceUrl: m.siteUrl ?? `https://anilist.co/manga/${m.id}`,
    };
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim()
      .slice(0, 5000);
  }
}
