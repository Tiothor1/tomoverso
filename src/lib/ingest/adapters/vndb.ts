/**
 * VNDB Adapter — Visual Novel Database (https://vndb.org)
 *
 * API: https://api.vndb.org/kana/vn
 * - Sem autenticação
 * - Rate limit recomendado: 5 req/s
 * - POST com JSON body (filtros + fields + paginação)
 *
 * Schema de filtros (compact, "compact filter"):
 *   ["votecount", ">=", 100]
 *   ["olang", "=", "en"]
 *   ["released", ">=", "2000-01-01"]
 *
 * Fields disponíveis (request):
 *   id, title, alttitle, titles.lang, titles.title, titles.main,
 *   image.url, image.thumbnail, image.sexual, image.violence,
 *   description, released, languages, language, platform, genre,
 *   tags.id, tags.name, tags.rating, tags.spoiler, tags.category,
 *   length, length_minutes, rating, votecount, developers.id,
 *   developers.name, aliases, extlinks
 *
 * VNDB retorna objetos como {id: "v17", title: "Fate/stay night", ...}.
 */

import type {
  ExternalSource,
  ExternalNovel,
  ExternalPage,
} from "../types";
import { HttpClient } from "../http-client";
import { getBucket } from "../rate-limiter";

// ── Tipos da resposta VNDB ─────────────────────────────────────────────

interface VndbVnResponse {
  /** Array de VNs */
  results: Array<{
    id: string; // ex: "v17"
    title: string;
    alttitle?: string | null;
    titles?: Array<{ lang: string; title: string; main: boolean; official: boolean }>;
    image?: {
      url?: string;
      thumbnail?: string;
      sexual?: number;
      violence?: number;
    } | null;
    description?: string;
    released?: string | null; // "YYYY-MM-DD" ou null
    languages?: string[]; // ex: ["en", "ja"]
    olang?: string;      // idioma original (ex: "ja")
    length?: number | null; // 1-5 (VNDB scale)
    length_minutes?: number | null;
    rating?: number; // 0-10
    votecount?: number;
    tags?: Array<{
      id: string;
      name: string;
      rating: number; // 0-3 (relevância)
      spoiler?: number;
      category?: string;
    }>;
    developers?: Array<{ id: string; name: string }>;
    extlinks?: Array<{
      url: string;
      label?: string;
      name?: string;
    }>;
  }>;
  /** Mais resultados disponíveis? */
  more?: boolean;
}

// ── Adapter ────────────────────────────────────────────────────────────

export class VndbAdapter implements ExternalSource {
  readonly name = "vndb";
  readonly displayName = "Visual Novel Database";
  readonly type = "api" as const;
  readonly baseUrl = "https://api.vndb.org/kana";
  readonly rateLimitPerSec = 5;
  readonly userAgent = "Tomoverso-Ingest/1.0 (https://github.com/Tiothor1/tomoverso; ingest@vndb)";

  private client: HttpClient;
  private bucket = getBucket("vndb", this.rateLimitPerSec, this.rateLimitPerSec);

  constructor() {
    this.client = new HttpClient({
      userAgent: this.userAgent,
      timeoutMs: 15_000,
      maxRetries: 3,
      initialBackoffMs: 1000,
      onLog: (msg, meta) => console.log(`[vndb:${msg}]`, meta),
    });
  }

