/**
 * MangaDex Adapter — https://mangadex.org
 *
 * API: https://api.mangadex.org
 * - Sem autenticação
 * - Rate limit: ~5 req/s (recomendação oficial)
 *
 * Endpoints:
 *   GET /manga?limit=100&offset=0&order[followedCount]=desc
 *   GET /manga/{id}
 *
 * Schema de filtros:
 *   ?includedTags[]=UUID          (ex: Light Novel tag)
 *   ?publicationDemographic[]=shounen
 *   ?originalLanguage[]=ja
 *
 * NOTA: MangaDex é focado em MANGA, mas tem tag "Light Novel" (UUID: ...
 *       vamos descobrir). Pra LN japonesas publicadas em formato digital,
 *       MangaDex é boa fonte.
 */

import type {
  ExternalSource,
  ExternalNovel,
  ExternalPage,
} from "../types";
import { HttpClient } from "../http-client";
import { getBucket } from "../rate-limiter";

// ── Tipos da resposta MangaDex ────────────────────────────────────────

interface MangaDexListResponse {
  result: "ok" | "error";
  response: "collection";
  data: Array<{
    id: string; // UUID
    type: "manga";
    attributes: {
      title: Record<string, string>; // lang code → title
      altTitles: Array<Record<string, string>>;
      description: Record<string, string>;
      originalLanguage: string; // "ja", "en", "ko", etc.
      lastVolume?: string;
      lastChapter?: string;
      publicationDemographic?: "shounen" | "shoujo" | "josei" | "seinen" | null;
      status: "ongoing" | "completed" | "hiatus" | "cancelled";
      year?: number | null;
      contentRating: "safe" | "suggestive" | "erotica" | "pornographic";
      tags: Array<{
        id: string;
        type: "tag";
        attributes: {
          name: Record<string, string>;
          group: "genre" | "theme" | "format" | "content";
        };
      }>;
      state: "draft" | "submitted" | "published";
    };
    relationships: Array<{
      id: string;
      type: "author" | "artist" | "cover_art";
      attributes?: {
        name?: string;
        fileName?: string; // pra cover_art
      };
    }>;
  }>;
  limit: number;
  offset: number;
  total: number;
}

interface MangaDexDetailResponse {
  result: "ok" | "error";
  data: MangaDexListResponse["data"][number];
}

// ── Adapter ────────────────────────────────────────────────────────────

export class MangaDexAdapter implements ExternalSource {
  readonly name = "mangadex";
  readonly displayName = "MangaDex";
  readonly type = "api" as const;
  readonly baseUrl = "https://api.mangadex.org";
  /** MangaDex recomenda 5 req/s */
  readonly rateLimitPerSec = 5;
  readonly userAgent = "Tomoverso-Ingest/1.0 (https://github.com/Tiothor1/tomoverso; ingest@mangadex)";

  private client: HttpClient;
  private bucket = getBucket("mangadex", this.rateLimitPerSec, this.rateLimitPerSec);

  constructor() {
    this.client = new HttpClient({
      userAgent: this.userAgent,
      timeoutMs: 20_000,
      maxRetries: 3,
      initialBackoffMs: 1000,
      onLog: (msg, meta) => console.log(`[mangadex:${msg}]`, meta),
    });
  }

