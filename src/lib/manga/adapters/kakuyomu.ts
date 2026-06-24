/**
 * Kakuyomu.jp Adapter (Japanese Web Novels — NOT manga)
 *
 * Site: https://kakuyomu.jp (Kakuyomu — Japanese web novel platform)
 *
 * Estrutura:
 *   - Série:  /works/{id}
 *   - Episódio: /works/{id}/episodes/{episodeId}
 *
 * Conteúdo em japonês — vai pra tabela `novels` como JP.
 * NÃO é mangá — não tem páginas, é texto.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";

const BASE = "https://kakuyomu.jp";
const SOURCE_NAME = "kakuyomu";

async function fetchHtml(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.8",
    },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return await r.text();
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
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

interface KakuyomuEpisode {
  id: string;
  number: number;
  title: string;
  sourceUrl: string;
}

function parseWork(html: string, workId: string): {
  title: string;
  author: string | null;
  synopsis: string;
  coverUrl: string | null;
  episodes: KakuyomuEpisode[];
} {
  // Title — og:title ou <title>
  let title = "";
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
  if (ogTitle) {
    title = decodeEntities(ogTitle[1].trim());
    // Remove sufixo " - カクヨム"
    title = title.replace(/\s*[-–—]\s*カクヨム$/, "");
  }
  if (!title) {
    const tMatch = html.match(/<title>([^<]+)<\/title>/);
    if (tMatch) title = decodeEntities(tMatch[1].trim());
  }

  // Author — <a class="widget-workAuthor" ...>Nome</a> ou itemprop="author"
  let author: string | null = null;
  const authorMatch = html.match(/<a[^>]*class="[^"]*widget-workAuthor[^"]*"[^>]*>([^<]+)<\/a>/);
  if (authorMatch) author = decodeEntities(authorMatch[1].trim());
  if (!author) {
    const authorMeta = html.match(/<meta name="author" content="([^"]+)"/);
    if (authorMeta) author = decodeEntities(authorMeta[1].trim());
  }

  // Synopsis — og:description
  let synopsis = "";
  const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/);
  if (ogDesc) synopsis = decodeEntities(ogDesc[1].trim());

  // Cover — og:image
  let coverUrl: string | null = null;
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
  if (ogImage) coverUrl = ogImage[1];

  // Episodes — <a href="/works/{id}/episodes/{eid}">Title</a>
  const episodeRegex = new RegExp(
    `<a[^>]*href="/works/${workId}/episodes/([0-9]+)"[^>]*>([\\s\\S]*?)</a>`,
    "g"
  );
  const matches = [...html.matchAll(episodeRegex)];
  const episodes: KakuyomuEpisode[] = [];
  let counter = 1;
  for (const m of matches) {
    const episodeId = m[1];
    const inner = stripTags(m[2]).trim();
    const title = inner.length > 0 ? decodeEntities(inner) : `エピソード ${counter}`;
    episodes.push({
      id: episodeId,
      number: counter++,
      title,
      sourceUrl: `${BASE}/works/${workId}/episodes/${episodeId}`,
    });
  }

  return { title, author, synopsis, coverUrl, episodes };
}

function parseEpisodeContent(html: string): string {
  // Kakuyomu armazena o conteúdo em <div class="widget-episodeBody" ...> ou <section class="...">
  const bodyMatch = html.match(/<div[^>]*class="[^"]*widget-episodeBody[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  const block = bodyMatch ? bodyMatch[1] : "";

  let content = block
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "");

  // Kakuyomu usa <p class="..."> para parágrafos
  content = content
    .replace(/<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n\n## ")
    .replace(/<\/h[1-6]>/gi, "\n");

  content = stripTags(content);
  content = decodeEntities(content);
  content = content.replace(/\n{3,}/g, "\n\n").trim();
  return content;
}

export async function importKakuyomuWork(
  workId: string,
  options: { maxEpisodes?: number | null; onProgress?: (m: string) => void } = {}
): Promise<{ workId: string; isNew: boolean; episodesAdded: number; errors: string[] }> {
  const { maxEpisodes = null, onProgress = () => {} } = options;
  const log = onProgress;
  const db = getDb();

  log(`[kakuyomu] Buscando obra: ${workId}`);
  const html = await fetchHtml(`${BASE}/works/${workId}`);
  const work = parseWork(html, workId);

  log(`[kakuyomu] "${work.title}" (${work.author || "?"}) — ${work.episodes.length} episódios`);

  // Upsert como novel JP
  const existing = db
    .prepare(`SELECT id FROM novels WHERE source = ? AND source_id = ?`)
    .get(SOURCE_NAME, workId) as { id: string } | undefined;

  let novelId: string;
  let isNew = false;
  if (existing) {
    novelId = existing.id;
    db.prepare(
      `UPDATE novels SET title=?, synopsis=?, cover_url=?, source_url=?, updated_at=datetime('now'), last_synced_at=datetime('now') WHERE id=?`
    ).run(work.title, work.synopsis, work.coverUrl, `${BASE}/works/${workId}`, novelId);
  } else {
    novelId = randomUUID();
    isNew = true;
    const admin = db
      .prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)
      .get() as { id: string } | undefined;
    const authorId = admin?.id || "system";
    db.prepare(
      `INSERT INTO novels (id, slug, title, alternative_titles, synopsis, cover_url, author_id, type, status, source, source_id, source_url, genres, tags, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      novelId,
      workId,
      work.title,
      JSON.stringify([work.author].filter(Boolean)),
      work.synopsis,
      work.coverUrl,
      authorId,
      "web-novel",
      "ongoing",
      SOURCE_NAME,
      workId,
      `${BASE}/works/${workId}`,
      "[]",
      JSON.stringify(["japonês", "kakuyomu"])
    );
  }

  const episodesToImport = work.episodes.slice(0, maxEpisodes ?? work.episodes.length);
  let episodesAdded = 0;
  const errors: string[] = [];

  for (const ep of episodesToImport) {
    const exists = db
      .prepare(`SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?`)
      .get(novelId, ep.number) as { id: string } | undefined;
    if (exists) continue;

    try {
      const epHtml = await fetchHtml(ep.sourceUrl);
      const content = parseEpisodeContent(epHtml);
      if (content.length < 50) continue;
      const wordCount = content.split(/\s+/).length;
      db.prepare(
        `INSERT INTO chapters (id, novel_id, chapter_number, title, content, word_count, published_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(randomUUID(), novelId, ep.number, ep.title, content, wordCount);
      episodesAdded++;
      log(`  + Ep ${ep.number} (${wordCount} palavras)`);
      await new Promise((r) => setTimeout(r, 400));
    } catch (e: any) {
      log(`  ✗ Ep ${ep.number}: ${e.message}`);
      errors.push(ep.id);
    }
  }

  return { workId, isNew, episodesAdded, errors };
}

export async function listKakuyomuLatest(limit = 10): Promise<Array<{ id: string; title: string }>> {
  const html = await fetchHtml(`${BASE}/next`);
  const matches = [
    ...html.matchAll(/<a[^>]*href="\/works\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g),
  ];
  const seen = new Set<string>();
  const out: Array<{ id: string; title: string }> = [];
  for (const m of matches) {
    const id = m[1];
    const title = decodeEntities(stripTags(m[2]).trim());
    if (seen.has(id) || title.length < 2) continue;
    seen.add(id);
    out.push({ id, title });
    if (out.length >= limit) break;
  }
  return out;
}