  async listNovels(opts: { cursor?: string; limit?: number } = {}): Promise<ExternalPage<ExternalNovel>> {
    const limit = Math.min(opts.limit ?? 100, 100); // VNDB max 100/page

    // ── Paginação: VNDB kana API aceita `page: N` (número inteiro) ──
    // NOTA: a API NÃO retorna o campo `page` na response, mesmo quando `more: true`.
    //       Precisamos manter o contador internamente.
    // `cursor` aqui é interpretado como o número da próxima página (string).
    const pageNum = opts.cursor ? parseInt(opts.cursor, 10) : 1;

    await this.bucket.acquire();

    const body = {
      filters: ["votecount", ">=", 20], // só VNs com pelo menos 20 votos
      fields: [
        "id", "title", "alttitle", "titles.lang", "titles.title", "titles.main",
        "image.url",
        "description",
        "released", "olang", "length", "rating", "votecount",
        "tags.name", "tags.rating",
        "developers.name",
      ].join(", "),
      sort: "votecount",
      reverse: true,
      results: limit,
      page: pageNum,
    };

    const response = await this.client.post<VndbVnResponse>(`${this.baseUrl}/vn`, body);
    const items = response.data.results.map((vn) => this.mapToExternal(vn));

    return {
      items,
      // Se `more: true`, próxima página = pageNum + 1
      nextCursor: response.data.more ? String(pageNum + 1) : null,
      total: null,
    };
  }

  async getNovel(externalId: string): Promise<ExternalNovel | null> {
    await this.bucket.acquire();
    const body = {
      filters: ["id", "=", externalId],
      fields: [
        "id", "title", "alttitle", "titles.lang", "titles.title", "titles.main",
        "image.url",
        "description",
        "released", "olang", "length", "rating", "votecount",
        "tags.name", "tags.rating",
        "developers.name",
      ].join(", "),
      results: 1,
    };

    const response = await this.client.post<VndbVnResponse>(`${this.baseUrl}/vn`, body);
    if (response.data.results.length === 0) return null;
    return this.mapToExternal(response.data.results[0]);
  }

  // VNDB não expõe capítulos (VNs não têm "capítulos" no sentido LN)
  async listChapters(): Promise<never[]> {
    return [];
  }

  async listVolumes(): Promise<never[]> {
    return [];
  }

  // ── Mapping VNDB → ExternalNovel ────────────────────────────────────

  private mapToExternal(vn: VndbVnResponse["results"][number]): ExternalNovel {
    // Títulos alternativos: pega títulos não-main em outros idiomas
    const alternativeTitles: string[] = [];
    if (vn.alttitle) alternativeTitles.push(vn.alttitle);
    if (vn.titles) {
      for (const t of vn.titles) {
        if (!t.main && t.title && !alternativeTitles.includes(t.title)) {
          alternativeTitles.push(t.title);
        }
      }
    }

    // Tags: separa em genres (alta relevância) e tags (geral)
    const genres: string[] = [];
    const tags: string[] = [];
    if (vn.tags) {
      for (const t of vn.tags) {
        // rating 3 = primary, 2 = major, 1 = minor, 0 = implied
        if (t.rating >= 3 && genres.length < 5) {
          genres.push(t.name);
        } else if (t.rating >= 1 && tags.length < 10) {
          tags.push(t.name);
        }
      }
    }

    // Descrição: VNDB usa BBCode-like [url=...] etc. — limpa básico
    const synopsis = vn.description
      ? this.cleanVndbDescription(vn.description)
      : "";

    // Status: VNDB é um produto finalizado, então se released existe → completed
    // Se não, ongoing (em produção)
    const status: "ongoing" | "completed" | "unknown" =
      vn.released ? "completed" : "ongoing";

    return {
      externalId: vn.id,
      title: vn.title,
      alternativeTitles,
      synopsis,
      coverUrl: vn.image?.url,
      type: "visual-novel",
      status,
      genres,
      tags,
      score: vn.rating,
      chapterCount: null, // VN não tem capítulos
      volumeCount: null,
      releasedAt: vn.released,
      author: vn.developers?.[0]?.name,
      sourceUrl: `https://vndb.org/${vn.id}`,
    };
  }

  private cleanVndbDescription(text: string): string {
    // Remove BBCode básico: [url=...], [/url], [b], [i], etc.
    return text
      .replace(/\[(\w+)(?:=[^\]]*)?\](.*?)\[\/\1\]/gs, "$2")
      .replace(/\[\w+(?:=[^\]]*)?\]/g, "")
      .replace(/\s*\n\s*\n\s*/g, "\n\n")
      .trim()
      .slice(0, 4000);
  }
}
