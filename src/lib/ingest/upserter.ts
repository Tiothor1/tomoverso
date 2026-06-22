/**
 * Upserter — converte ExternalNovel em uma novels row interna.
 *
 * Cada adapter usa `upsertNovel()` para criar ou atualizar uma obra.
 * O mapeamento fonte↔obra fica na tabela `source_links`, permitindo
 * deduplicação (mesma obra em VNDB + JIKAN, por exemplo).
 *
 * Estratégia:
 * 1. Procura em `source_links` por (source_id, external_id) → mapeamento direto
 * 2. Se não achar, procura em `novels` por (source, source_id) → idempotência
 * 3. Se ainda não achar, verifica duplicata por título normalizado (dedup heurístico)
 * 4. Cria nova row em `novels` + `source_links`
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { ExternalNovel, ImportOutcome } from "./types";

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Retorna o ID do primeiro admin do DB, usado como author_id placeholder
 * para obras importadas (já que elas não têm um "autor" interno — o original
 * é da fonte externa).
 */
function getSystemAuthorId(): string {
  const db = getDb();
  const admin = db.prepare(
    `SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`
  ).get() as { id: string } | undefined;

  if (!admin) {
    throw new Error(
      "Nenhum admin encontrado no DB. Rode a seed ou crie um admin antes de importar."
    );
  }
  return admin.id;
}

export interface UpsertResult {
  outcome: ImportOutcome;
  novelId: string;
  /** Título interno (já normalizado) */
  title: string;
  /** Se foi detectada duplicata com outra obra existente */
  mergedWith?: string;
}

interface UpsertOptions {
  /** ID da source na tabela sources (UUID) */
  sourceId: string;
  /** Nome curto da source (ex: "vndb", "jikan") — usado em novels.source */
  sourceName: string;
  /** Força atualização mesmo se nada mudou */
  force?: boolean;
}

/**
 * Faz upsert de uma obra externa. Retorna o resultado + ID interno.
 */
