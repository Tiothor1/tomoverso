export const revalidate = 120;

import Link from "next/link";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Filter, LibraryBig, PenLine, Search, SlidersHorizontal, Sparkles, Tags, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MangaCard } from "@/components/manga/manga-card";
import { NovelCard } from "@/components/novel/novel-card";
import { SaveWorkButton } from "@/components/work/save-work-button";
import { getDb } from "@/lib/db";
import { readableTitle } from "@/lib/display-title";
import { publicVisibleMangaSql, publicVisibleNovelSql } from "@/lib/public-catalog";

export const metadata = {
  title: "Catálogo — Tomo Verso Editora",
};

const PAGE_SIZE = 24;

type KindFilter = "all" | "novel" | "manga" | "manhwa" | "book";
type SortFilter = "popular" | "recent" | "chapters" | "title";
type StatusFilter = "all" | "ongoing" | "completed" | "hiatus" | "dropped";

interface SearchParams {
  q?: string;
  kind?: KindFilter;
  original?: string;
  popular?: string;
  recent?: string;
  status?: StatusFilter;
  genre?: string;
  tag?: string;
  author?: string;
  minChapters?: string;
  sort?: SortFilter;
  page?: string;
}

type CatalogItem = {
  id: string;
  itemType: "novel" | "manga" | "book";
  displayKind: "Novel" | "Mangá" | "Manhwa" | "Livro";
  slug: string;
  title: string;
  author: string;
  synopsis: string;
  cover_url: string | null;
  cover_local_path: string | null;
  genres: string[];
  tags: string[];
  status: "ongoing" | "completed" | "hiatus" | "dropped";
  chapter_count: number;
  views: number;
  is_original: boolean;
  is_hot: boolean;
  created_at: string;
  updated_at: string;
  href: string;
  raw: any;
};

function safeJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function tableExists(db: ReturnType<typeof getDb>, table: string) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));
}

function normalizeText(value: string | null | undefined) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function statusLabel(status: CatalogItem["status"]) {
  const labels = {
    ongoing: "Em andamento",
    completed: "Completo",
    hiatus: "Hiato",
    dropped: "Pausado",
  };
  return labels[status] || "Em andamento";
}

function buildHref(base: SearchParams, overrides: Partial<SearchParams | Record<string, string | null | undefined>> = {}) {
  const merged = { ...base, ...overrides } as Record<string, string | null | undefined>;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (!value || value === "all" || value === "0") continue;
    if (key === "page" && value === "1") continue;
    params.set(key, value);
  }
  const qs = params.toString();
  return `/explore${qs ? `?${qs}` : ""}`;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function isProbablyManhwa(row: { title?: string | null; tags?: string[]; source?: string | null }) {
  const haystack = normalizeText(`${row.title || ""} ${(row.tags || []).join(" ")} ${row.source || ""}`);
  return /manhwa|manhua|lookism|solo leveling|nano machine|eleceed|murim|tower|omniscient|skeleton|mercenary|dandadan|blue lock/.test(haystack);
}

function parseNovelRow(row: any): CatalogItem {
  const alternative_titles = safeJsonArray(row.alternative_titles);
  const title = readableTitle({
    title: row.title,
    title_en: row.title_en,
    title_jp: row.title_jp,
    alternative_titles,
    type: row.type,
    slug: row.slug,
  });
  const genres = safeJsonArray(row.genres);
  const tags = safeJsonArray(row.tags);
  const chapterCount = Number(row.chapter_count || 0);
  const views = Number(row.views || 0);
  const isOriginal = Boolean(row.is_original) || row.source === "tomoverso" || row.source === "original";
  const isHot = Boolean(row.is_featured) || views >= 1000 || chapterCount >= 20;

  return {
    id: row.id,
    itemType: "novel",
    displayKind: row.type === "visual-novel" ? "Novel" : "Novel",
    slug: row.slug,
    title,
    author: row.author_name || "Tomo Verso",
    synopsis: row.synopsis || "",
    cover_url: row.cover_url || null,
    cover_local_path: row.cover_local_path || null,
    genres,
    tags,
    status: row.status || "ongoing",
    chapter_count: chapterCount,
    views,
    is_original: isOriginal,
    is_hot: isHot,
    created_at: row.created_at || "",
    updated_at: row.updated_at || row.created_at || "",
    href: `/novels/${row.slug}`,
    raw: {
      ...row,
      title,
      title_en: row.title_en || null,
      title_jp: row.title_jp || null,
      alternative_titles,
      genres,
      tags,
      rating_avg: row.rating_count > 0 ? Number(row.rating_sum || 0) / Number(row.rating_count || 1) : 0,
      chapter_count: chapterCount,
      is_featured: Boolean(row.is_featured),
      is_approved: true,
      is_original: isOriginal,
      updated_at: row.updated_at || row.created_at || "",
    },
  };
}

