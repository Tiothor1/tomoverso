import Link from "next/link";
import { BookOpen, AlertTriangle, Filter, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ genre?: string; page?: string }>;
}

const ALL_GENRES = [
  "Ação", "Aventura", "Comédia", "Drama", "Fantasia", "Romance",
  "Sci-Fi", "Slice of Life", "Sobrenatural", "Terror", "Isekai",
  "Murim", "Histórico", "Mecha", "Psicológico", "Shounen", "Seinen",
  "Shoujo", "Ecchi", "Harem", "Esportes",
];

const statusColors: Record<string, string> = {
  ongoing: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  hiatus: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  dropped: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PAGE_SIZE = 60;

function buildHref(genre: string | null, page: number): string {
  const params = new URLSearchParams();
  if (genre) params.set("genre", genre);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/manga${qs ? `?${qs}` : ""}`;
}

export default async function MangaCatalogPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const activeGenre = sp.genre || null;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let rows: any[] = [];
  let allTags: Array<{ tag: string; count: number }> = [];
  let totalFiltered = 0;

  try {
    const db = getDb();
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mangas'").get();
    if (!tableExists) {
      return (
        <div className="container mx-auto max-w-7xl px-4 py-10">
          <div className="text-center py-20 border border-dashed border-red-500/30 rounded-2xl">
            <AlertTriangle className="h-16 w-16 mx-auto text-red-400 mb-4" />
            <h2 className="font-heading text-xl font-semibold mb-2">Banco de dados incompleto</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">A tabela de mangás não foi encontrada.</p>
            <code className="bg-muted px-3 py-1 rounded text-sm">npm run migrate</code>
          </div>
        </div>
      );
    }

    // Get all tags with counts
    allTags = db.prepare("SELECT tag, COUNT(*) as count FROM manga_tags GROUP BY tag ORDER BY count DESC, tag ASC").all() as any[];
    const topTags = allTags.slice(0, 12).map(t => t.tag);

    // Count total (for pagination)
    const countSql = activeGenre
      ? "SELECT COUNT(*) as c FROM mangas m INNER JOIN manga_tags mt ON mt.manga_id = m.id AND mt.tag = ?"
      : "SELECT COUNT(*) as c FROM mangas m";
    totalFiltered = (db.prepare(countSql).get(activeGenre ? activeGenre : null) as any).c;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

    // Query mangas with optional genre filter
    const genreJoin = activeGenre
      ? `INNER JOIN manga_tags mt ON mt.manga_id = m.id AND mt.tag = ?`
      : "";

    const params: any[] = [];
    if (activeGenre) params.push(activeGenre);
    params.push(PAGE_SIZE, offset);

    rows = db.prepare(`
      SELECT m.id, m.slug, m.title, m.synopsis,
             m.cover_url, m.cover_local_path, m.author,
             m.status,
             (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
      FROM mangas m
      ${genreJoin}
      ORDER BY chapter_count DESC, m.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params) as any[];

    // Get tags for displayed mangas
    const mangaIds = rows.map(r => r.id);
    const tagsMap = new Map<string, string[]>();
    if (mangaIds.length > 0) {
      const placeholders = mangaIds.map(() => "?").join(",");
      const tagRows = db.prepare(`SELECT manga_id, tag FROM manga_tags WHERE manga_id IN (${placeholders}) ORDER BY tag`).all(...mangaIds) as any[];
      for (const tr of tagRows) {
        if (!tagsMap.has(tr.manga_id)) tagsMap.set(tr.manga_id, []);
        tagsMap.get(tr.manga_id)!.push(tr.tag);
      }
    }

    // Top manga for hero
    const heroManga = rows[0];

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(180,130,70,0.08),transparent_30rem)]">
        <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12 space-y-8">

          <div className="space-y-2">
            <Badge variant="secondary" className="mb-1">Catálogo</Badge>
            <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tight">Mangás</h1>
            <p className="text-muted-foreground text-lg">{rows.length} obras disponíveis para ler</p>
          </div>

          {/* Genre Filter — estilo Crunchyroll */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filtrar por gênero</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/manga" prefetch={false}>
                <Badge variant={!activeGenre ? "default" : "outline"} className="cursor-pointer px-3 py-1.5 text-sm">
                  Todos
                </Badge>
              </Link>
              {topTags.map(tag => {
                const count = allTags.find(t => t.tag === tag)?.count || 0;
                return (
                  <Link key={tag} href={`/manga?genre=${encodeURIComponent(tag)}`} prefetch={false}>
                    <Badge
                      variant={activeGenre === tag ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1.5 text-sm transition-all hover:bg-primary/20"
                    >
                      {tag} <span className="ml-1 text-xs opacity-60">{count}</span>
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="font-heading text-xl font-semibold mb-2">Nenhum mangá encontrado</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {activeGenre ? `Nenhum mangá com o gênero "${activeGenre}".` : "Nenhum mangá disponível."}
              </p>
            </div>
          ) : (
            <>
              {/* Hero — mangá mais popular */}
              {heroManga && !activeGenre && (
                <Link href={`/manga/${heroManga.slug}`} className="group block">
                  <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-xl">
                    <div className="grid md:grid-cols-[1fr_1.2fr] min-h-[280px]">
                      <div className="relative overflow-hidden bg-muted min-h-[200px]">
                        <img
                          src={heroManga.cover_local_path || heroManga.cover_url || ""}
                          alt={heroManga.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                        <Badge className="absolute top-4 left-4">Em destaque</Badge>
                      </div>
                      <div className="flex flex-col justify-center p-6 md:p-8 space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm uppercase tracking-widest text-primary font-medium">Mais popular</span>
                        </div>
                        <h2 className="font-heading text-3xl md:text-4xl font-black">{heroManga.title}</h2>
                        {heroManga.author && (
                          <p className="text-sm text-muted-foreground">por {heroManga.author}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {(tagsMap.get(heroManga.id) || []).slice(0, 4).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                          <Badge variant="outline" className="text-xs">{heroManga.chapter_count || 0} capítulos</Badge>
                        </div>
                        {heroManga.synopsis && (
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                            {heroManga.synopsis.slice(0, 300)}
                          </p>
                        )}
                        <div className="inline-flex items-center gap-2 font-semibold text-primary group-hover:underline">
                          Ler mangá <TrendingUp className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Grid de mangás */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                {rows.map((r, idx) => {
                  const coverSrc = r.cover_local_path || r.cover_url;
                  const isHero = idx === 0 && !activeGenre;
                  const tags = tagsMap.get(r.id) || [];
                  return (
                    <Link key={r.id} href={`/manga/${r.slug}`} className="group block">
                      <div className="overflow-hidden rounded-xl border border-border/40 bg-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300">
                        <div className="aspect-[2/3] overflow-hidden bg-muted relative">
                          {coverSrc ? (
                            <img src={coverSrc} alt={r.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                              <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                          )}
                          <span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full border ${statusColors[r.status] || statusColors.ongoing}`}>
                            {r.status === "completed" ? "Completo" : r.status === "hiatus" ? "Hiato" : r.status || "Em andamento"}
                          </span>
                        </div>
                        <div className="p-2.5 space-y-1.5">
                          <h3 className="font-heading text-sm font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors min-h-[2.5rem]">
                            {r.title}
                          </h3>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tags.slice(0, 2).map(t => (
                                <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground border-t border-border/30 pt-1.5">
                            📖 {r.chapter_count || 0} capítulos
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8 pb-4">
                  {page > 1 && (
                    <Link href={buildHref(activeGenre, page - 1)}>
                      <Button variant="outline" size="sm">Anterior</Button>
                    </Link>
                  )}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (page <= 4) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }
                      return (
                        <Link key={pageNum} href={buildHref(activeGenre, pageNum)}>
                          <Button
                            variant={pageNum === page ? "default" : "ghost"}
                            size="sm"
                            className="min-w-[2rem]"
                          >
                            {pageNum}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                  {page < totalPages && (
                    <Link href={buildHref(activeGenre, page + 1)}>
                      <Button variant="outline" size="sm">Próxima</Button>
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="text-center py-20 border border-dashed border-red-500/30 rounded-2xl">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-400 mb-4" />
          <h2 className="font-heading text-xl font-semibold mb-2">Erro ao carregar catálogo</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">{e.message?.slice(0, 200)}</p>
        </div>
      </div>
    );
  }
}
