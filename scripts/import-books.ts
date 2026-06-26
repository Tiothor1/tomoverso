/**
 * Importador de livros do BaixeiLivros.com.br — versão completa
 * Uso: npx tsx scripts/import-books.ts
 */

import { getDb } from "../src/lib/db";
import { randomUUID } from "crypto";

const BASE = "https://www.baixelivros.com.br";

const ENTERTAINMENT_CATS = [
  "romance", "aventura", "literatura-de-cordel",
  "literatura-portuguesa", "literatura-estrangeira",
  "literatura-brasileira", "quadrinhos", "entretenimento",
  "licenca/gratuito",
];

const GENRE_MAP: Record<string, string> = {
  romance: "Romance",
  fantasia: "Fantasia",
  terror: "Terror",
  suspense: "Suspense",
  policial: "Policial",
  "ficcao-cientifica": "Ficção Científica",
  aventura: "Aventura",
  drama: "Drama",
  misterio: "Mistério",
  comedia: "Comédia",
  quadrinho: "Quadrinhos",
  entretenimento: "Entretenimento",
  "literatura-infantojuvenil": "Jovem Adulto",
  "literatura-nacional": "Romance",
  "literatura-de-cordel": "Cordel",
  "literatura-portuguesa": "Literatura Portuguesa",
  "literatura-estrangeira": "Literatura Estrangeira",
  "literatura-brasileira": "Literatura Brasileira",
};

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractMeta(html: string, name: string): string {
  const m = html.match(new RegExp(`<meta[^>]+(?:name|property)="[^"]*${name}[^"]*"[^>]+content="([^"]+)"`, "i"));
  return m ? m[1].trim() : "";
}

interface BookData {
  title: string; author: string; synopsis: string; content: string;
  coverUrl: string; genres: string[]; pages: number; sourceUrl: string;
}

async function scrapeBookPost(url: string): Promise<BookData | null> {
  try {
    const html = await fetchHtml(url);
    const title = extractMeta(html, "og:title") || html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() || "";
    if (!title) return null;

    let author = extractMeta(html, "author");
    if (!author) {
      const am = html.match(/<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i);
      author = am ? am[1].trim() : "";
    }

    let synopsis = extractMeta(html, "description") || extractMeta(html, "og:description") || "";
    synopsis = synopsis.replace(/^Baixar (o livro|a obra) [^"]+ (de|gratis) /i, "").trim();

    let coverUrl = extractMeta(html, "og:image") || "";
    if (!coverUrl) {
      const im = html.match(/<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/i);
      coverUrl = im ? im[1] : "";
    }

    // Gêneros baseados na URL
    const genres: string[] = [];
    if (url.includes("/romance/")) genres.push("Romance");
    if (url.includes("/aventura/")) genres.push("Aventura");
    if (url.includes("/literatura-estrangeira") || url.includes("/literatura-portuguesa")) genres.push("Literatura");
    if (url.includes("/literatura-brasileira")) genres.push("Literatura Brasileira");
    if (url.includes("/literatura-de-cordel")) genres.push("Cordel");
    if (url.includes("/quadrinhos") || url.includes("/quadrinho")) genres.push("Quadrinhos");
    if (url.includes("/entretenimento")) genres.push("Entretenimento");

    const catLinks = html.matchAll(/href="https:\/\/www\.baixelivros\.com\.br\/category\/([^"/]+)\/"/g);
    for (const m of catLinks) {
      const mapped = GENRE_MAP[m[1].toLowerCase()];
      if (mapped && !genres.includes(mapped)) genres.push(mapped);
    }
    if (genres.length === 0) genres.push("Outros");

    // Conteúdo
    const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<footer|<div[^>]*class="[^"]*author)/i);
    let content = "";
    if (contentMatch) {
      content = contentMatch[1]
        .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
        .replace(/\s{3,}/g, "\n\n").trim();
    }
    if (!content) content = synopsis;

    const wordCount = content.split(/\s+/).length;
    const pages = Math.max(1, Math.ceil(wordCount / 300));

    return { title, author, synopsis, coverUrl, genres, content, pages, sourceUrl: url };
  } catch (e: any) {
    console.error(`  ERRO: ${e.message}`);
    return null;
  }
}

async function countPages(cat: string): Promise<number> {
  try {
    const html = await fetchHtml(BASE + "/biblioteca/" + cat);
    const nums = [...html.matchAll(new RegExp("\\/biblioteca\\/" + cat.replace("/", "\\/") + "\\/page\\/(\\d+)", "g"))].map(m => parseInt(m[1]));
    return Math.max(...nums, 1);
  } catch { return 1; }
}

async function main() {
  const db = getDb();
  const hasTable = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'").get();
  if (!hasTable) { console.log("Tabela 'books' não existe."); return; }

  // Descobre páginas de cada categoria
  const allUrls: string[] = [];
  for (const cat of ENTERTAINMENT_CATS) {
    const maxPages = await countPages(cat);
    console.log(`\n${cat}: ${maxPages} páginas`);
    for (let p = 1; p <= maxPages; p++) {
      const catUrl = p === 1 ? `${BASE}/biblioteca/${cat}` : `${BASE}/biblioteca/${cat}/page/${p}`;
      try {
        const html = await fetchHtml(catUrl);
        // Coleta TODOS os links da pagina que parecem livros
        const links = [...html.matchAll(/href="(https:\/\/www\.baixelivros\.com\.br\/[a-z][a-z-]+\/[a-z0-9][a-z0-9-]+)"/gi)];
        const unique = [...new Set(links.map(l => l[1]))].filter(u => {
          if (u.includes('wp-') || u.includes('feed') || u.includes('xmlrpc') || u.includes('oembed') || u.includes('/page/') || u.includes('/media/') || u.includes('/upload')) return false;
          // Só categorias de entretenimento
          const parts = u.replace(BASE+'/','').split('/');
          return ENTERTAINMENT_CATS.includes(parts[0]) || ENTERTAINMENT_CATS.some(c => u.includes(`/${c}/`));
        });
        for (const u of unique) if (!allUrls.includes(u)) allUrls.push(u);
        process.stdout.write(".");
      } catch { process.stdout.write("x"); }
    }
  }

  console.log(`\n\nTotal de URLs: ${allUrls.length}`);

  // Importa
  let imported = 0, skipped = 0;
  for (let i = 0; i < allUrls.length; i++) {
    const url = allUrls[i];
    process.stdout.write(`\r[${i+1}/${allUrls.length}] ${url.replace(BASE,'').slice(0,50)}`);

    if (db.prepare("SELECT id FROM books WHERE source_url = ?").get(url)) { skipped++; continue; }

    const book = await scrapeBookPost(url);
    if (!book) { skipped++; continue; }

    const id = randomUUID();
    let slug = slugify(book.title);
    let n = 1;
    while (db.prepare("SELECT 1 FROM books WHERE slug = ?").get(slug)) slug = `${slugify(book.title)}-${++n}`;

    try {
      db.prepare(`INSERT INTO books (id,slug,title,author,synopsis,content,cover_url,genres,pages,source,source_url) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, slug, book.title.slice(0,200), book.author.slice(0,100),
          book.synopsis.slice(0,2000), book.content, book.coverUrl || "",
          JSON.stringify(book.genres), book.pages, "baixelivros.com.br", url);
      imported++;
    } catch (e: any) { skipped++; }
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n✅ ${imported} importados, ${skipped} pulados (${allUrls.length} encontrados)`);
  db.close();
}

main().catch(console.error);
