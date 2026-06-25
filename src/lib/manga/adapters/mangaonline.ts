/**
 * MangaOnline.blue Adapter
 *
 * Site: https://mangaonline.blue (WordPress + Madara theme)
 *
 * Estrutura:
 *   - Catálogo: /manga/  (lista cards)
 *   - Detalhe:  /manga/{slug}/  (capa, sinopse, gêneros, autor, capítulos)
 *   - Capítulo: /manga/{slug}/capitulo-{N}/  (páginas com class wp-manga-chapter-img)
 *   - Imagens em: https://mangaonline.blue/wp-content/uploads/WP-manga/data/...
 *
 * Estratégia:
 *   - GET via fetch nativo do Node 20+
 *   - Parse com regex simples (HTML não é XML, então não usar parser DOM)
 *   - Página de capítulo: extrair todos os <img class="wp-manga-chapter-img" src="...">
 *   - Página de detalhe: extrair cover, sinopse, autor, gêneros, capítulos via padrões conhecidos
 *
 * CHECKPOINT:
 *   Cada import é idempotente — usa (source='mangaonline.blue', source_id=slug) como chave
 *   e (manga_id, chapter_number) como chave de capítulo. Páginas em (chapter_id, page_number).
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

const BASE = "https://mangaonline.blue";
const SOURCE_NAME = "mangaonline.blue";

// ── HTTP helpers (Node 20 fetch) ────────────────────────────────────

async function fetchHtml(url: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        },
      });
      if (!r.ok) {
        if (r.status === 404) throw new Error(`404 Not Found: ${url}`);
        throw new Error(`HTTP ${r.status}: ${url}`);
      }
      return await r.text();
    } catch (e: any) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error("unreachable");
}

// ── Parsers ───────────────────────────────────────────────────────────

export interface ParsedMangaDetail {
  title: string;
  alternativeTitles: string[];
  synopsis: string;
  coverUrl: string | null;
  author: string | null;
  artist: string | null;
  status: "ongoing" | "completed" | "hiatus" | "dropped" | "unknown";
  genres: string[];
  chapters: Array<{
    number: number;
    title: string | null;
    slug: string;
    sourceUrl: string;
  }>;
}

function parseMangaDetail(html: string, mangaSlug: string): ParsedMangaDetail {
  // Title — vem em <h1> ou meta og:title ou schema.org name
  let title = "";
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1Match) title = decodeEntities(h1Match[1].trim());
  if (!title) {
    const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitle) title = decodeEntities(ogTitle[1].trim());
  }

  // Cover — pega a versão full-size da imagem do manga
  // Padrão: <img ... src="https://mangaonline.blue/wp-content/uploads/YYYY/MM/HASH-XXXxYYY.webp" class="img-responsive" ...>
  // A versão full é sem o "-XXXxYYY" no final
  let coverUrl: string | null = null;
  const coverMatches = [
    ...html.matchAll(/<img[^>]*class="img-responsive"[^>]*src="([^"]*\.(?:jpg|jpeg|png|webp))"/g),
  ];
  for (const m of coverMatches) {
    const src = m[1];
    if (src.includes("cropped-manga-logo") || src.includes("-75x106") || src.includes("-125x180")) continue;
    coverUrl = src.replace(/-\d+x\d+\.(jpg|jpeg|png|webp)$/, ".$1");
    break;
  }
  if (!coverUrl) {
    const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImage) coverUrl = ogImage[1];
  }

  // Synopsis — primeiro parágrafo dentro do summary_content
  let synopsis = "";
  const synopsisMatch = html.match(/<div class="summary_content_wrap[^"]*"[^>]*>([\s\S]*?)<div class="loading-wrap/i);
  if (synopsisMatch) {
    const block = synopsisMatch[1];
    // Pega todos os <p>...</p> depois do genres_wrap (que tem os gêneros)
    const ps = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => decodeEntities(stripTags(m[1]).trim()));
    synopsis = ps.filter((s) => s.length > 20).join("\n\n");
  }
  if (!synopsis) {
    const metaDesc = html.match(/<meta name="description" content="([^"]+)"/);
    if (metaDesc) {
      const d = decodeEntities(metaDesc[1]).trim();
      if (d.length > 30 && d !== title) synopsis = d;
    }
  }

  // Author / Artist — schema.org JSON-LD é mais confiável
  let author: string | null = null;
  let artist: string | null = null;
  const ldJsonMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const m of ldJsonMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item && item["@type"] === "Book") {
          author = item.author?.name || author;
        }
        if (item && item["@type"] === "Person" && item.name && !author) {
          author = item.name;
        }
      }
    } catch {}
  }
  // Fallback: extrai do summary "Autor" / "Artista"
  if (!author) {
    const aMatch = html.match(/Autor[\s\S]{0,200}?<div[^>]*class="summary-content"[^>]*>([^<]+)/);
    if (aMatch) author = decodeEntities(aMatch[1].trim());
  }
  if (!artist) {
    const aMatch = html.match(/Artista[\s\S]{0,200}?<div[^>]*class="summary-content"[^>]*>([^<]+)/);
    if (aMatch) artist = decodeEntities(aMatch[1].trim());
  }

  // Status — MangaOnline não tem campo status no schema, inferir via chapters
  // (placeholder: ongoing se tem capítulos recentes, completed caso contrário)

  // Gêneros — links para /genre/xxx
  const genres = [
    ...new Set(
      [...html.matchAll(/href="https?:\/\/mangaonline\.blue\/genre\/([^/"]+)/g)].map(
        (m) => decodeURIComponent(m[1]).replace(/-/g, " ")
      )
    ),
  ].slice(0, 10);

  // Chapters — capítulos com vários formatos de URL:
  //   /manga/{slug}/capitulo-{N}/
  //   /manga/{slug}/capitulo-{N}-pt-br/
  //   /manga/{slug}/capitulo-{N}_-texto-qualquer/
  //   /manga/{slug}/capitulo-{N}-texto-qualquer/
  const chapters: ParsedMangaDetail["chapters"] = [];
  const chapterRegex = new RegExp(
    `<a[^>]*href="https?://mangaonline\\.blue/manga/${escapeRegex(mangaSlug)}/(capitulo-[0-9.]+(?:[_-][a-z0-9-]+)?)/?"[^>]*>([\\s\\S]*?)</a>`,
    "g"
  );
  const chapterMatches = [...html.matchAll(chapterRegex)];
  for (const m of chapterMatches) {
    const slugPart = m[1]; // "capitulo-407-pt-br", "capitulo-106_-captura"
    const numMatch = slugPart.match(/capitulo-([0-9.]+)/);
    if (!numMatch) continue;
    const number = parseFloat(numMatch[1]);
    if (isNaN(number)) continue;
    const inner = m[2].replace(/<[^>]+>/g, "").trim();
    const title = inner.length > 1 && inner.length < 200 ? inner : null;
    chapters.push({
      number,
      title,
      slug: slugPart,
      sourceUrl: `${BASE}/manga/${mangaSlug}/${slugPart}/`,
    });
  }

  // Dedup por chapter_number, mantendo primeiro
  const seen = new Set<number>();
  const uniqChapters = chapters.filter((c) => {
    if (seen.has(c.number)) return false;
    seen.add(c.number);
    return true;
  });
  // Ordena do menor (cap 1) pro maior
  uniqChapters.sort((a, b) => a.number - b.number);

  return {
    title: title || mangaSlug,
    alternativeTitles: [],
    synopsis,
    coverUrl,
    author,
    artist,
    status: uniqChapters.length > 0 ? "ongoing" : "unknown",
    genres,
    chapters: uniqChapters,
  };
}

function parseChapterPages(html: string): string[] {
  // Padrão Madara: <img src="URL" class="wp-manga-chapter-img" ...> (URL pode ter espaços)
  const matches = [
    ...html.matchAll(/<img[^>]*src="([^"]+)"[^>]*class="wp-manga-chapter-img"/g),
    ...html.matchAll(/<img[^>]*class="wp-manga-chapter-img"[^>]*src="([^"]+)"/g),
  ];
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    let u = m[1].trim();
    // Algumas URLs vêm com whitespace prefixado
    u = u.replace(/^\s+/, "");
    if (!seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  }
  return urls;
}

// ── Helpers ───────────────────────────────────────────────────────────

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
    .replace(/&#8221;/g, '"');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Upserter ──────────────────────────────────────────────────────────

export interface ImportResult {
  mangaId: string;
  mangaSlug: string;
  isNew: boolean;
  chaptersAdded: number;
  pagesAdded: number;
  errors: Array<{ chapter: string; page: number; message: string }>;
}

/**
 * Importa um mangá completo do mangaonline.blue.
 *
 * @param mangaSlug - slug do mangá (ex: "fui-jogado-em-um-manga-desconhecido")
 * @param options.maxChapters - limita quantos capítulos importar (null = todos)
 * @param options.startFromChapter - começa a partir deste número (default 1)
 * @param options.skipExistingPages - true: só adiciona páginas que faltam; false: re-baixar tudo
 */
