export const dynamic = "force-dynamic";

import Link from "next/link";
import { Search, Filter, TrendingUp, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NovelCard } from "@/components/novel/novel-card";
import { getDb } from "@/lib/db";
import { readableTitle } from "@/lib/display-title";

export const metadata = {
  title: "Explorar — Tomoverso",
};

const PAGE_SIZE = 60; // novels por página

interface NovelRow {
  id: string;
  slug: string;
  title: string;
  alternative_titles: string;
  synopsis: string;
  cover_url: string;
  author_id: string;
  type: "light-novel" | "web-novel" | "short" | "visual-novel";
  status: "ongoing" | "completed" | "hiatus" | "dropped";
  genres: string;
  tags: string;
  views: number;
  rating_sum: number;
  rating_count: number;
  is_featured: number;
  created_at: string;
}

function parseNovel(r: NovelRow) {
  const alternative_titles = JSON.parse(r.alternative_titles || "[]");
  return {
    ...r,
    title: readableTitle({
      title: r.title,
      alternative_titles,
      type: r.type,
      slug: r.slug,
    }),
    alternative_titles,
    genres: JSON.parse(r.genres || "[]"),
    tags: JSON.parse(r.tags || "[]"),
    rating_avg: r.rating_count > 0 ? r.rating_sum / r.rating_count : 0,
    chapter_count: 0,
    is_featured: !!r.is_featured,
    is_approved: true,
    updated_at: r.created_at,
  };
}

interface SearchParams {
  genre?: string;
  type?: string;
  page?: string;
  /** Quando "1", mostra só novels com pelo menos 1 capítulo */
  readable?: string;
}