export function upsertNovel(external: ExternalNovel, opts: UpsertOptions): UpsertResult {
  const db = getDb();

  // ── PASSO 1: Procura em source_links ─────────────────────────────
  const link = db.prepare(`
    SELECT novel_id FROM source_links
    WHERE source_id = ? AND external_id = ?
  `).get(opts.sourceId, external.externalId) as { novel_id: string } | undefined;

  if (link) {
    // Já mapeado — atualiza a obra
    updateNovelFromExternal(link.novel_id, external, opts.sourceName);
    return {
      outcome: "updated",
      novelId: link.novel_id,
      title: external.title,
    };
  }

  // ── PASSO 2: Procura em novels por (source, source_id) ──────────
  // (defesa em profundidade — pode acontecer se source_links falhou)
  const existing = db.prepare(`
    SELECT id FROM novels
    WHERE source = ? AND source_id = ?
  `).get(opts.sourceName, external.externalId) as { id: string } | undefined;

  if (existing) {
    // Cria o source_link retroativo
    db.prepare(`
      INSERT INTO source_links (id, novel_id, source_id, external_id, external_url, match_confidence, last_synced_at)
      VALUES (?, ?, ?, ?, ?, 1.0, datetime('now'))
    `).run(
      randomUUID(),
      existing.id,
      opts.sourceId,
      external.externalId,
      external.sourceUrl
    );
    updateNovelFromExternal(existing.id, external, opts.sourceName);
    return {
      outcome: "updated",
      novelId: existing.id,
      title: external.title,
    };
  }

  // ── PASSO 3: Detecta duplicata por título normalizado ───────────
  const normalizedTitle = normalizeTitle(external.title);
  const candidate = findDuplicateByTitle(normalizedTitle);

  if (candidate) {
    // Mescla: usa o novel existente, adiciona source_link
    db.prepare(`
      INSERT INTO source_links (id, novel_id, source_id, external_id, external_url, match_confidence, last_synced_at)
      VALUES (?, ?, ?, ?, ?, 0.85, datetime('now'))
    `).run(
      randomUUID(),
      candidate.id,
      opts.sourceId,
      external.externalId,
      external.sourceUrl
    );

    // Atualiza metadados se a versão externa for mais completa
    if (!candidate.synopsis && external.synopsis) {
      updateNovelFromExternal(candidate.id, external, opts.sourceName);
    }

    return {
      outcome: "duplicate",
      novelId: candidate.id,
      title: candidate.title,
      mergedWith: candidate.id,
    };
  }

  // ── PASSO 4: Cria nova row ───────────────────────────────────────
  const newId = randomUUID();
  const slug = generateUniqueSlug(external.title);
  const systemAuthor = getSystemAuthorId();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO novels (
        id, slug, title, alternative_titles, synopsis,
        cover_url, cover_source_url, cover_local_path,
        author_id, source, source_id, source_url,
        type, status, genres, tags,
        external_score, is_featured, is_approved,
        last_synced_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, datetime('now'), datetime('now'), datetime('now'))
    `).run(
      newId,
      slug,
      external.title,
      JSON.stringify(external.alternativeTitles ?? []),
      (external.synopsis ?? "").slice(0, 5000),
      external.coverUrl ?? null,
      external.coverUrl ?? null, // cover_source_url = external URL
      systemAuthor,
      opts.sourceName,
      external.externalId,
      external.sourceUrl,
      external.type,
      external.status === "unknown" ? "ongoing" : external.status,
      JSON.stringify(external.genres ?? []),
      JSON.stringify(external.tags ?? []),
      external.score ?? null
    );
  } catch (e: any) {
    throw new Error(`upsertNovel failed for "${external.title}": ${e.message}`);
  }

  // Cria o source_link
  db.prepare(`
    INSERT INTO source_links (id, novel_id, source_id, external_id, external_url, match_confidence, last_synced_at)
    VALUES (?, ?, ?, ?, ?, 1.0, datetime('now'))
  `).run(
    randomUUID(),
    newId,
    opts.sourceId,
    external.externalId,
    external.sourceUrl
  );

  return {
    outcome: "imported",
    novelId: newId,
    title: external.title,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

function updateNovelFromExternal(novelId: string, external: ExternalNovel, sourceName: string): void {
  const db = getDb();
  // Atualiza apenas campos que vieram preenchidos (não sobrescreve com null)
  db.prepare(`
    UPDATE novels SET
      synopsis = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE synopsis END,
      cover_url = COALESCE(?, cover_url),
      cover_source_url = COALESCE(?, cover_source_url),
      source_url = COALESCE(?, source_url),
      external_score = COALESCE(?, external_score),
      last_synced_at = datetime('now'),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    external.synopsis, external.synopsis, external.synopsis,
    external.coverUrl, external.coverUrl,
    external.sourceUrl,
    external.score,
    novelId
  );
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 100);
}

function findDuplicateByTitle(normalized: string): { id: string; title: string; synopsis: string | null } | null {
  if (!normalized || normalized.length < 5) return null;
  const db = getDb();

  // Busca por título exato normalizado (match perfeito no alternative_titles também)
  const rows = db.prepare(`
    SELECT id, title, synopsis FROM novels
  `).all() as Array<{ id: string; title: string; synopsis: string | null }>;

  for (const row of rows) {
    if (normalizeTitle(row.title) === normalized) return row;

    // Checa alternative_titles
    try {
      const alts = JSON.parse(
        (db.prepare(`SELECT alternative_titles FROM novels WHERE id = ?`).get(row.id) as any).alternative_titles ?? "[]"
      ) as string[];
      for (const alt of alts) {
        if (normalizeTitle(alt) === normalized) return row;
      }
    } catch {
      // ignore parse errors
    }
  }

  return null;
}

function generateUniqueSlug(title: string): string {
  const db = getDb();
  const base = slugify(title) || "untitled";

  let slug = base;
  let n = 1;
  while (db.prepare("SELECT 1 FROM novels WHERE slug = ?").get(slug)) {
    n++;
    slug = `${base}-${n}`;
  }
  return slug;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}
