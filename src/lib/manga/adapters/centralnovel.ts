/**
 * CentralNovel.com Adapter (NOVELS em PT-BR — não é mangá)
 *
 * Site: https://centralnovel.com (WordPress)
 *
 * Estrutura:
 *   - Série:  /series/{slug}/
 *   - Capítulo: /{slug}-volume-{V}-capitulo-{N}/  ou  /{slug}-capitulo-{N}/
 *
 * Diferente do mangaonline.blue, centralnovel hospeda LIGHT NOVELS traduzidas.
 * Capítulos são TEXTO (não imagens) — vão pra tabela `novels` + `chapters`,
 * não `mangas`.
 *
 * ESTE ADAPTER ESCREVE EM `novels`/`chapters`, aproveitando o sistema existente.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

const BASE = "https://centralnovel.com";
const SOURCE_NAME = "centralnovel";

// ── HTTP ──────────────────────────────────────────────────────────────

async function fetchHtml(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!r.ok) {
        if (r.status === 503 || r.status === 429) {
          // Aguardar mais antes de tentar de novo
          const wait = 5000 * attempt;
          await new Promise((res) => setTimeout(res, wait));
          continue;
        }
        throw new Error(`HTTP ${r.status}: ${url}`);
      }
      return await r.text();
    } catch (e: any) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error("unreachable after retries");
}

// ── Parser ────────────────────────────────────────────────────────────

export interface ParsedNovelDetail {
  title: string;
  coverUrl: string | null;
  synopsis: string;
  author: string | null;
  artist: string | null;
  status: "ongoing" | "completed" | "hiatus" | "dropped" | "unknown";
  chapters: Array<{ number: number; title: string; slug: string; sourceUrl: string; volume?: number }>;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

function parseSeriesDetail(html: string, slug: string): ParsedNovelDetail {
  const h1 = html.match(/<h1[^>]*class="entry-title"[^>]*>([^<]+)<\/h1>/);
  const title = h1 ? decodeEntities(h1[1].trim()) : slug;

  // Cover: primeira imagem com a slug no nome OU class "attachment-*"
  let coverUrl: string | null = null;
  const coverM = html.match(/<img[^>]*src="([^"]*\/(?:covers?|cover|series)[^"]*\.(?:jpg|jpeg|png|webp))"/i);
  if (coverM) coverUrl = coverM[1];

  // Sinopse: og:description ou texto dentro de div com "Sinopse"
  let synopsis = "";
  const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/);
  if (ogDesc) {
    synopsis = decodeEntities(ogDesc[1].trim());
    // Remove prefixo "Sinopse: " se houver
    synopsis = synopsis.replace(/^Sinopse:\s*/i, "");
  }
  if (!synopsis) {
    // Fallback: meta description
    const metaDesc = html.match(/<meta name="description" content="([^"]+)"/);
    if (metaDesc) synopsis = decodeEntities(metaDesc[1].trim());
  }

  // Chapters: links /{slug}-volume-{V}-capitulo-{N}/ ou /{slug}-capitulo-{N}/
  const chapterRegex = new RegExp(
    `<a[^>]*href="https?://centralnovel\\.com/${escapeRegex(slug)}-?(volume-(\\d+)-)?capitulo-([0-9.]+)[a-z-]*/?"[^>]*>([\\s\\S]*?)</a>`,
    "g"
  );
  const matches = [...html.matchAll(chapterRegex)];
  const chapters: ParsedNovelDetail["chapters"] = [];
  for (const m of matches) {
    const number = parseFloat(m[3]);
    if (isNaN(number)) continue;
    const volume = m[2] ? parseInt(m[2], 10) : undefined;
    const inner = stripTags(m[4]).trim();
    const title = inner.length > 1 && inner.length < 200 ? decodeEntities(inner) : `Capítulo ${number}`;
    // Slug: pega o que vem depois de /centralnovel.com/ na URL
    const urlMatch = m[0].match(/href="([^"]+)"/);
    const urlPath = urlMatch ? urlMatch[1].replace(BASE + "/", "").replace(/\/$/, "") : "";
    chapters.push({
      number,
      title,
      slug: urlPath,
      sourceUrl: `${BASE}/${urlPath}/`,
      volume,
    });
  }

  // Dedup
  const seen = new Set<number>();
  const uniq = chapters.filter((c) => {
    if (seen.has(c.number)) return false;
    seen.add(c.number);
    return true;
  });
  uniq.sort((a, b) => a.number - b.number);

  return {
    title,
    coverUrl,
    synopsis,
    author: null,
    artist: null,
    status: uniq.length > 0 ? "ongoing" : "unknown",
    chapters: uniq,
  };
}