  async listNovels(opts: { cursor?: string; limit?: number } = {}): Promise<ExternalPage<ExternalNovel>> {
    // `cursor` aqui é o offset (número)
    const offset = opts.cursor ? parseInt(opts.cursor, 10) : 0;
    const limit = Math.min(opts.limit ?? 100, 100); // MangaDex max 100

    await this.bucket.acquire();

    // Buscar mangas ordenadas por followedCount desc (popularidade)
    // Filtra pra publicationDemographic válido (ignora hentai etc.)
    const url = new URL(`${this.baseUrl}/manga`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("order[followedCount]", "desc");
    // IMPORTANTE: usar .append() (não .set()) para params multi-valor —
    // .set() substituiria o valor anterior da mesma chave.
    url.searchParams.append("includes[]", "cover_art");
    url.searchParams.append("includes[]", "author");
    url.searchParams.append("contentRating[]", "safe");
    url.searchParams.append("contentRating[]", "suggestive");
    url.searchParams.append("contentRating[]", "erotica");
    // Filtra por idioma original comum (japonês, inglês, chinês, coreano)
    url.searchParams.append("originalLanguage[]", "ja");
    url.searchParams.append("originalLanguage[]", "en");
    url.searchParams.append("originalLanguage[]", "zh");
    url.searchParams.append("originalLanguage[]", "ko");

    const response = await this.client.get<MangaDexListResponse>(url.toString());

    const items = (response.data.data ?? []).map((m) => this.mapToExternal(m));
    const total = response.data.total ?? 0;
    const nextOffset = offset + limit;
    const hasMore = nextOffset < total;

    return {
      items,
      nextCursor: hasMore ? String(nextOffset) : null,
      total,
    };
  }

  async getNovel(externalId: string): Promise<ExternalNovel | null> {
    await this.bucket.acquire();
    try {
      const url = new URL(`${this.baseUrl}/manga/${externalId}`);
      url.searchParams.append("includes[]", "cover_art");
      url.searchParams.append("includes[]", "author");
      const response = await this.client.get<MangaDexDetailResponse>(url.toString());
      return this.mapToExternal(response.data.data);
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

  // ── Mapping MangaDex → ExternalNovel ───────────────────────────────

  private mapToExternal(m: MangaDexListResponse["data"][number]): ExternalNovel {
    // Título: prefere inglês, senão o primeiro disponível
    const title =
      m.attributes.title.en ||
      m.attributes.title["ja-ro"] ||
      m.attributes.title.ja ||
      Object.values(m.attributes.title)[0] ||
      "Untitled";

    // Títulos alternativos: TODOS os altTitles + outras línguas do title
    const alternativeTitles: string[] = [];
    for (const alt of m.attributes.altTitles) {
      const t = Object.values(alt)[0];
      if (t && t !== title && !alternativeTitles.includes(t)) {
        alternativeTitles.push(t);
      }
    }
    for (const [lang, t] of Object.entries(m.attributes.title)) {
      if (t !== title && !alternativeTitles.includes(t)) alternativeTitles.push(t);
    }

    // Sinopse: prefere inglês
    const synopsis =
      m.attributes.description.en ||
      m.attributes.description["ja-ro"] ||
      m.attributes.description.ja ||
      Object.values(m.attributes.description)[0] ||
      "";

    // Tags: separa em genres (group=genre) e tags (group=theme+format)
    const genres: string[] = [];
    const tags: string[] = [];
    for (const t of m.attributes.tags ?? []) {
      const name = t.attributes.name.en ?? Object.values(t.attributes.name)[0];
      if (!name) continue;
      if (t.attributes.group === "genre" && genres.length < 5) genres.push(name);
      else if (tags.length < 10) tags.push(name);
    }

    // Author: pega primeiro author dos relationships
    const author = m.relationships.find((r) => r.type === "author")?.attributes?.name;

    // Cover: pega cover_art relationship
    const coverRel = m.relationships.find((r) => r.type === "cover_art");
    const coverUrl = coverRel?.attributes?.fileName
      ? `https://uploads.mangadex.org/covers/${m.id}/${coverRel.attributes.fileName}`
      : undefined;

    // Status
    const status: "ongoing" | "completed" | "hiatus" | "dropped" | "unknown" =
      m.attributes.status === "ongoing" ? "ongoing" :
      m.attributes.status === "completed" ? "completed" :
      m.attributes.status === "hiatus" ? "hiatus" :
      m.attributes.status === "cancelled" ? "dropped" :
      "unknown";

    // Tipo: MangaDex cobre manga + LN. MangaDex não distingue bem,
    // mas tags com "Light Novel" indicam LN.
    const isLightNovel = (m.attributes.tags ?? []).some((t) => {
      const name = (t.attributes.name.en ?? "").toLowerCase();
      return name.includes("light novel") || name.includes("novel");
    });
    const type: "light-novel" | "web-novel" | "short" =
      isLightNovel ? "light-novel" : "web-novel";
    // NOTA: MangaDex não tem campo nativo pra "web-novel" mas a maioria dos
    //       títulos em originalLanguage=en que não são tagged como LN caem aqui.

    return {
      externalId: m.id,
      title,
      alternativeTitles: alternativeTitles.slice(0, 5),
      synopsis: synopsis.slice(0, 5000),
      coverUrl,
      type,
      status,
      genres,
      tags,
      score: undefined, // MangaDex não tem rating agregado público
      chapterCount: m.attributes.lastChapter ? parseInt(m.attributes.lastChapter, 10) : null,
      volumeCount: m.attributes.lastVolume ? parseInt(m.attributes.lastVolume, 10) : null,
      releasedAt: m.attributes.year ? `${m.attributes.year}-01-01` : null,
      author,
      sourceUrl: `https://mangadex.org/title/${m.id}`,
    };
  }
}