function parseMangaRow(row: any): CatalogItem {
  const tags = safeJsonArray(row.tags);
  const chapterCount = Number(row.chapter_count || 0);
  const views = Number(row.views || 0);
  const isManhwa = isProbablyManhwa({ title: row.title, tags, source: row.source });
  const isOriginal = Boolean(row.is_original) || row.source === "tomoverso" || row.source === "original";
  const isHot = Boolean(row.is_featured) || views >= 1000 || chapterCount >= 100;

  return {
    id: row.id,
    itemType: "manga",
    displayKind: isManhwa ? "Manhwa" : "Mangá",
    slug: row.slug,
    title: row.title,
    author: row.author || row.artist || "Equipe editorial",
    synopsis: row.synopsis || "",
    cover_url: row.cover_url || null,
    cover_local_path: row.cover_local_path || null,
    genres: tags,
    tags,
    status: row.status || "ongoing",
    chapter_count: chapterCount,
    views,
    is_original: isOriginal,
    is_hot: isHot,
    created_at: row.created_at || "",
    updated_at: row.updated_at || row.created_at || "",
    href: `/manga/${row.slug}`,
    raw: {
      ...row,
      alternative_titles: [],
      tags: tags.length ? tags : [isManhwa ? "Manhwa" : "Mangá"],
      chapter_count: chapterCount,
      is_original: isOriginal,
      engagement_score: isHot ? 100 : 0,
    },
  };
}

function parseBookRow(row: any): CatalogItem {
  const genres = safeJsonArray(row.genres);
  const pages = Number(row.pages || 0);
  return {
    id: row.id,
    itemType: "book",
    displayKind: "Livro",
    slug: row.slug,
    title: row.title,
    author: row.author || "Autor desconhecido",
    synopsis: row.synopsis || "",
    cover_url: row.cover_url || null,
    cover_local_path: row.cover_local_path || null,
    genres,
    tags: genres,
    status: "completed",
    chapter_count: pages,
    views: 0,
    is_original: Boolean(row.is_featured),
    is_hot: Boolean(row.is_featured),
    created_at: row.created_at || "",
    updated_at: row.updated_at || row.created_at || "",
    href: `/livros/${row.slug}`,
    raw: row,
  };
}

