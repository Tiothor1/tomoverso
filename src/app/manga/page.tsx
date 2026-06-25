import Link from "next/link";
import { ArrowRight, BookOpen, Filter, Flame, Search, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { publicVisibleMangaSql } from "@/lib/public-catalog";

export const revalidate = 120;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    sort?: string; // popular | updated | latest | alphabetical
    page?: string;
  }>;
}

const PAGE_SIZE = 24;

const SORTS = [
  { id: "popular", label: "Populares" },
  { id: "updated", label: "Atualizados" },
  { id: "latest", label: "Recentes" },
  { id: "alphabetical", label: "A-Z" },
];

const GENRES = [
  "Ação", "Aventura", "Comédia", "Drama", "Fantasia", "Romance",
  "Sistema", "Reencarnação", "Murim", "Slice of Life", "Isekai",
  "Terror", "Histórico", "Sobrenatural", "Mistério", "Psicológico",
];

const READABLE_MANGA_EXISTS = `EXISTS (
  SELECT 1
  FROM manga_chapters ch
  JOIN manga_pages p ON p.chapter_id = ch.id
  WHERE ch.manga_id = m.id AND coalesce(p.image_url, p.local_path, '') <> ''
)`;

const PUBLIC_MANGA_SQL = publicVisibleMangaSql("m");

const CHAPTER_COUNT_SQL = `(SELECT COUNT(*) FROM manga_chapters ch
  WHERE ch.manga_id = m.id
    AND EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')
)`;

function getCover(r: { cover_local_path?: string | null; cover_url?: string | null }) {
  return r.cover_local_path || r.cover_url || "";
}

function buildHref(params: Record<string, string | null | undefined>, overrides: Record<string, string | null> = {}): string {
  const merged = { ...params, ...overrides };
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && String(v).length > 0) usp.set(k, String(v));
  }
  const qs = usp.toString();
  return `/manga${qs ? `?${qs}` : ""}`;
}

function hasActiveFilter(params: Awaited<PageProps["searchParams"]>) {
  return Boolean(params.q || params.genre || (params.sort && params.sort !== "popular"));
}

