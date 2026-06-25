import Link from "next/link";
import {
  BookOpen, Search, Filter, Sparkles, Flame, Clock,
  ChevronDown, X, AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;        // manga | manhwa | manhua
    status?: string;      // ongoing | completed | hiatus
    genre?: string;
    sort?: string;        // popular | latest | updated | alphabetical
    page?: string;
  }>;
}

const PAGE_SIZE = 36;

const TYPES = [
  { id: "", label: "Todos" },
  { id: "manga", label: "Mangá" },
  { id: "manhwa", label: "Manhwa" },
  { id: "manhua", label: "Manhua" },
];

const STATUSES = [
  { id: "", label: "Todos status" },
  { id: "ongoing", label: "Em andamento" },
  { id: "completed", label: "Completo" },
  { id: "hiatus", label: "Em hiato" },
];

const SORTS = [
  { id: "popular", label: "Populares" },
  { id: "updated", label: "Atualizados" },
  { id: "latest", label: "Recentes" },
  { id: "alphabetical", label: "A-Z" },
];

const GENRES = [
  "Ação", "Aventura", "Comédia", "Drama", "Fantasia", "Romance",
  "Sistema", "Reencarnação", "Murim", "Slice of Life", "Isekai",
  "Terror", "Histórico", "Sobrenatural", "Esportes", "Mistério",
];

function safeJsonArray(v: string | null | undefined): string[] {
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter(Boolean).map(String) : []; } catch { return []; }
}

function getCover(r: { cover_local_path?: string | null; cover_url?: string | null }) {
  return r.cover_local_path || r.cover_url || "";
}function buildHref(params: Record<string, string | null | undefined>, overrides: Record<string, string | null> = {}): string {
  const merged = { ...params, ...overrides };
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && String(v).length > 0) usp.set(k, String(v));
  }
  const qs = usp.toString();
  return `/manga${qs ? `?${qs}` : ""}`;
}

function hasActiveFilter(params: PageProps["searchParams"] extends Promise<infer T> ? T : any) {
  return !!(params.q || params.type || params.status || params.genre || params.sort && params.sort !== "popular");
}