function loadItems(db: ReturnType<typeof getDb>): CatalogItem[] {
  const items: CatalogItem[] = [];

  const novelRows = db.prepare(`
    SELECT n.id, n.slug, n.title, n.title_en, n.title_jp, n.alternative_titles, n.synopsis,
           n.cover_url, n.cover_local_path, n.author_id, n.type, n.status, n.genres, n.tags,
           n.views, n.rating_sum, n.rating_count, n.is_featured, n.source, n.created_at, n.updated_at,
           u.display_name AS author_name,
           (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND COALESCE(c.word_count, 0) > 30) AS chapter_count,
           EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='novel' AND cc.item_id = n.id AND COALESCE(cc.is_original,0)=1) AS is_original
    FROM novels n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE ${publicVisibleNovelSql("n")}
    LIMIT 600
  `).all() as any[];
  items.push(...novelRows.map(parseNovelRow));

  if (tableExists(db, "mangas")) {
    const mangaRows = db.prepare(`
      SELECT m.id, m.slug, m.title, m.synopsis, m.cover_url, m.cover_local_path, m.author, m.artist,
             m.status, m.source, m.source_url, m.created_at, m.updated_at,
             (SELECT COUNT(*) FROM manga_chapters ch WHERE ch.manga_id = m.id AND EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND COALESCE(p.image_url, p.local_path, '') <> '')) AS chapter_count,
             COALESCE((SELECT json_group_array(mt.tag) FROM manga_tags mt WHERE mt.manga_id = m.id), '[]') AS tags,
             EXISTS (SELECT 1 FROM catalog_controls cc WHERE cc.item_type='manga' AND cc.item_id = m.id AND COALESCE(cc.is_original,0)=1) AS is_original
      FROM mangas m
      WHERE ${publicVisibleMangaSql("m")}
      LIMIT 400
    `).all() as any[];
    items.push(...mangaRows.map(parseMangaRow));
  }

  if (tableExists(db, "books")) {
    const bookRows = db.prepare(`
      SELECT id, slug, title, author, synopsis, cover_url, cover_local_path, genres, pages, is_featured, created_at, updated_at
      FROM books
      WHERE COALESCE(is_hidden, 0) = 0
      LIMIT 400
    `).all() as any[];
    items.push(...bookRows.map(parseBookRow));
  }

  return items;
}