function MangaPoster({ manga, dense = false }: { manga: any; dense?: boolean }) {
  const cover = getCover(manga);
  return (
    <Link href={`/manga/${manga.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-border/45 bg-card/80 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={manga.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-secondary/30 p-3 text-center text-xs text-muted-foreground">
              {manga.title}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2 pt-10">
            <p className="text-[10px] font-semibold text-white/90">{manga.chapter_count} caps</p>
          </div>
        </div>
        <CardContent className={dense ? "p-2.5" : "space-y-1.5 p-3"}>
          <h3 className="line-clamp-2 font-heading text-sm font-bold leading-tight transition group-hover:text-primary">
            {manga.title}
          </h3>
          {!dense && manga.author && (
            <p className="line-clamp-1 text-xs text-muted-foreground">{manga.author}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function MangaCatalogPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const search = (sp.q || "").trim();
  const genre = sp.genre || "";
  const sort = sp.sort || "popular";
  const filterParams = { q: search, genre, sort };

  try {
    const db = getDb();
    db.pragma("max_variables_count = 100000");

    const where: string[] = [PUBLIC_MANGA_SQL];
    const queryParams: any[] = [];
    if (search) {
      where.push("(m.title LIKE ? OR m.synopsis LIKE ? OR m.author LIKE ?)");
      const like = `%${search}%`;
      queryParams.push(like, like, like);
    }
    if (genre) {
      where.push("m.id IN (SELECT manga_id FROM manga_tags WHERE tag = ?)");
      queryParams.push(genre);
    }

    let orderBy = "chapter_count DESC, m.updated_at DESC";
    if (sort === "latest") orderBy = "m.created_at DESC";
    else if (sort === "alphabetical") orderBy = "m.title COLLATE NOCASE ASC";
    else if (sort === "updated") orderBy = "m.updated_at DESC, chapter_count DESC";

    const totalFiltered = (db.prepare(`SELECT COUNT(DISTINCT m.id) AS c FROM mangas m WHERE ${where.join(" AND ")}`).get(...queryParams) as any).c;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

    const rows = db.prepare(`
      SELECT m.id, m.slug, m.title, m.synopsis, m.cover_url, m.cover_local_path,
             m.author, m.created_at, m.updated_at,
             ${CHAPTER_COUNT_SQL} AS chapter_count
      FROM mangas m
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...queryParams, PAGE_SIZE, offset) as any[];

    const stats = {
      mangas: (db.prepare(`SELECT COUNT(*) AS c FROM mangas m WHERE ${PUBLIC_MANGA_SQL}`).get() as any).c,
      chapters: (db.prepare(`SELECT COUNT(*) AS c FROM manga_chapters ch WHERE EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')`).get() as any).c,
    };

    const heroManga = page === 1 && !hasActiveFilter(sp)
      ? db.prepare(`
          SELECT m.id, m.slug, m.title, m.synopsis, m.cover_url, m.cover_local_path, m.author,
                 ${CHAPTER_COUNT_SQL} AS chapter_count
          FROM mangas m
          WHERE ${PUBLIC_MANGA_SQL}
          ORDER BY chapter_count DESC LIMIT 1
        `).get() as any
      : null;

    const featured = page === 1 && !hasActiveFilter(sp)
      ? db.prepare(`
          SELECT m.id, m.slug, m.title, m.cover_url, m.cover_local_path, m.author,
                 ${CHAPTER_COUNT_SQL} AS chapter_count
          FROM mangas m
          WHERE ${PUBLIC_MANGA_SQL}
          ORDER BY chapter_count DESC, m.title COLLATE NOCASE ASC
          LIMIT 8
        `).all() as any[]
      : [];

    const topGenres = db.prepare(`
      SELECT mt.tag, COUNT(*) c
      FROM manga_tags mt
      JOIN mangas m ON m.id = mt.manga_id
      WHERE ${PUBLIC_MANGA_SQL}
      GROUP BY mt.tag
      ORDER BY c DESC, mt.tag ASC
      LIMIT 18
    `).all() as Array<{ tag: string; c: number }>;

    return (
      <main className="min-h-screen">
        <section className="border-b border-border/40 bg-gradient-to-b from-primary/8 via-background to-background">
          <div className="container mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1fr_260px] md:items-center md:py-12">
            <div className="space-y-5">
              <Badge variant="secondary" className="gap-2 rounded-full px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" /> {stats.mangas} obras · {stats.chapters.toLocaleString("pt-BR")} capítulos com páginas
              </Badge>
              <div className="space-y-2">
                <h1 className="font-heading text-4xl font-black tracking-tight md:text-6xl">
                  Mangás, manhwas e manhuas
                </h1>
                <p className="max-w-2xl text-muted-foreground">
                  Catálogo limpo: só aparece obra que tem capítulo com páginas para ler.
                </p>
              </div>
              <form action="/manga" method="get" className="relative max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={search}
                  placeholder="Pesquisar título, autor ou sinopse..."
                  className="h-14 w-full rounded-2xl border border-border/60 bg-card/85 pl-12 pr-14 text-base shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />
                {search ? (
                  <Link href="/manga" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-4 w-4" />
                  </Link>
                ) : null}
              </form>
              <div className="flex flex-wrap gap-2">
                {topGenres.slice(0, 8).map(g => (
                  <Link key={g.tag} href={buildHref(filterParams, { genre: g.tag, page: null })}>
                    <Badge variant={genre === g.tag ? "default" : "outline"} className="rounded-full px-3 py-1">
                      {g.tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>

            {heroManga && (
              <Link href={`/manga/${heroManga.slug}`} className="group hidden md:block">
                <Card className="overflow-hidden border-primary/20 bg-card/80 shadow-2xl shadow-primary/10 transition group-hover:-translate-y-1">
                  <div className="relative aspect-[2/3] bg-muted">
                    {getCover(heroManga) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getCover(heroManga)} alt={heroManga.title} className="h-full w-full object-cover" />
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 pt-16">
                      <p className="line-clamp-2 text-sm font-bold text-white">{heroManga.title}</p>
                      <p className="mt-1 text-xs text-white/75">{heroManga.chapter_count} capítulos</p>
                    </div>
                  </div>
                </Card>
              </Link>
            )}
          </div>
        </section>

        <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
          {featured.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
                  <Flame className="h-5 w-5 text-orange-500" /> Mais extensos
                </h2>
                <Link href={buildHref(filterParams, { sort: "popular", page: null })} className="text-sm font-medium text-primary hover:underline">
                  Ver catálogo <ArrowRight className="ml-1 inline h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {featured.map(m => <MangaPoster key={m.id} manga={m} dense />)}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/45 bg-card/55 p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold">{hasActiveFilter(sp) ? "Resultados" : "Catálogo"}</h2>
                <p className="text-sm text-muted-foreground">{totalFiltered.toLocaleString("pt-BR")} obras com leitura disponível</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Ordenar</span>
                {SORTS.map(s => (
                  <Link key={s.id} href={buildHref(filterParams, { sort: s.id, page: null })}>
                    <Badge variant={sort === s.id ? "default" : "outline"} className="cursor-pointer rounded-full">
                      {s.label}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>

            {genre && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Filtro:</span>
                <Badge>{genre}</Badge>
                <Button variant="ghost" size="sm" asChild><Link href={buildHref(filterParams, { genre: null, page: null })}>limpar</Link></Button>
              </div>
            )}

            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 py-16 text-center">
                <BookOpen className="mx-auto mb-3 h-14 w-14 text-muted-foreground/30" />
                <p className="text-lg font-semibold">Nenhum resultado</p>
                <p className="text-sm text-muted-foreground">Tente outro termo ou limpe os filtros.</p>
                <Button asChild className="mt-4"><Link href="/manga">Limpar filtros</Link></Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {rows.map(r => <MangaPoster key={r.id} manga={r} />)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-4">
                {page > 1 && (
                  <Link href={buildHref(filterParams, { page: String(page - 1) })}>
                    <Button variant="outline" size="sm">Anterior</Button>
                  </Link>
                )}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let n: number;
                  if (totalPages <= 7) n = i + 1;
                  else if (page <= 4) n = i + 1;
                  else if (page >= totalPages - 3) n = totalPages - 6 + i;
                  else n = page - 3 + i;
                  return (
                    <Link key={n} href={buildHref(filterParams, { page: String(n) })}>
                      <Button variant={n === page ? "default" : "ghost"} size="sm" className="min-w-[2.5rem]">
                        {n}
                      </Button>
                    </Link>
                  );
                })}
                {page < totalPages && (
                  <Link href={buildHref(filterParams, { page: String(page + 1) })}>
                    <Button variant="outline" size="sm">Próxima</Button>
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  } catch (err: any) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl border border-dashed border-red-500/30 py-20 text-center">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-red-400" />
          <h2 className="mb-2 font-heading text-xl font-semibold">Erro ao carregar catálogo</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{err.message?.slice(0, 200)}</p>
        </div>
      </div>
    );
  }
}
