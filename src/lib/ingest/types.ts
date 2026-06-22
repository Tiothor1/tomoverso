/**
 * Tipos do sistema de ingestão.
 *
 * Cada adapter (VNDB, JIKAN, AniList, ...) implementa `ExternalSource` e
 * devolve `ExternalNovel` / `ExternalChapter` / `ExternalVolume` normalizados.
 *
 * Esses tipos são a "lingua franca" entre as fontes externas e o banco
 * interno (tabela `novels`, `chapters`, `volumes`).
 */

// ── Tipos de status (mapeados para o enum interno) ────────────────────

export type ExternalStatus =
  | "ongoing"
  | "completed"
  | "hiatus"
  | "dropped"
  | "unknown";

// ── Metadados básicos de uma obra ─────────────────────────────────────

export interface ExternalNovel {
  /** ID externo na fonte (ex: "v17" pra VNDB, "1" pra MAL via JIKAN) */
  externalId: string;
  /** Título principal (geralmente romaji/inglês) */
  title: string;
  /** Títulos alternativos (aliases, japonês, chinês, etc.) */
  alternativeTitles?: string[];
  /** Sinopse em markdown/texto puro (sem HTML) */
  synopsis?: string;
  /** URL da imagem de capa na fonte externa */
  coverUrl?: string;
  /** Tipo da obra */
  type: "light-novel" | "web-novel" | "short" | "visual-novel";
  /** Status */
  status: ExternalStatus;
  /** Gêneros principais */
  genres?: string[];
  /** Tags/temas secundários */
  tags?: string[];
  /** Score externo (ex: VNDB rating, MAL score). 0-10 ou 0-100 conforme fonte. */
  score?: number;
  /** Número de capítulos conhecidos (pode ser null se desconhecido) */
  chapterCount?: number | null;
  /** Número de volumes (LN geralmente tem volumes, VN não) */
  volumeCount?: number | null;
  /** Data de lançamento original (ISO 8601) */
  releasedAt?: string | null;
  /** Nome do autor/equipe */
  author?: string;
  /** URL canônica na fonte externa */
  sourceUrl: string;
}

// ── Capítulo/Versão ───────────────────────────────────────────────────

export interface ExternalChapter {
  externalId: string;
  novelExternalId: string;
  /** Volume ao qual pertence (null se não aplicável, comum em VN) */
  volumeNumber?: number | null;
  chapterNumber: number;
  title: string;
  /** Conteúdo completo em texto puro (opcional — só algumas fontes dão) */
  content?: string;
  wordCount?: number;
  publishedAt?: string;
  sourceUrl?: string;
}

// ── Volume (light novels têm volumes; VNs geralmente não) ─────────────

export interface ExternalVolume {
  externalId: string;
  novelExternalId: string;
  volumeNumber: number;
  title?: string;
  status: "ongoing" | "completed";
  chapterCount?: number;
  sourceUrl?: string;
}

// ── Resposta paginada de listagem ──────────────────────────────────────

export interface ExternalPage<T> {
  items: T[];
  /** Token pra próxima página (null se acabou) */
  nextCursor?: string | null;
  /** Total conhecido (pode ser null se a fonte não dá) */
  total?: number | null;
}

// ── Interface que todo adapter implementa ─────────────────────────────

export interface ExternalSource {
  /** Identificador único da fonte (ex: "vndb", "jikan", "anilist") */
  readonly name: string;
  /** Nome legível pra UI */
  readonly displayName: string;
  /** Tipo de acesso */
  readonly type: "api" | "scrape";
  /** URL base da API (opcional, depende da fonte) */
  readonly baseUrl?: string;
  /** Requisições por segundo permitidas */
  readonly rateLimitPerSec: number;
  /** User-Agent identificável (importante pra ética de scraping) */
  readonly userAgent: string;

  /**
   * Lista obras de uma fonte.
   * @param opts.cursor token de paginação (opcional)
   * @param opts.limit máximo de itens por página (default 50)
   */
  listNovels(opts?: { cursor?: string; limit?: number }): Promise<ExternalPage<ExternalNovel>>;

  /**
   * Busca uma obra específica por ID externo.
   * Retorna null se não existir.
   */
  getNovel(externalId: string): Promise<ExternalNovel | null>;

  /**
   * Lista capítulos de uma obra.
   * Retorna array vazio se a fonte não expõe capítulos (ex: VNDB).
   */
  listChapters?(externalNovelId: string): Promise<ExternalChapter[]>;

  /**
   * Lista volumes de uma obra.
   * Retorna array vazio se a fonte não expõe volumes.
   */
  listVolumes?(externalNovelId: string): Promise<ExternalVolume[]>;
}

// ── Resultado de uma tentativa de importação ──────────────────────────

export type ImportOutcome =
  | "imported" // obra nova criada
  | "updated"  // obra já existia, foi atualizada
  | "skipped"  // já existia e nada mudou
  | "duplicate"// merge com obra existente (dedup)
  | "failed";  // erro; ver sync_errors

export interface ImportResult {
  externalId: string;
  outcome: ImportOutcome;
  /** ID interno da obra após a operação (pode ser null em caso de erro) */
  novelId?: string;
  error?: string;
}