function filterItems(items: CatalogItem[], sp: SearchParams) {
  const q = normalizeText(sp.q);
  const kind = sp.kind || "all";
  const status = sp.status || "all";
  const genre = normalizeText(sp.genre);
  const tag = normalizeText(sp.tag);
  const author = normalizeText(sp.author);
  const minChapters = Math.max(0, parseInt(sp.minChapters || "0", 10) || 0);
  const originalOnly = sp.original === "1";
  const popularOnly = sp.popular === "1";
  const recentOnly = sp.recent === "1";

  return items.filter((item) => {
    if (kind === "novel" && item.itemType !== "novel") return false;
    if (kind === "book" && item.itemType !== "book") return false;
    if (kind === "manga" && !(item.itemType === "manga" && item.displayKind === "Mangá")) return false;
    if (kind === "manhwa" && !(item.itemType === "manga" && item.displayKind === "Manhwa")) return false;
    if (originalOnly && !item.is_original) return false;
    if (popularOnly && !item.is_hot) return false;
    if (status !== "all" && item.status !== status) return false;
    if (genre && !item.genres.some((g) => normalizeText(g).includes(genre))) return false;
    if (tag && !item.tags.some((t) => normalizeText(t).includes(tag)) && !normalizeText(item.displayKind).includes(tag)) return false;
    if (author && !normalizeText(item.author).includes(author)) return false;
    if (minChapters && item.chapter_count < minChapters) return false;
    if (recentOnly && Date.now() - new Date(item.created_at || item.updated_at || 0).getTime() > 1000 * 60 * 60 * 24 * 90) return false;
    if (q) {
      const haystack = normalizeText(`${item.title} ${item.author} ${item.synopsis} ${item.genres.join(" ")} ${item.tags.join(" ")}`);
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function sortItems(items: CatalogItem[], sort: SortFilter) {
  const list = [...items];
  if (sort === "title") return list.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  if (sort === "chapters") return list.sort((a, b) => b.chapter_count - a.chapter_count || a.title.localeCompare(b.title, "pt-BR"));
  if (sort === "recent") return list.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  return list.sort((a, b) => Number(b.is_hot) - Number(a.is_hot) || b.views - a.views || b.chapter_count - a.chapter_count);
}

function genreOptions(items: CatalogItem[]) {
  const map = new Map<string, number>();
  for (const item of items) for (const g of item.genres) map.set(g, (map.get(g) || 0) + 1);
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).slice(0, 18);
}

function tagOptions(items: CatalogItem[]) {
  const map = new Map<string, number>();
  for (const item of items) for (const t of item.tags) map.set(t, (map.get(t) || 0) + 1);
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")).slice(0, 18);
}

function BookCatalogCard({ item }: { item: CatalogItem }) {
  const cover = item.cover_local_path || item.cover_url;
  return (
    <Card className="neon-card group/work-card flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-primary/35">
      <Link href={item.href} className="relative block overflow-hidden bg-muted">
        <div className="aspect-[2/3]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={item.title} loading="lazy" className="story-cover h-full w-full object-cover transition duration-500 group-hover/work-card:scale-[1.04]" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-muted p-4 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/82 via-transparent to-black/25 opacity-80" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {item.is_original ? <Badge className="bg-primary/92 text-primary-foreground"><Sparkles className="h-3 w-3" /> Original</Badge> : null}
          <Badge variant="secondary" className="bg-amber-300/15 text-amber-100">Livro</Badge>
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <Badge variant="outline" className="h-6 rounded-full border-sky-300/25 bg-sky-300/10 px-2 text-[10px] text-sky-100">Completo</Badge>
          <span className="rounded-full border border-white/15 bg-black/45 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">{item.chapter_count} págs</span>
        </div>
      </Link>
      <CardContent className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
        <Link href={item.href}>
          <h3 className="line-clamp-2 font-heading text-base font-black leading-tight transition-colors group-hover/work-card:text-primary sm:text-lg">{item.title}</h3>
        </Link>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><PenLine className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{item.author}</span></p>
        <div className="flex min-h-5 flex-wrap gap-1.5">
          {(item.tags.length ? item.tags : ["Livro"]).slice(0, 3).map((tag) => <Badge key={tag} variant="secondary" className="max-w-full truncate text-[10px]">{tag}</Badge>)}
        </div>
        {item.synopsis ? <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.synopsis}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><BookOpen className="h-3.5 w-3.5 text-primary" />{item.chapter_count} páginas</span>
          <div className="flex gap-2">
            <Button asChild size="sm" className="h-8 rounded-full px-3"><Link href={item.href}>Ler</Link></Button>
            <SaveWorkButton id={item.id} type="book" title={item.title} compact />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CatalogCard({ item }: { item: CatalogItem }) {
  if (item.itemType === "novel") return <NovelCard novel={item.raw} variant="compact" />;
  if (item.itemType === "manga") return <MangaCard manga={item.raw} />;
  return <BookCatalogCard item={item} />;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const sort = (sp.sort || "popular") as SortFilter;
  const db = getDb();
  const allItems = loadItems(db);
  const filtered = sortItems(filterItems(allItems, sp), sort);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const genres = genreOptions(allItems);
  const tags = tagOptions(allItems);
  const stats = {
    all: allItems.length,
    novel: allItems.filter((i) => i.itemType === "novel").length,
    manga: allItems.filter((i) => i.itemType === "manga" && i.displayKind === "Mangá").length,
    manhwa: allItems.filter((i) => i.itemType === "manga" && i.displayKind === "Manhwa").length,
    book: allItems.filter((i) => i.itemType === "book").length,
    originals: allItems.filter((i) => i.is_original).length,
    hot: allItems.filter((i) => i.is_hot).length,
  };
  const activeCount = [sp.q, sp.kind && sp.kind !== "all" ? sp.kind : "", sp.original, sp.popular, sp.recent, sp.status && sp.status !== "all" ? sp.status : "", sp.genre, sp.tag, sp.author, sp.minChapters].filter(Boolean).length;

  return (
    <main className="aurora-bg min-h-screen">
      <section className="border-b border-border/50 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto max-w-7xl px-4 py-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
            <div className="space-y-5">
              <Badge variant="secondary" className="gap-2 rounded-full px-3 py-1"><LibraryBig className="h-3.5 w-3.5" /> Catálogo unificado · {stats.all.toLocaleString("pt-BR")} obras</Badge>
              <div className="space-y-3">
                <h1 className="gradient-text font-heading text-4xl font-black tracking-tight md:text-6xl">Encontre sua próxima leitura.</h1>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">Novels, mangás, manhwas e livros em uma única estante — com busca rápida, filtros editoriais e cards feitos para descobrir obra nova sem esforço.</p>
              </div>
              <form action="/explore" className="glass-panel grid gap-2 rounded-3xl p-2 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/80" />
                  <input name="q" defaultValue={sp.q || ""} placeholder="Buscar título, autor, gênero, tag..." className="h-12 w-full rounded-2xl border border-border/50 bg-background/55 pl-12 pr-4 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/15 md:h-14 md:text-base" />
                </div>
                <Button size="lg" className="rounded-2xl"><Search className="h-4 w-4" /> Buscar</Button>
                {sp.kind && sp.kind !== "all" ? <input type="hidden" name="kind" value={sp.kind} /> : null}
                {sp.sort ? <input type="hidden" name="sort" value={sp.sort} /> : null}
              </form>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4 lg:grid-cols-2">
              <Stat label="Novels" value={stats.novel} />
              <Stat label="Mangás" value={stats.manga} />
              <Stat label="Manhwas" value={stats.manhwa} />
              <Stat label="Livros" value={stats.book} />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="glass-panel rounded-3xl p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-xl font-black"><SlidersHorizontal className="h-5 w-5 text-primary" /> Filtros de descoberta</h2>
              <p className="text-sm text-muted-foreground">Combine tipo, status, gênero, autor e tamanho da obra.</p>
            </div>
            {activeCount > 0 ? <Button variant="outline" asChild><Link href="/explore"><X className="h-4 w-4" /> Limpar filtros</Link></Button> : null}
          </div>

          <div className="space-y-4">
            <FilterRow label="Tipo">
              <Chip href={buildHref(sp, { kind: null, page: null })} active={!sp.kind || sp.kind === "all"}>Todos</Chip>
              <Chip href={buildHref(sp, { kind: "novel", page: null })} active={sp.kind === "novel"}>Novels</Chip>
              <Chip href={buildHref(sp, { kind: "manga", page: null })} active={sp.kind === "manga"}>Mangás</Chip>
              <Chip href={buildHref(sp, { kind: "manhwa", page: null })} active={sp.kind === "manhwa"}>Manhwas</Chip>
              <Chip href={buildHref(sp, { kind: "book", page: null })} active={sp.kind === "book"}>Livros</Chip>
            </FilterRow>

            <FilterRow label="Curadoria">
              <Chip href={buildHref(sp, { original: sp.original === "1" ? null : "1", page: null })} active={sp.original === "1"}>Originais ({stats.originals})</Chip>
              <Chip href={buildHref(sp, { popular: sp.popular === "1" ? null : "1", page: null })} active={sp.popular === "1"}>Populares ({stats.hot})</Chip>
              <Chip href={buildHref(sp, { recent: sp.recent === "1" ? null : "1", page: null })} active={sp.recent === "1"}>Recentes</Chip>
            </FilterRow>

            <FilterRow label="Status">
              <Chip href={buildHref(sp, { status: null, page: null })} active={!sp.status || sp.status === "all"}>Todos</Chip>
              <Chip href={buildHref(sp, { status: "ongoing", page: null })} active={sp.status === "ongoing"}>Em andamento</Chip>
              <Chip href={buildHref(sp, { status: "completed", page: null })} active={sp.status === "completed"}>Completos</Chip>
              <Chip href={buildHref(sp, { status: "hiatus", page: null })} active={sp.status === "hiatus"}>Hiato</Chip>
            </FilterRow>

            <FilterRow label="Gênero">
              <Chip href={buildHref(sp, { genre: null, page: null })} active={!sp.genre}>Todos</Chip>
              {genres.slice(0, 12).map(([genre]) => <Chip key={genre} href={buildHref(sp, { genre, page: null })} active={sp.genre === genre}>{genre}</Chip>)}
            </FilterRow>

            <FilterRow label="Tags">
              <Chip href={buildHref(sp, { tag: null, page: null })} active={!sp.tag}>Todas</Chip>
              {tags.slice(0, 10).map(([tag]) => <Chip key={tag} href={buildHref(sp, { tag, page: null })} active={sp.tag === tag}>{tag}</Chip>)}
            </FilterRow>

            <form action="/explore" className="grid gap-3 border-t border-border/50 pt-4 md:grid-cols-[1fr_180px_180px_160px_auto]">
              <input type="hidden" name="kind" value={sp.kind || ""} />
              <input type="hidden" name="genre" value={sp.genre || ""} />
              <input type="hidden" name="tag" value={sp.tag || ""} />
              <input type="hidden" name="status" value={sp.status || ""} />
              <input type="hidden" name="original" value={sp.original || ""} />
              <input type="hidden" name="popular" value={sp.popular || ""} />
              <input type="hidden" name="recent" value={sp.recent || ""} />
              <label className="space-y-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <span>Busca rápida</span>
                <input name="q" defaultValue={sp.q || ""} placeholder="Título, autor, gênero..." className="h-10 w-full rounded-xl border border-input bg-background/55 px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary/60" />
              </label>
              <label className="space-y-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <span>Autor</span>
                <input name="author" defaultValue={sp.author || ""} placeholder="Nome do autor" className="h-10 w-full rounded-xl border border-input bg-background/55 px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary/60" />
              </label>
              <label className="space-y-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <span>Número de capítulos</span>
                <input name="minChapters" type="number" min="0" defaultValue={sp.minChapters || ""} placeholder="Mínimo" className="h-10 w-full rounded-xl border border-input bg-background/55 px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary/60" />
              </label>
              <label className="space-y-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <span>Ordenação</span>
                <select name="sort" defaultValue={sort} className="h-10 w-full rounded-xl border border-input bg-background/55 px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary/60">
                <option value="popular">Populares</option>
                <option value="recent">Recentes</option>
                <option value="chapters">Mais capítulos</option>
                <option value="title">A-Z</option>
                </select>
              </label>
              <Button type="submit" className="self-end rounded-xl"><Filter className="h-4 w-4" /> Aplicar</Button>
            </form>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="secondary" className="mb-2 rounded-full">{filtered.length.toLocaleString("pt-BR")} resultado{filtered.length === 1 ? "" : "s"}</Badge>
              <h2 className="font-heading text-2xl font-black md:text-3xl">Descobrir obras</h2>
              <p className="text-sm text-muted-foreground">Cards organizados para comparar capa, autor, status, tags e tamanho da leitura.</p>
            </div>
            <div className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</div>
          </div>

          {pageItems.length === 0 ? (
            <div className="glass-panel rounded-3xl border-dashed py-16 text-center">
              <BookOpen className="mx-auto mb-4 h-14 w-14 text-primary/70" />
              <h3 className="font-heading text-xl font-black">Nada encontrado nessa combinação.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Tente limpar algum filtro ou buscar por outro título, autor, gênero ou tag.</p>
              <Button asChild className="mt-5 rounded-2xl"><Link href="/explore">Ver catálogo completo</Link></Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageItems.map((item) => <CatalogCard key={`${item.itemType}-${item.id}`} item={item} />)}
            </div>
          )}
        </section>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <Button asChild variant="outline" size="sm" className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Link href={buildHref(sp, { page: String(Math.max(1, currentPage - 1)) })}><ChevronLeft className="h-4 w-4" /> Anterior</Link>
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const n = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
              return <Button key={n} asChild variant={n === currentPage ? "default" : "ghost"} size="sm" className="min-w-10"><Link href={buildHref(sp, { page: String(n) })}>{n}</Link></Button>;
            })}
            <Button asChild variant="outline" size="sm" className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}>
              <Link href={buildHref(sp, { page: String(Math.min(totalPages, currentPage + 1)) })}>Próxima <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="font-heading text-2xl font-black text-foreground">{compactNumber(value)}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 md:grid-cols-[110px_1fr] md:items-start">
      <div className="flex items-center gap-1.5 pt-1 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground"><Tags className="h-3.5 w-3.5 text-primary" />{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false}>
      <Badge variant={active ? "default" : "outline"} className="cursor-pointer rounded-full px-3 py-1 text-xs transition hover:border-primary/50 hover:bg-primary/10">
        {children}
      </Badge>
    </Link>
  );
}
