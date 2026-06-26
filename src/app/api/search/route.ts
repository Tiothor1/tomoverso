import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { publicReadableNovelSql, publicVisibleMangaSql, readableNovelChapterSql } from "@/lib/public-catalog";
import { readableTitle } from "@/lib/display-title";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Filter = "all" | "light-novel" | "web-novel" | "manga" | "books" | "chapters" | "authors" | "genres" | "pages";

type SearchItem = {
  id: string;
  type: "light-novel" | "web-novel" | "manga" | "chapter" | "author" | "genre" | "page";
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  cover?: string | null;
  meta?: string[];
  score?: number;
};

type SearchResponse = {
  query: string;
  filter: Filter;
  total: number;
  groups: Array<{ id: string; label: string; items: SearchItem[] }>;
  suggestions: string[];
};

const pages: SearchItem[] = [
  { id: "home", type: "page", title: "Início", subtitle: "Página inicial", description: "Destaques, lançamentos e busca do Tomoverso.", href: "/" },
  { id: "explore", type: "page", title: "Light Novels", subtitle: "Catálogo", description: "Explore Light Novels e WebNovels disponíveis.", href: "/explore" },
  { id: "manga", type: "page", title: "Mangás", subtitle: "Catálogo", description: "Mangás com leitor por páginas e tela cheia.", href: "/manga" },
  { id: "library", type: "page", title: "Estante", subtitle: "Leitura", description: "Acompanhe seus favoritos e progresso de leitura.", href: "/library" },
  { id: "dashboard", type: "page", title: "Painel do autor", subtitle: "Publicação", description: "Crie novels, capítulos e acompanhe métricas.", href: "/dashboard" },
  { id: "how-to", type: "page", title: "Como criar", subtitle: "Guia", description: "Aprenda a publicar sua Light Novel no Tomoverso.", href: "/how-to" },
  { id: "login", type: "page", title: "Entrar", subtitle: "Conta", description: "Login de leitores e autores.", href: "/auth/login" },
  { id: "signup", type: "page", title: "Criar conta", subtitle: "Conta", description: "Cadastre-se para ler e publicar.", href: "/auth/signup" },
];

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function cleanQuery(value: string | null): string {
  return (value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function validFilter(value: string | null): Filter {
  const filters: Filter[] = ["all", "light-novel", "web-novel", "manga", "books", "chapters", "authors", "genres", "pages"];
  return filters.includes(value as Filter) ? (value as Filter) : "all";
}

function tableExists(db: ReturnType<typeof getDb>, name: string): boolean {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function pageMatches(query: string): SearchItem[] {
  const q = query.toLowerCase();
  if (!q) return pages.slice(0, 5);
  return pages
    .map((p) => {
      const haystack = `${p.title} ${p.subtitle || ""} ${p.description || ""} ${p.href}`.toLowerCase();
      if (!haystack.includes(q)) return null;
      const title = p.title.toLowerCase();
      const score = title === q ? 100 : title.startsWith(q) ? 80 : haystack.includes(q) ? 45 : 1;
      return { ...p, score };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score) as SearchItem[];
}

function excerpt(text: string | null | undefined, query: string, max = 220): string {
  const source = (text || "").replace(/\s+/g, " ").trim();
  if (!source) return "";
  const idx = source.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return source.slice(0, max) + (source.length > max ? "..." : "");
  const start = Math.max(0, idx - 70);
  const end = Math.min(source.length, idx + query.length + 130);
  return `${start > 0 ? "..." : ""}${source.slice(start, end)}${end < source.length ? "..." : ""}`;
}

function novelDisplayTitle(n: any): string {
  return readableTitle({
    title: n.title,
    alternative_titles: n.alternative_titles,
    type: n.type,
    slug: n.slug,
  });
}

function group(id: string, label: string, items: SearchItem[]) {
  return { id, label, items };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = cleanQuery(url.searchParams.get("q"));
  const filter = validFilter(url.searchParams.get("filter"));
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "8", 10) || 8, 3), 20);

  const response: SearchResponse = {
    query,
    filter,
    total: 0,
    groups: [],
    suggestions: ["isekai", "sistema", "fantasia", "romance", "Record of Ragnarok", "O Que Eu Desenhei"],
  };

  const db = getDb();
  const q = query.toLowerCase();
  const exact = q;
  const starts = `${q}%`;
  const like = `%${q}%`;

  if (!query) {
    const topNovels = db.prepare(`
      SELECT n.id, n.slug, n.title, n.synopsis, n.type, n.genres, n.tags, n.cover_url, n.cover_local_path,
             u.display_name AS author_name,
             (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND ${readableNovelChapterSql("c")}) AS chapter_count
      FROM novels n
      LEFT JOIN users u ON u.id = n.author_id
      WHERE ${publicReadableNovelSql("n")}
      ORDER BY n.is_featured DESC, n.views DESC, n.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    response.groups.push(group("light-novel", "Destaques", topNovels.map((n) => ({
      id: n.id,
      type: n.type === "web-novel" ? "web-novel" : "light-novel",
      title: novelDisplayTitle(n),
      subtitle: `${n.type === "web-novel" ? "WebNovel" : "Light Novel"}${n.author_name ? ` · ${n.author_name}` : ""}`,
      description: excerpt(n.synopsis, query || n.title, 180),
      href: `/novels/${n.slug}`,
      cover: n.cover_local_path || n.cover_url,
      meta: [...safeJsonArray(n.genres).slice(0, 2), `${n.chapter_count || 0} caps`],
      score: 1,
    }))));

    if (tableExists(db, "mangas")) {
      const topManga = db.prepare(`
        SELECT m.id, m.slug, m.title, m.synopsis, m.cover_url, m.cover_local_path, m.author,
               (SELECT COUNT(*) FROM manga_chapters mc WHERE mc.manga_id = m.id) AS chapter_count
        FROM mangas m
        WHERE ${publicVisibleMangaSql("m")}
        ORDER BY m.updated_at DESC
        LIMIT ?
      `).all(limit) as any[];
      response.groups.push(group("manga", "Mangás recentes", topManga.map((m) => ({
        id: m.id,
        type: "manga",
        title: m.title,
        subtitle: m.author ? `Mangá · ${m.author}` : "Mangá",
        description: excerpt(m.synopsis, m.title, 180),
        href: `/manga/${m.slug}`,
        cover: m.cover_local_path || m.cover_url,
        meta: [`${m.chapter_count || 0} caps`],
        score: 1,
      }))));
    }

    // Livros recentes
    if (tableExists(db, "books")) {
      const topBooks = db.prepare(`
        SELECT id, slug, title, author, synopsis, cover_url, cover_local_path, pages
        FROM books WHERE is_hidden = 0
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit) as any[];
      if (topBooks.length > 0) {
        response.groups.push(group("books", "Livros recentes", topBooks.map((b) => ({
          id: b.id,
          type: "page",
          title: b.title,
          subtitle: b.author ? `Livro · ${b.author}` : "Livro",
          description: excerpt(b.synopsis, b.title, 180),
          href: `/livros/${b.slug}`,
          cover: b.cover_local_path || b.cover_url,
          meta: [`${b.pages} páginas`],
          score: 1,
        }))));
      }
    }

    response.groups.push(group("pages", "Páginas", pages.slice(0, 4)));
    response.total = response.groups.reduce((sum, g) => sum + g.items.length, 0);
    return NextResponse.json(response);
  }

  if (filter === "all" || filter === "light-novel" || filter === "web-novel") {
    const typeFilter = filter === "light-novel" || filter === "web-novel" ? "AND n.type = ?" : "";
    const typeParams = typeFilter ? [filter] : [];
    const novels = db.prepare(`
      SELECT n.id, n.slug, n.title, n.alternative_titles, n.synopsis, n.type, n.genres, n.tags,
             n.cover_url, n.cover_local_path, n.views,
             u.display_name AS author_name,
             (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND ${readableNovelChapterSql("c")}) AS chapter_count,
             CASE
               WHEN lower(n.title) = ? THEN 120
               WHEN lower(n.title) LIKE ? THEN 95
               WHEN lower(n.title) LIKE ? THEN 75
               WHEN lower(n.alternative_titles) LIKE ? THEN 68
               WHEN lower(u.display_name) LIKE ? THEN 58
               WHEN lower(n.genres) LIKE ? THEN 50
               WHEN lower(n.tags) LIKE ? THEN 48
               WHEN lower(n.synopsis) LIKE ? THEN 25
               ELSE 1
             END AS score
      FROM novels n
      LEFT JOIN users u ON u.id = n.author_id
      WHERE ${publicReadableNovelSql("n")} AND (
        lower(n.title) LIKE ? OR lower(n.alternative_titles) LIKE ? OR lower(n.synopsis) LIKE ? OR
        lower(n.genres) LIKE ? OR lower(n.tags) LIKE ? OR lower(COALESCE(u.display_name, '')) LIKE ?
      ) ${typeFilter}
      ORDER BY score DESC, n.views DESC, n.created_at DESC
      LIMIT ?
    `).all(exact, starts, like, like, like, like, like, like, like, like, like, like, like, like, ...typeParams, limit) as any[];

    const lightNovels = novels.filter((n) => n.type !== "web-novel").map((n) => ({
      id: n.id,
      type: "light-novel" as const,
      title: novelDisplayTitle(n),
      subtitle: n.author_name ? `Light Novel · ${n.author_name}` : "Light Novel",
      description: excerpt(n.synopsis, query),
      href: `/novels/${n.slug}`,
      cover: n.cover_local_path || n.cover_url,
      meta: [...safeJsonArray(n.genres).slice(0, 3), `${n.chapter_count || 0} caps`],
      score: n.score,
    }));
    const webNovels = novels.filter((n) => n.type === "web-novel").map((n) => ({
      id: n.id,
      type: "web-novel" as const,
      title: novelDisplayTitle(n),
      subtitle: n.author_name ? `WebNovel · ${n.author_name}` : "WebNovel",
      description: excerpt(n.synopsis, query),
      href: `/novels/${n.slug}`,
      cover: n.cover_local_path || n.cover_url,
      meta: [...safeJsonArray(n.genres).slice(0, 3), `${n.chapter_count || 0} caps`],
      score: n.score,
    }));
    if (filter !== "web-novel") response.groups.push(group("light-novel", "Light Novels", lightNovels));
    if (filter !== "light-novel") response.groups.push(group("web-novel", "WebNovels", webNovels));
  }

  if ((filter === "all" || filter === "manga") && tableExists(db, "mangas")) {
    const mangas = db.prepare(`
      SELECT m.id, m.slug, m.title, m.alternative_titles, m.synopsis, m.cover_url, m.cover_local_path,
             m.author, m.artist,
             (SELECT COUNT(*) FROM manga_chapters mc WHERE mc.manga_id = m.id) AS chapter_count,
             CASE
               WHEN lower(m.title) = ? THEN 120
               WHEN lower(m.title) LIKE ? THEN 95
               WHEN lower(m.title) LIKE ? THEN 75
               WHEN lower(m.alternative_titles) LIKE ? THEN 65
               WHEN lower(COALESCE(m.author, '')) LIKE ? THEN 50
               WHEN lower(COALESCE(m.artist, '')) LIKE ? THEN 45
               WHEN lower(m.synopsis) LIKE ? THEN 20
               ELSE 1
             END AS score
      FROM mangas m
      WHERE ${publicVisibleMangaSql("m")} AND (lower(m.title) LIKE ? OR lower(m.alternative_titles) LIKE ? OR lower(m.synopsis) LIKE ? OR
            lower(COALESCE(m.author, '')) LIKE ? OR lower(COALESCE(m.artist, '')) LIKE ?)
      ORDER BY score DESC, m.updated_at DESC
      LIMIT ?
    `).all(exact, starts, like, like, like, like, like, like, like, like, like, like, limit) as any[];

    response.groups.push(group("manga", "Mangás", mangas.map((m) => ({
      id: m.id,
      type: "manga",
      title: m.title,
      subtitle: m.author ? `Mangá · ${m.author}` : "Mangá",
      description: excerpt(m.synopsis, query),
      href: `/manga/${m.slug}`,
      cover: m.cover_local_path || m.cover_url,
      meta: [`${m.chapter_count || 0} caps`],
      score: m.score,
    }))));
  }

  // Busca de livros
  if ((filter === "all" || filter === "books") && tableExists(db, "books")) {
    const books = db.prepare(`
      SELECT id, slug, title, author, synopsis, cover_url, cover_local_path, pages, genres,
        CASE
          WHEN lower(title) = ? THEN 110
          WHEN lower(title) LIKE ? THEN 85
          WHEN lower(title) LIKE ? THEN 60
          WHEN lower(author) LIKE ? THEN 50
          WHEN lower(synopsis) LIKE ? THEN 20
          ELSE 1
        END AS score
      FROM books WHERE is_hidden = 0 AND (
        lower(title) LIKE ? OR lower(author) LIKE ? OR lower(synopsis) LIKE ? OR lower(genres) LIKE ?
      )
      ORDER BY score DESC, created_at DESC
      LIMIT ?
    `).all(exact, starts, like, like, like, like, like, like, like, limit) as any[];
    if (books.length > 0) {
      response.groups.push(group("books", "Livros", books.map((b) => ({
        id: b.id,
        type: "page",
        title: b.title,
        subtitle: b.author ? `Livro · ${b.author}` : "Livro",
        description: excerpt(b.synopsis, query),
        href: `/livros/${b.slug}`,
        cover: b.cover_local_path || b.cover_url,
        meta: [`${b.pages} páginas`],
        score: b.score,
      }))));
    }
  }

  if (filter === "all" || filter === "chapters") {
    const novelChapters = db.prepare(`
      SELECT c.id, c.title, c.chapter_number, c.content, c.word_count,
             n.slug AS novel_slug, n.title AS novel_title, n.alternative_titles AS novel_alternative_titles, n.type AS novel_type,
             CASE
               WHEN lower(c.title) = ? THEN 110
               WHEN lower(c.title) LIKE ? THEN 85
               WHEN lower(c.title) LIKE ? THEN 62
               WHEN lower(c.content) LIKE ? THEN 20
               ELSE 1
             END AS score
      FROM chapters c
      JOIN novels n ON n.id = c.novel_id
      WHERE ${publicReadableNovelSql("n")} AND ${readableNovelChapterSql("c")} AND (lower(c.title) LIKE ? OR lower(c.content) LIKE ? OR lower(n.title) LIKE ?)
      ORDER BY score DESC, c.views DESC, c.published_at DESC
      LIMIT ?
    `).all(exact, starts, like, like, like, like, like, limit) as any[];

    const chapterItems: SearchItem[] = novelChapters.map((c) => ({
      id: c.id,
      type: "chapter",
      title: c.title || `Capítulo ${c.chapter_number}`,
      subtitle: `${readableTitle({ title: c.novel_title, alternative_titles: c.novel_alternative_titles, type: c.novel_type, slug: c.novel_slug })} · Capítulo ${c.chapter_number}`,
      description: excerpt(c.content, query),
      href: `/novels/${c.novel_slug}/${c.chapter_number}`,
      meta: [c.novel_type === "web-novel" ? "WebNovel" : "Light Novel", `${c.word_count || 0} palavras`],
      score: c.score,
    }));

    if (tableExists(db, "manga_chapters") && tableExists(db, "mangas")) {
      const mangaChapters = db.prepare(`
        SELECT mc.id, mc.title, mc.chapter_number, mc.slug,
               m.slug AS manga_slug, m.title AS manga_title,
               CASE
                 WHEN lower(mc.title) = ? THEN 105
                 WHEN lower(mc.title) LIKE ? THEN 82
                 WHEN lower(mc.title) LIKE ? THEN 60
                 WHEN lower(m.title) LIKE ? THEN 45
                 ELSE 1
               END AS score
        FROM manga_chapters mc
        JOIN mangas m ON m.id = mc.manga_id
        WHERE ${publicVisibleMangaSql("m")} AND EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = mc.id AND coalesce(p.image_url, p.local_path, '') <> '') AND (lower(mc.title) LIKE ? OR lower(m.title) LIKE ? OR CAST(mc.chapter_number AS TEXT) LIKE ?)
        ORDER BY score DESC, mc.chapter_number DESC
        LIMIT ?
      `).all(exact, starts, like, like, like, like, like, Math.max(3, Math.floor(limit / 2))) as any[];

      chapterItems.push(...mangaChapters.map((c) => ({
        id: c.id,
        type: "chapter" as const,
        title: c.title || `Capítulo ${c.chapter_number}`,
        subtitle: `${c.manga_title} · Capítulo ${c.chapter_number}`,
        description: "Capítulo de mangá disponível para leitura por páginas.",
        href: `/manga/${c.manga_slug}/${c.slug || c.chapter_number}`,
        meta: ["Mangá"],
        score: c.score,
      })));
    }

    response.groups.push(group("chapters", "Capítulos", chapterItems.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit)));
  }

  if (filter === "all" || filter === "authors") {
    const authors = db.prepare(`
      SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url,
             SUM(CASE WHEN ${publicReadableNovelSql("n")} THEN 1 ELSE 0 END) AS work_count,
             CASE
               WHEN lower(u.username) = ? THEN 100
               WHEN lower(u.display_name) = ? THEN 100
               WHEN lower(u.username) LIKE ? THEN 78
               WHEN lower(u.display_name) LIKE ? THEN 72
               WHEN lower(COALESCE(u.bio, '')) LIKE ? THEN 20
               ELSE 1
             END AS score
      FROM users u
      LEFT JOIN novels n ON n.author_id = u.id
      WHERE lower(u.username) LIKE ? OR lower(u.display_name) LIKE ? OR lower(COALESCE(u.bio, '')) LIKE ?
      GROUP BY u.id
      ORDER BY score DESC, work_count DESC
      LIMIT ?
    `).all(exact, exact, starts, starts, like, like, like, like, limit) as any[];

    response.groups.push(group("authors", "Autores", authors.map((a) => ({
      id: a.id,
      type: "author",
      title: a.display_name,
      subtitle: `@${a.username}`,
      description: a.bio || `${a.work_count || 0} obras publicadas`,
      href: `/authors/${a.username}`,
      cover: a.avatar_url,
      meta: [`${a.work_count || 0} obras`],
      score: a.score,
    }))));
  }

  if (filter === "all" || filter === "genres") {
    const rows = db.prepare(`SELECT genres, tags FROM novels n WHERE ${publicReadableNovelSql("n")} AND (lower(genres) LIKE ? OR lower(tags) LIKE ?) LIMIT 300`).all(like, like) as any[];
    const found = new Map<string, { kind: "Gênero" | "Tag"; count: number; score: number }>();
    for (const row of rows) {
      for (const value of safeJsonArray(row.genres)) {
        if (value.toLowerCase().includes(q)) {
          const curr = found.get(value) || { kind: "Gênero" as const, count: 0, score: 0 };
          curr.count++;
          curr.score = value.toLowerCase() === q ? 100 : value.toLowerCase().startsWith(q) ? 78 : 45;
          found.set(value, curr);
        }
      }
      for (const value of safeJsonArray(row.tags)) {
        if (value.toLowerCase().includes(q)) {
          const curr = found.get(value) || { kind: "Tag" as const, count: 0, score: 0 };
          curr.count++;
          curr.score = value.toLowerCase() === q ? 95 : value.toLowerCase().startsWith(q) ? 72 : 40;
          found.set(value, curr);
        }
      }
    }
    const items = Array.from(found.entries())
      .map(([name, data]) => ({
        id: name,
        type: "genre" as const,
        title: name,
        subtitle: data.kind,
        description: `${data.count} obras relacionadas`,
        href: `/explore?genre=${encodeURIComponent(name)}`,
        meta: [`${data.count} obras`],
        score: data.score + data.count,
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
    response.groups.push(group("genres", "Gêneros e tags", items));
  }

  if (filter === "all" || filter === "pages") {
    response.groups.push(group("pages", "Páginas", pageMatches(query).slice(0, limit)));
  }

  response.groups = response.groups.filter((g) => g.items.length > 0);
  response.total = response.groups.reduce((sum, g) => sum + g.items.length, 0);

  const suggestions = new Set<string>();
  for (const g of response.groups) {
    for (const item of g.items.slice(0, 3)) {
      suggestions.add(item.title);
      for (const meta of item.meta || []) if (meta.length < 24 && !/cap|palavra|obra/i.test(meta)) suggestions.add(meta);
    }
  }
  response.suggestions = Array.from(suggestions).slice(0, 8);

  return NextResponse.json(response);
}
