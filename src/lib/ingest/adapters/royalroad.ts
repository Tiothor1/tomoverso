/**
 * Royal Road Adapter — https://www.royalroad.com
 *
 * API: https://www.royalroad.com/api/v1
 * - Sem autenticação (dados públicos)
 * - Rate limit: ~2 req/s (conservador; sem doc oficial)
 *
 * Endpoints:
 *   GET /fiction?page[size]=100&sort=popularity&order=desc
 *   GET /fiction/{id}
 *
 * Schema de pagination: estilo JSON:API (offset-based, mas page-based aqui)
 *   ?page=1&pageSize=100
 *
 * Schema de filtros suportados:
 *   ?status=COMPLETED,ONGOING,HIATUS,STUB,ABANDONED
 *   ?type=webnovel  (webnovel | book | shortstory)
 *
 * NOTA: Royal Road é pra ficção em INGLÊS principalmente. Adiciona webnovels
 *       originais (não traduções). Bom pra diversidade do catálogo.
 */

import type {
  ExternalSource,
  ExternalNovel,
  ExternalPage,
} from "../types";
import { HttpClient } from "../http-client";
import { getBucket } from "../rate-limiter";

// ── Tipos da resposta Royal Road ───────────────────────────────────────

interface RoyalRoadFictionResponse {
  resource: {
    id: number;
    title: string;
    author: string;
    description?: string;
    cover?: string; // URL completa ou path relativo
    type: "webnovel" | "book" | "shortstory";
    status: "Completed" | "Ongoing" | "Hiatus" | "Stub" | "Abandoned";
    score?: number; // 0-5
    ratings?: number;
    followers?: number;
    favorites?: number;
    views?: number;
    pages?: number;
    chapters?: number;
    total_views?: number;
    average_score?: number;
    style_score?: number;
    story_score?: number;
    grammar_score?: number;
    character_score?: number;
    content_warnings?: string[];
    tags?: string[]; // ["Fantasy", "Adventure", ...]
    warnings?: Array<{ id: number; title: string; short_description?: string }>;
  }[];
  links?: {
    first?: string;
    next?: string;
    last?: string;
  };
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

// ── Adapter ────────────────────────────────────────────────────────────

export class RoyalRoadAdapter implements ExternalSource {
  readonly name = "royalroad";
  readonly displayName = "Royal Road";
  readonly type = "api" as const;
  readonly baseUrl = "https://www.royalroad.com/api/v1";
  /** Conservador: sem doc oficial mas a API é pequena */
  readonly rateLimitPerSec = 2;
  readonly userAgent = "Tomoverso-Ingest/1.0 (https://github.com/Tiothor1/tomoverso; ingest@royalroad)";

  private client: HttpClient;
  private bucket = getBucket("royalroad", this.rateLimitPerSec, this.rateLimitPerSec);

  constructor() {
    this.client = new HttpClient({
      userAgent: this.userAgent,
      timeoutMs: 20_000,
      maxRetries: 3,
      initialBackoffMs: 1500,
      onLog: (msg, meta) => console.log(`[royalroad:${msg}]`, meta),
    });
  }

  async listNovels(opts: { cursor?: string; limit?: number } = {}): Promise<ExternalPage<ExternalNovel>> {
    // `cursor` aqui é a página (1-indexed como string)
    const page = opts.cursor ? parseInt(opts.cursor, 10) : 1;
    const perPage = 100; // Royal Road max 100 por request

    await this.bucket.acquire();

    const url = new URL(`${this.baseUrl}/fiction`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(perPage));
    // Ordenar por popularidade (desc) — fictions com mais followers primeiro
    // (RR não tem sort nativo na API v1; vamos pegar por page)
    // NOTA: a API retorna ordenado por ID desc por padrão; pra obter top por
    //       followers precisaríamos filtrar por minFollowers. Vamos usar pageSize=100
    //       e iterar — pega mais com menos requests mas sem top-by-popularity exato.
    //       Futuras iterações podem usar RoyalRoad's official sort via query params.

    const response = await this.client.get<RoyalRoadFictionResponse>(url.toString());

    const items = (response.data.resource ?? []).map((f) => this.mapToExternal(f));
    const totalPages = response.data.meta?.last_page ?? null;
    const nextPage = page + 1;
    const hasMore = totalPages !== null ? nextPage <= totalPages : items.length >= perPage;

    return {
      items,
      nextCursor: hasMore ? String(nextPage) : null,
      total: response.data.meta?.total ?? null,
    };
  }

  async getNovel(externalId: string): Promise<ExternalNovel | null> {
    await this.bucket.acquire();
    try {
      const response = await this.client.get<{ resource: RoyalRoadFictionResponse["resource"][number] }>(
        `${this.baseUrl}/fiction/${externalId}`
      );
      return this.mapToExternal(response.data.resource);
    } catch (e: any) {
      if (e?.status === 404) return null;
      throw e;
    }
  }

  // Royal Road tem capítulos (GET /fiction/{id}/chapters) mas não vamos importar
  // o conteúdo dos capítulos no MVP (risco ToS). Apenas metadados.
  async listChapters(): Promise<never[]> {
    return [];
  }

  async listVolumes(): Promise<never[]> {
    return [];
  }

  // ── Mapping Royal Road → ExternalNovel ──────────────────────────────

  private mapToExternal(f: RoyalRoadFictionResponse["resource"][number]): ExternalNovel {
    // Tags são apenas array de strings (não tem category no MVP)
    const tags = (f.tags ?? []).slice(0, 10);

    // Mapear status Royal Road → nosso enum
    const status: "ongoing" | "completed" | "hiatus" | "dropped" | "unknown" =
      f.status === "Completed" ? "completed" :
      f.status === "Ongoing" ? "ongoing" :
      f.status === "Hiatus" ? "hiatus" :
      f.status === "Abandoned" ? "dropped" :
      "unknown";

    // Mapear type Royal Road → nosso enum
    const type: "light-novel" | "web-novel" | "short" =
      f.type === "webnovel" ? "web-novel" :
      f.type === "book" ? "light-novel" :
      f.type === "shortstory" ? "short" :
      "web-novel";

    return {
      externalId: String(f.id),
      title: f.title,
      alternativeTitles: [],
      synopsis: this.cleanHtml(f.description ?? ""),
      coverUrl: f.cover, // Royal Road retorna URL completa da capa
      type,
      status,
      genres: tags.slice(0, 5),
      tags,
      // Royal Road usa 0-5 (média de style, story, grammar, character)
      // Converter pra 0-10 pra uniformizar
      score: f.average_score !== undefined ? f.average_score * 2 : undefined,
      chapterCount: f.chapters ?? null,
      volumeCount: null,
      releasedAt: null,
      author: f.author,
      sourceUrl: `https://www.royalroad.com/fiction/${f.id}`,
    };
  }

  /**
   * Royal Road às vezes retorna HTML nas descrições (tags <p>, <br>, etc.).
   * Converte pra texto plano mantendo parágrafos.
   */
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