function parseChapterContent(html: string): string {
  // Conteúdo do capítulo fica em <article ... class="post-XXX hentry"> ... </article>
  // OU <div class="entry-content">
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
  const block = articleMatch ? articleMatch[1] : html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";

  // Remove shortcodes, scripts, styles, navigation
  let content = block
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<div[^>]*class="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<div[^>]*class="[^"]*ads?[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Quebra de parágrafos → \n\n
  content = content
    .replace(/<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n\n## ")
    .replace(/<\/h[1-6]>/gi, "\n");

  // Strip remaining tags
  content = stripTags(content);
  content = decodeEntities(content);

  // Limpa múltiplas quebras
  content = content.replace(/\n{3,}/g, "\n\n").trim();
  return content;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Upserter (novels + chapters) ──────────────────────────────────────

export interface NovelImportResult {
  novelId: string;
  novelSlug: string;
  isNew: boolean;
  chaptersAdded: number;
  errors: Array<{ chapter: number; message: string }>;
}

export async function importNovel(
  novelSlug: string,
  options: { maxChapters?: number | null; onProgress?: (m: string) => void } = {}
): Promise<NovelImportResult> {
  const { maxChapters = null, onProgress = () => {} } = options;
  const log = onProgress;
  const db = getDb();

  log(`[centralnovel] Buscando série: ${novelSlug}`);
  const html = await fetchHtml(`${BASE}/series/${novelSlug}/`);
  const detail = parseSeriesDetail(html, novelSlug);

  log(`[centralnovel] "${detail.title}" — ${detail.chapters.length} capítulos`);

  // Upsert novel
  const existing = db
    .prepare(`SELECT id FROM novels WHERE source = ? AND source_id = ?`)
    .get(SOURCE_NAME, novelSlug) as { id: string } | undefined;

  let novelId: string;
  let isNew = false;
  if (existing) {
    novelId = existing.id;
    db.prepare(
      `UPDATE novels SET title=?, synopsis=?, cover_url=?, source_url=?, updated_at=datetime('now'), last_synced_at=datetime('now') WHERE id=?`
    ).run(detail.title, detail.synopsis, detail.coverUrl, `${BASE}/series/${novelSlug}/`, novelId);
  } else {
    novelId = randomUUID();
    isNew = true;
    const admin = db
      .prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)
      .get() as { id: string } | undefined;
    const authorId = admin?.id || "system";
    // Slug único: prefixo com fonte pra evitar colisão com MAL/JIKAN/etc
    const uniqueSlug = `cn-${novelSlug}`;
    db.prepare(
      `INSERT INTO novels (id, slug, title, alternative_titles, synopsis, cover_url, author_id, type, status, source, source_id, source_url, genres, tags, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      novelId,
      uniqueSlug,
      detail.title,
      "[]",
      detail.synopsis,
      detail.coverUrl,
      authorId,
      "light-novel",
      detail.status === "unknown" ? "ongoing" : detail.status,
      SOURCE_NAME,
      novelSlug,
      `${BASE}/series/${novelSlug}/`,
      "[]",
      "[]"
    );
  }

  // Import chapters
  const chaptersToImport = detail.chapters.slice(0, maxChapters ?? detail.chapters.length);
  let chaptersAdded = 0;
  const errors: NovelImportResult["errors"] = [];

  for (const ch of chaptersToImport) {
    // Check existing
    const exists = db
      .prepare(`SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?`)
      .get(novelId, ch.number) as { id: string } | undefined;
    if (exists) {
      log(`  · Cap ${ch.number}: já existe — pulando`);
      continue;
    }

    try {
      const chHtml = await fetchHtml(ch.sourceUrl);
      const content = parseChapterContent(chHtml);

      if (content.length < 100) {
        log(`  ⚠ Cap ${ch.number}: conteúdo muito curto (${content.length} chars)`);
        continue;
      }

      const wordCount = content.split(/\s+/).length;
      db.prepare(
        `INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, published_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(randomUUID(), novelId, ch.number, ch.title, content, wordCount);
      chaptersAdded++;
      log(`  + Cap ${ch.number} importado (${wordCount} palavras)`);
      await new Promise((r) => setTimeout(r, 300));
    } catch (e: any) {
      log(`  ✗ Cap ${ch.number}: erro — ${e.message}`);
      errors.push({ chapter: ch.number, message: e.message });
    }
  }

  return { novelId, novelSlug, isNew, chaptersAdded, errors };
}

/**
 * Lista novels do catálogo do centralnovel.
 * URL: https://centralnovel.com/series/
 */
export async function listCatalogNovels(maxPages = 1): Promise<Array<{ slug: string; title: string }>> {
  const out: Array<{ slug: string; title: string }> = [];
  for (let p = 1; p <= maxPages; p++) {
    const url = p === 1 ? `${BASE}/series/` : `${BASE}/series/page/${p}/`;
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch {
      break;
    }
    const re = /<a[^>]*href="https?:\/\/centralnovel\.com\/series\/([^/"]+)\/?"[^>]*>\s*([^<]{3,})\s*<\/a>/g;
    const matches = [...html.matchAll(re)];
    const seen = new Set<string>();
    for (const m of matches) {
      const slug = m[1];
      const title = decodeEntities(m[2].trim());
      if (seen.has(slug) || slug.length < 3 || !title) continue;
      seen.add(slug);
      out.push({ slug, title });
    }
  }
  return out;
}