export async function importManga(
  mangaSlug: string,
  options: {
    maxChapters?: number | null;
    startFromChapter?: number;
    skipExistingPages?: boolean;
    onProgress?: (msg: string) => void;
  } = {}
): Promise<ImportResult> {
  const { maxChapters = null, startFromChapter = 1, skipExistingPages = true, onProgress = () => {} } = options;
  const log = onProgress;
  const db = getDb();

  log(`[mangaonline] Buscando detalhes: ${mangaSlug}`);
  const detailHtml = await fetchHtml(`${BASE}/manga/${mangaSlug}/`);
  const detail = parseMangaDetail(detailHtml, mangaSlug);

  log(`[mangaonline] Título: "${detail.title}" — ${detail.chapters.length} capítulos`);

  // ── 1. Upsert manga ────────────────────────────────────────────────
  const existing = db
    .prepare(`SELECT id, title FROM mangas WHERE source = ? AND source_id = ?`)
    .get(SOURCE_NAME, mangaSlug) as { id: string; title: string } | undefined;

  let mangaId: string;
  let isNew = false;

  if (existing) {
    mangaId = existing.id;
    db.prepare(
      `UPDATE mangas SET title=?, synopsis=?, cover_url=?, author=?, artist=?, status=?, source_url=?, last_synced_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
    ).run(
      detail.title,
      detail.synopsis,
      detail.coverUrl,
      detail.author,
      detail.artist,
      detail.status === "unknown" ? "ongoing" : detail.status,
      `${BASE}/manga/${mangaSlug}/`,
      mangaId
    );
    log(`[mangaonline] Mangá já existia — atualizado (id=${mangaId})`);
  } else {
    mangaId = randomUUID();
    isNew = true;
    db.prepare(
      `INSERT INTO mangas (id, slug, title, alternative_titles, synopsis, cover_url, author, artist, status, source, source_id, source_url, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      mangaId,
      mangaSlug,
      detail.title,
      JSON.stringify(detail.alternativeTitles),
      detail.synopsis,
      detail.coverUrl,
      detail.author,
      detail.artist,
      detail.status === "unknown" ? "ongoing" : detail.status,
      SOURCE_NAME,
      mangaSlug,
      `${BASE}/manga/${mangaSlug}/`
    );
    log(`[mangaonline] Mangá criado (id=${mangaId})`);
  }

  // ── 2. Atualiza tags ────────────────────────────────────────────────
  db.prepare(`DELETE FROM manga_tags WHERE manga_id = ?`).run(mangaId);
  for (const tag of detail.genres) {
    db.prepare(`INSERT OR IGNORE INTO manga_tags (manga_id, tag) VALUES (?, ?)`).run(mangaId, tag);
  }

  // ── 3. Filtra capítulos a importar ──────────────────────────────────
  const chaptersToImport = detail.chapters
    .filter((c) => c.number >= startFromChapter)
    .slice(0, maxChapters ?? detail.chapters.length);

  log(`[mangaonline] Capítulos a processar: ${chaptersToImport.length}`);

  let chaptersAdded = 0;
  let pagesAdded = 0;
  const errors: ImportResult["errors"] = [];

  for (const ch of chaptersToImport) {
    // Verifica/cria chapter
    const existingCh = db
      .prepare(`SELECT id, page_count FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?`)
      .get(mangaId, ch.number) as { id: string; page_count: number } | undefined;

    let chapterId: string;
    if (existingCh) {
      chapterId = existingCh.id;
    } else {
      chapterId = randomUUID();
      db.prepare(
        `INSERT INTO manga_chapters (id, manga_id, chapter_number, title, slug, source_url, page_count) VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).run(chapterId, mangaId, ch.number, ch.title, ch.slug, ch.sourceUrl);
      chaptersAdded++;
      log(`  + Cap ${ch.number} criado`);
    }

    // Pula se já tem páginas suficientes e skipExistingPages
    if (skipExistingPages && existingCh && existingCh.page_count > 1) {
      log(`  · Cap ${ch.number}: já tem ${existingCh.page_count} páginas — pulando`);
      continue;
    }

    // Se capítulo já existe com 1 página (provavelmente capa), limpa e refaz
    if (existingCh && existingCh.page_count === 1) {
      db.prepare(`DELETE FROM manga_pages WHERE chapter_id = ?`).run(chapterId);
      log(`  ~ Cap ${ch.number}: limpando 1 página existente para re-importar`);
    }

    // Fetch e parse das páginas
    let pageUrls: string[] = [];
    try {
      const chHtml = await fetchHtml(ch.sourceUrl);
      pageUrls = parseChapterPages(chHtml);
    } catch (e: any) {
      log(`  ✗ Cap ${ch.number}: erro ao buscar páginas — ${e.message}`);
      errors.push({ chapter: String(ch.number), page: 0, message: e.message });
      continue;
    }

    if (pageUrls.length === 0) {
      log(`  ⚠ Cap ${ch.number}: nenhuma página encontrada`);
      continue;
    }

    // Insere páginas
    let capPagesAdded = 0;
    for (let i = 0; i < pageUrls.length; i++) {
      try {
        db.prepare(
          `INSERT OR IGNORE INTO manga_pages (id, chapter_id, page_number, image_url) VALUES (?, ?, ?, ?)`
        ).run(randomUUID(), chapterId, i + 1, pageUrls[i]);
        capPagesAdded++;
      } catch (e: any) {
        errors.push({ chapter: String(ch.number), page: i + 1, message: e.message });
      }
    }

    // Atualiza page_count
    db.prepare(`UPDATE manga_chapters SET page_count = ? WHERE id = ?`).run(pageUrls.length, chapterId);
    pagesAdded += capPagesAdded;
    log(`  ✓ Cap ${ch.number}: ${capPagesAdded} páginas adicionadas (total: ${pageUrls.length})`);

    // Pausa educada pra não martelar o servidor
    await new Promise((r) => setTimeout(r, 250));
  }

  // ── 4. Log de import ───────────────────────────────────────────────
  db.prepare(
    `INSERT INTO manga_import_log (source, manga_slug, status, pages_imported, chapters_imported, error) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    SOURCE_NAME,
    mangaSlug,
    errors.length === 0 ? "success" : chaptersAdded > 0 || pagesAdded > 0 ? "partial" : "failed",
    pagesAdded,
    chaptersAdded,
    errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null
  );

  return {
    mangaId,
    mangaSlug,
    isNew,
    chaptersAdded,
    pagesAdded,
    errors,
  };
}

/**
 * Lista todos os mangás disponíveis no catálogo (página /manga/).
 * Usado pra fazer bulk import.
 */
export async function listCatalogMangas(maxPages = 1): Promise<Array<{ slug: string; title: string }>> {
  const out: Array<{ slug: string; title: string }> = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? `${BASE}/manga/` : `${BASE}/manga/page/${page}/`;
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch {
      break;
    }
    // Padrão Madara: <div class="page-item-detail"> <h3 class="h5"><a href="...">Título</a></h3>
    const matches = [
      ...html.matchAll(/<a\s+href="https?:\/\/mangaonline\.blue\/manga\/([^/"]+)\/"[^>]*>\s*([^<]{3,})\s*<\/a>/g),
    ];
    const skipSlugs = new Set(["feed", "wp-login.php", "wp-cron.php", "xmlrpc.php"]);
    const seen = new Set<string>();
    for (const m of matches) {
      const slug = m[1];
      const title = decodeEntities(m[2].trim());
      if (skipSlugs.has(slug)) continue;
      if (slug.length < 4 || !title) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({ slug, title });
    }
  }
  return out;
}