function buildQuery(filters: { type?: string; genre?: string; readable?: boolean }): { where: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.type) {
    conditions.push("type = ?");
    params.push(filters.type);
  }
  if (filters.genre) {
    conditions.push("genres LIKE ?");
    params.push(`%"${filters.genre}"%`);
  }
  if (filters.readable) {
    // Só novels/LNs/VNs com pelo menos 1 capítulo textual real.
    conditions.push("id IN (SELECT novel_id FROM chapters WHERE length(trim(coalesce(content, ''))) > 30 OR coalesce(word_count, 0) > 5)");
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

function buildHref(filters: SearchParams, page: number): string {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.readable) params.set("readable", "1");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/explore${qs ? `?${qs}` : ""}`;
}

export default function ExplorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <ExploreContent searchParams={searchParams} />;
}

async function ExploreContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const db = getDb();
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Default: mostrar só obras com capítulos (readable = true)
  const readableDefault = sp.readable !== "0"; // default true: só com capítulos

  const { where, params } = buildQuery({
    type: sp.type,
    genre: sp.genre,
    readable: readableDefault,
  });
  const countRow = db.prepare(`SELECT COUNT(*) as c FROM novels ${where}`).get(...params) as { c: number };
  const totalFiltered = countRow.c;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  // Página atual
  const pageRows = db.prepare(`
    SELECT * FROM novels ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, PAGE_SIZE, offset) as NovelRow[];
  const novels = pageRows.map(parseNovel);

  // Contagens por tipo (para badges de filtro) — só uma vez, sem filtro
  const allTypeRows = db.prepare(`SELECT type, COUNT(*) as c FROM novels GROUP BY type`).all() as Array<{ type: string; c: number }>;
  const typeCounts: Record<string, number> = { all: 0, "light-novel": 0, "web-novel": 0, "visual-novel": 0, "short": 0 };
  for (const r of allTypeRows) {
    typeCounts[r.type] = r.c;
    typeCounts.all += r.c;
  }

  // Quantas novels têm capítulos
  const readableCount = (db.prepare(`
    SELECT COUNT(DISTINCT novel_id) as c
    FROM chapters
    WHERE length(trim(coalesce(content, ''))) > 30 OR coalesce(word_count, 0) > 5
  `).get() as { c: number }).c;

  // Gêneros — só os top 20 (em vez de TODOS) pra não inchar a página
  const allGenresRaw = db.prepare(`
    SELECT genres FROM novels WHERE genres != '[]' LIMIT 500
  `).all() as Array<{ genres: string }>;
  const genreFreq = new Map<string, number>();
  for (const r of allGenresRaw) {
    try {
      const gs = JSON.parse(r.genres) as string[];
      for (const g of gs) {
        genreFreq.set(g, (genreFreq.get(g) ?? 0) + 1);
      }
    } catch {}
  }
  const topGenres = Array.from(genreFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([g]) => g);

  // Type label
  const typeLabel: Record<string, string> = {
    "light-novel": "Light Novels",
    "web-novel": "Web Novels",
    "visual-novel": "Visual Novels",
    "short": "Curtas",
  };

  const h1 = sp.genre
    ? sp.genre
    : sp.type
    ? typeLabel[sp.type] ?? "Explorar"
    : "Explorar";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 space-y-6">
      {/* Banner: plataforma de publicação BR */}
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-5 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex gap-3">
            <span className="text-2xl">✍️</span>
            <div>
              <p className="font-heading font-semibold text-base md:text-lg">
                O Tomoverso é uma plataforma de <em>publicação</em> brasileira.
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                As {typeCounts.all} obras do catálogo têm <strong>metadados importados</strong> (capa, sinopse, tags). O conteúdo pra ler vem de autores que publicam aqui pelo painel ou de fontes como NovelMania. <Link href="/explore?readable=1" className="text-primary underline font-semibold">Ver o que dá pra ler agora</Link>.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/dashboard/novels/new">
              <BookOpen className="h-4 w-4 mr-2" /> Publicar minha novel
            </Link>
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <Badge variant="secondary">Catálogo · {totalFiltered.toLocaleString("pt-BR")} obras</Badge>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">{h1}</h1>
      </div>

      {/* Filtro por tipo */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-primary" />
          Tipo
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={sp.genre ? `/explore?genre=${encodeURIComponent(sp.genre)}` : "/explore"}>
            <Badge variant={!sp.type ? "default" : "outline"} className="cursor-pointer">
              Todas ({typeCounts.all})
            </Badge>
          </Link>
          <Link href={sp.genre ? `/explore?genre=${encodeURIComponent(sp.genre)}&type=light-novel` : "/explore?type=light-novel"}>
            <Badge variant={sp.type === "light-novel" ? "default" : "outline"} className="cursor-pointer hover:bg-emerald-500/10">
              Light Novel ({typeCounts["light-novel"]})
            </Badge>
          </Link>
          <Link href={sp.genre ? `/explore?genre=${encodeURIComponent(sp.genre)}&type=web-novel` : "/explore?type=web-novel"}>
            <Badge variant={sp.type === "web-novel" ? "default" : "outline"} className="cursor-pointer hover:bg-blue-500/10">
              Web Novel ({typeCounts["web-novel"]})
            </Badge>
          </Link>
          <Link href={sp.genre ? `/explore?genre=${encodeURIComponent(sp.genre)}&type=visual-novel` : "/explore?type=visual-novel"}>
            <Badge variant={sp.type === "visual-novel" ? "default" : "outline"} className="cursor-pointer hover:bg-purple-500/10">
              Visual Novel ({typeCounts["visual-novel"]})
            </Badge>
          </Link>
          {typeCounts.short > 0 && (
            <Link href={sp.genre ? `/explore?genre=${encodeURIComponent(sp.genre)}&type=short` : "/explore?type=short"}>
              <Badge variant={sp.type === "short" ? "default" : "outline"} className="cursor-pointer hover:bg-amber-500/10">
                Curta ({typeCounts.short})
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Filtro "só com capítulos" */}
      <div className="flex flex-wrap gap-2">
        <Link href={buildHref({ ...sp, readable: undefined } as any, 1)}>
          <Badge variant={!sp.readable ? "default" : "outline"} className="cursor-pointer">
            📚 Todas ({typeCounts.all})
          </Badge>
        </Link>
        <Link href={buildHref({ ...sp, readable: "1" } as any, 1)}>
          <Badge variant={sp.readable ? "default" : "outline"} className="cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20">
            📖 Só as que dá pra ler ({readableCount})
          </Badge>
        </Link>
      </div>

      {/* Filtro por gênero (top 25) */}
      {topGenres.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            Gêneros populares
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={sp.type ? `/explore?type=${sp.type}` : "/explore"}>
              <Badge variant={!sp.genre ? "default" : "outline"} className="cursor-pointer">Todos</Badge>
            </Link>
            {topGenres.map((g) => (
              <Link key={g} href={`/explore?genre=${encodeURIComponent(g)}${sp.type ? `&type=${sp.type}` : ""}`}>
                <Badge variant={sp.genre === g ? "default" : "outline"} className="cursor-pointer hover:bg-primary/10">
                  {g}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Grid de novels — só 60 por página */}
      {novels.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          Nenhuma novel encontrada com esses filtros.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {novels.map((n) => (
            <NovelCard key={n.id} novel={n as any} variant="compact" />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref(sp, page - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
          )}
          <span className="text-sm text-muted-foreground px-3">
            Página <strong>{page}</strong> de {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildHref(sp, page + 1)}>
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