export default async function MangaCatalogPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const search = (sp.q || "").trim();
  const type = sp.type || "";
  const status = sp.status || "";
  const genre = sp.genre || "";
  const sort = sp.sort || "popular";

  const filterParams = { q: search, type, status, genre, sort };

  let rows: any[] = [];
  let totalFiltered = 0;
  let heroManga: any = null;
  let topNew: any[] = [];
  let topUpdated: any[] = [];

  try {
    const db = getDb();
    db.pragma("max_variables_count = 100000");

    // Build dynamic WHERE
    const where: string[] = ["1=1"];
    const queryParams: any[] = [];
    if (search) {
      where.push("(m.title LIKE ? OR m.synopsis LIKE ? OR m.author LIKE ?)");
      const like = `%${search}%`;
      queryParams.push(like, like, like);
    }
    if (status) {
      where.push("m.status = ?");
      queryParams.push(status);
    }
    if (genre) {
      where.push("m.id IN (SELECT manga_id FROM manga_tags WHERE tag = ?)");
      queryParams.push(genre);
    }

    // ORDER BY
    let orderBy = "chapter_count DESC, m.updated_at DESC";
    if (sort === "latest") orderBy = "m.created_at DESC";
    else if (sort === "alphabetical") orderBy = "m.title COLLATE NOCASE ASC";
    else if (sort === "updated") orderBy = "m.updated_at DESC";

    // Count
    const countSql = `SELECT COUNT(DISTINCT m.id) AS c FROM mangas m WHERE ${where.join(" AND ")}`;
    totalFiltered = (db.prepare(countSql).get(...queryParams) as any).c;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

    // Fetch
    const dataSql = `
      SELECT m.id, m.slug, m.title, m.synopsis, m.cover_url, m.cover_local_path,
             m.author, m.status, m.created_at, m.updated_at,
             (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
      FROM mangas m
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    rows = db.prepare(dataSql).all(...queryParams, PAGE_SIZE, offset) as any[];

    // Hero
    if (page === 1 && !hasActiveFilter(sp)) {
      heroManga = db.prepare(`
        SELECT m.id, m.slug, m.title, m.synopsis, m.cover_url, m.cover_local_path, m.author, m.status,
               (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
        FROM mangas m
        WHERE (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) > 0
        ORDER BY chapter_count DESC LIMIT 1
      `).get() as any;

      topNew = db.prepare(`
        SELECT m.id, m.slug, m.title, m.cover_url, m.cover_local_path, m.status,
               (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
        FROM mangas m WHERE (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) > 0
        ORDER BY m.created_at DESC LIMIT 8
      `).all() as any[];

      topUpdated = db.prepare(`
        SELECT m.id, m.slug, m.title, m.cover_url, m.cover_local_path, m.status,
               (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
        FROM mangas m WHERE (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) > 0
        AND m.updated_at > datetime('now', '-30 days')
        ORDER BY m.updated_at DESC LIMIT 8
      `).all() as any[];
    }

    // Tags dos cards visíveis
    const mangaIds = rows.map(r => r.id);
    const tagsMap = new Map<string, string[]>();
    if (mangaIds.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < mangaIds.length; i += chunkSize) {
        const chunk = mangaIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => "?").join(",");
        const tagRows = db.prepare(`SELECT manga_id, tag FROM manga_tags WHERE manga_id IN (${placeholders})`).all(...chunk) as any[];
        for (const tr of tagRows) {
          if (!tagsMap.has(tr.manga_id)) tagsMap.set(tr.manga_id, []);
          tagsMap.get(tr.manga_id)!.push(tr.tag);
        }
      }
    }

    return (
      <div className="min-h-screen">
        {/* Hero manga (top 1) — só na home sem filtro */}
        {heroManga && page === 1 && !hasActiveFilter(sp) && (
          <section className="relative overflow-hidden border-b border-border/40">
            <div className="absolute inset-0">
              <img src={getCover(heroManga)} alt="" className="h-full w-full object-cover blur-2xl opacity-30 scale-110" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
            </div>
            <div className="container relative mx-auto max-w-7xl px-4 py-12 md:py-16">
              <div className="grid gap-8 md:grid-cols-[260px_1fr] md:items-center">
                <Link href={`/manga/${heroManga.slug}`} className="group block mx-auto md:mx-0">
                  <div className="aspect-[2/3] w-44 md:w-56 overflow-hidden rounded-xl border-2 border-border/60 shadow-2xl shadow-primary/10 transition group-hover:scale-105">
                    <img src={getCover(heroManga)} alt={heroManga.title} className="h-full w-full object-cover" />
                  </div>
                </Link>
                <div className="space-y-4 text-center md:text-left">
                  <Badge variant="secondary" className="gap-1.5">
                    <Sparkles className="h-3 w-3" /> Em destaque
                  </Badge>
                  <h1 className="font-heading text-4xl md:text-6xl font-black tracking-tight">
                    {heroManga.title}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground">
                    {heroManga.author && <span>por <span className="text-foreground font-medium">{heroManga.author}</span></span>}
                    <span>·</span>
                    <span>{heroManga.chapter_count} capítulos</span>
                    {heroManga.status && <><span>·</span><span className="capitalize">{heroManga.status === "ongoing" ? "Em andamento" : heroManga.status}</span></>}
                  </div>
                  {heroManga.synopsis && (
                    <p className="max-w-2xl text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {heroManga.synopsis}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                    <Button asChild size="lg">
                      <Link href={`/manga/${heroManga.slug}`}>Ler agora</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="container mx-auto max-w-7xl px-4 py-6">
          {/* Search bar no topo (estilo mangafire) */}
          <form action="/manga" method="get" className="relative mb-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={search}
              placeholder="Pesquisar mangá, autor, sinopse..."
              className="h-12 w-full rounded-xl border border-border/60 bg-card/60 pl-12 pr-4 outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
            {search && (
              <Link href="/manga" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </Link>
            )}
          </form>

          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* Sidebar de filtros (estilo mangafire) */}
            <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Filter className="h-4 w-4" /> Tipo
                </h3>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  {TYPES.map(t => (
                    <Link key={t.id} href={buildHref(filterParams, { type: t.id || null, page: null })}>
                      <Badge variant={type === t.id ? "default" : "outline"} className="w-full justify-start cursor-pointer px-3 py-1.5">
                        {t.label}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Filter className="h-4 w-4" /> Status
                </h3>
                <div className="flex flex-wrap gap-2 lg:flex-col">
                  {STATUSES.map(s => (
                    <Link key={s.id} href={buildHref(filterParams, { status: s.id || null, page: null })}>
                      <Badge variant={status === s.id ? "default" : "outline"} className="w-full justify-start cursor-pointer px-3 py-1.5">
                        {s.label}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Filter className="h-4 w-4" /> Gêneros
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map(g => (
                    <Link key={g} href={buildHref(filterParams, { genre: g === genre ? null : g, page: null })}>
                      <Badge variant={genre === g ? "default" : "outline"} className="cursor-pointer text-xs">
                        {g}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            {/* Conteúdo principal */}
            <div className="space-y-6">
              {/* Top 10 Populares (só na home sem filtro) */}
              {topUpdated.length > 0 && page === 1 && !hasActiveFilter(sp) && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
                      <Flame className="h-5 w-5 text-orange-500" /> Atualizados Recentemente
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {topUpdated.map(m => (
                      <Link key={m.id} href={`/manga/${m.slug}`} className="group block">
                        <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition hover:shadow-lg">
                          <div className="aspect-[2/3] overflow-hidden bg-muted">
                            <img src={getCover(m)} alt={m.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                          </div>
                          <div className="p-2">
                            <h3 className="font-heading text-xs font-bold line-clamp-1 group-hover:text-primary">{m.title}</h3>
                            <p className="text-[10px] text-muted-foreground">📖 {m.chapter_count}</p>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Header de ordenação + total */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div>
                  <h2 className="font-heading text-lg font-bold">
                    {hasActiveFilter(sp) ? "Resultados" : "Catálogo"}
                  </h2>
                  <p className="text-sm text-muted-foreground">{totalFiltered.toLocaleString("pt-BR")} obras</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {SORTS.map(s => (
                    <Link key={s.id} href={buildHref(filterParams, { sort: s.id, page: null })}>
                      <Badge variant={sort === s.id ? "default" : "outline"} className="cursor-pointer text-xs">
                        {s.label}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Grid principal */}
              {rows.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                  <BookOpen className="h-14 w-14 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-lg font-semibold">Nenhum mangá encontrado</p>
                  <p className="text-sm text-muted-foreground">Tente outros filtros.</p>
                  {hasActiveFilter(sp) && (
                    <Button asChild className="mt-4">
                      <Link href="/manga">Limpar filtros</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {rows.map(r => {
                    const tags = tagsMap.get(r.id) || [];
                    return (
                      <Link key={r.id} href={`/manga/${r.slug}`} className="group block">
                        <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10">
                          <div className="aspect-[2/3] overflow-hidden bg-muted relative">
                            <img src={getCover(r)} alt={r.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                              {r.status === "completed" && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/90 text-white font-bold">✓</span>}
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8">
                              <p className="text-[10px] text-white/90 font-medium">📖 {r.chapter_count} caps</p>
                            </div>
                          </div>
                          <div className="p-2 space-y-1">
                            <h3 className="font-heading text-sm font-bold line-clamp-2 leading-tight group-hover:text-primary min-h-[2.25rem]">
                              {r.title}
                            </h3>
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tags.slice(0, 2).map(t => (
                                  <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 pt-6">
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
            </div>
          </div>
        </div>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="text-center py-20 border border-dashed border-red-500/30 rounded-2xl">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-400 mb-4" />
          <h2 className="font-heading text-xl font-semibold mb-2">Erro ao carregar catálogo</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">{err.message?.slice(0, 200)}</p>
        </div>
      </div>
    );
  }
}
