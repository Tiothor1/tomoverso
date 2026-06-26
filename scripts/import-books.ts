/**
 * Importador de livros do BaixeiLivros.com.br
 * Uso: npx tsx scripts/import-books.ts
 */

import { getDb } from "../src/lib/db";
import { randomUUID } from "crypto";

const BASE = "https://www.baixelivros.com.br";

// Categorias do WP → gêneros do Tomoverso
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
  "literatura-infantojuvenil": "Jovem Adulto",
  "literatura-nacional": "Romance",
  "conto": "Outros",
  poesia: "Outros",
  "nao-ficcao": "Outros",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").slice(0, 80);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function extractMeta(html: string, name: string): string {
  const m = html.match(new RegExp(`<meta[^>]+(?:name|property)="[^"]*${name}[^"]*"[^>]+content="([^"]+)"`, "i"));
  return m ? m[1].trim() : "";
}

interface BookData {
  title: string;
  author: string;
  synopsis: string;
  content: string;
  coverUrl: string;
  genres: string[];
  pages: number;
  sourceUrl: string;
}

async function scrapeBookPost(url: string): Promise<BookData | null> {
  try {
    const html = await fetchHtml(url);

    // Título
    const title = extractMeta(html, "og:title") || html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]?.trim() || "";
    if (!title) return null;

    // Autor
    let author = extractMeta(html, "author");
    if (!author) {
      const authorMatch = html.match(/<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i);
      author = authorMatch ? authorMatch[1].trim() : "";
    }

    // Sinopse
    let synopsis = extractMeta(html, "description") || extractMeta(html, "og:description") || "";
    synopsis = synopsis.replace(/^Baixar (o livro|a obra) [^"]+ (de|gratis) /i, "").trim();

    // Capa
    let coverUrl = extractMeta(html, "og:image") || "";
    if (!coverUrl) {
      const imgMatch = html.match(/<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/i);
      coverUrl = imgMatch ? imgMatch[1] : "";
    }

    // Categorias/gêneros — extrai do caminho da URL e das categorias do post
    const genres: string[] = [];
    // Gênero baseado na URL (romance/, literatura-brasileira/, etc.)
    if (url.includes("/romance/") && !genres.includes("Romance")) genres.push("Romance");
    if (url.includes("/aventura/") && !genres.includes("Aventura")) genres.push("Aventura");
    if (url.includes("/literatura-estrangeira")) genres.push("Ficção Científica", "Aventura");
    if (url.includes("/literatura-brasileira")) genres.push("Drama", "Romance");
    if (url.includes("/literatura-portuguesa")) genres.push("Drama");
    if (url.includes("/literatura-de-cordel")) genres.push("Poesia", "Drama");
    // Também tenta categorias do WordPress
    const catLinks = html.matchAll(/href="https:\/\/www\.baixelivros\.com\.br\/category\/([^"/]+)\/"/g);
    for (const m of catLinks) {
      const mapped = GENRE_MAP[m[1].toLowerCase()];
      if (mapped && !genres.includes(mapped)) genres.push(mapped);
    }
    if (genres.length === 0) genres.push("Outros");

    // Conteúdo (texto do post)
    const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<footer|<div[^>]*class="[^"]*author-box|<div[^>]*class="[^"]*related)/i);
    let content = "";
    if (contentMatch) {
      content = contentMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&[lg]t;/g, "")
        .replace(/\n{4,}/g, "\n\n")
        .trim();
    }
    if (!content) content = synopsis;

    // Calcular páginas aproximadas
    const wordCount = content.split(/\s+/).length;
    const pages = Math.max(1, Math.ceil(wordCount / 300));

    return { title, author, synopsis, coverUrl, genres, content, pages, sourceUrl: url };
  } catch (e: any) {
    console.error(`  ERRO: ${e.message}`);
    return null;
  }
}

async function scrapeLista(categoryUrl: string): Promise<string[]> {
  const html = await fetchHtml(categoryUrl);
  const urls: string[] = [];
  const links = html.matchAll(/href="(https:\/\/www\.baixelivros\.com\.br\/(?:romance|literatura|aventura|licenca)\/[^"]+)"/gi);
  for (const m of links) {
    const url = m[1].split("?")[0].split("#")[0];
    if (!urls.includes(url) && !url.includes("wp-") && !url.includes("feed")) urls.push(url);
  }
  return urls;
}

async function main() {
  const db = getDb();

  // Verifica se tabela existe
  const hasTable = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'").get();
  if (!hasTable) {
    console.log("Tabela 'books' não existe. Execute o build primeiro.");
    return;
  }

  // Categorias para escanear (só entretenimento) — com paginação
  const categories: string[] = [];
  const catSlugs = [
    "romance", "aventura", "literatura-de-cordel",
    "literatura-portuguesa", "literatura-estrangeira",
    "literatura-brasileira", "licenca/gratuito",
  ];
  for (const cat of catSlugs) {
    categories.push(`${BASE}/biblioteca/${cat}`);
    categories.push(`${BASE}/biblioteca/${cat}/page/2`);
    categories.push(`${BASE}/biblioteca/${cat}/page/3`);
  }

  // Coleta URLs
  const allUrls: string[] = [];
  for (const cat of categories) {
    try {
      const urls = await scrapeLista(cat);
      for (const u of urls) {
        if (!allUrls.includes(u)) allUrls.push(u);
      }
      console.log(`  ${cat.replace(BASE, "")}: ${urls.length} links`);
    } catch (e: any) {
      console.log(`  ${cat.replace(BASE, "")}: ERRO ${e.message}`);
    }
  }

  console.log(`\nTotal de URLs encontradas: ${allUrls.length}`);

  // Importa cada livro
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < Math.min(allUrls.length, 100); i++) {
    const url = allUrls[i];
    console.log(`\n[${i + 1}/${Math.min(allUrls.length, 100)}] ${url.replace(BASE, "")}`);

    // Verifica duplicata
    const existing = db.prepare("SELECT id FROM books WHERE source_url = ?").get(url);
    if (existing) {
      console.log("  Já importado, pulando");
      skipped++;
      continue;
    }

    const book = await scrapeBookPost(url);
    if (!book) { skipped++; continue; }

    const id = randomUUID();
    const slug = slugify(book.title);

    // Verifica slug duplicado
    let finalSlug = slug;
    let n = 1;
    while (db.prepare("SELECT 1 FROM books WHERE slug = ?").get(finalSlug)) {
      n++;
      finalSlug = `${slug}-${n}`;
    }

    try {
      db.prepare(`
        INSERT INTO books (id, slug, title, author, synopsis, content, cover_url, genres, pages, source, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, finalSlug, book.title.slice(0, 200), book.author.slice(0, 100),
        book.synopsis.slice(0, 2000), book.content, book.coverUrl, JSON.stringify(book.genres),
        book.pages, "baixelivros.com.br", url);

      imported++;
      console.log(`  ✓ "${book.title}" — ${book.author} (${book.pages}p, ${book.genres.join(", ")})`);
    } catch (e: any) {
      console.log(`  ERRO ao inserir: ${e.message}`);
    }

    // Pausa entre requests
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n✅ Concluído: ${imported} importados, ${skipped} pulados`);
  db.close();
}

main().catch(console.error);
