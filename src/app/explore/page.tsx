export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Search, Filter, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NovelCard } from "@/components/novel/novel-card";
import { getDb } from "@/lib/db";

export const metadata = {
  title: "Explorar — Tomoverso",
};

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
  return {
    ...r,
    alternative_titles: JSON.parse(r.alternative_titles || "[]"),
    genres: JSON.parse(r.genres || "[]"),
    tags: JSON.parse(r.tags || "[]"),
    rating_avg: r.rating_count > 0 ? r.rating_sum / r.rating_count : 0,
    chapter_count: 0,
    is_featured: !!r.is_featured,
    is_approved: true,
    updated_at: r.created_at,
  };
}

export default function ExplorePage({ searchParams }: { searchParams: Promise<{ genre?: string; type?: string }> }) {
  const params = searchParams as any; // ignore
  return <ExploreContent searchParams={searchParams} />;
}

async function ExploreContent({ searchParams }: { searchParams: Promise<{ genre?: string; type?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const allRows = db.prepare("SELECT * FROM novels ORDER BY created_at DESC").all() as NovelRow[];
  const allNovels = allRows.map(parseNovel);

  let novels = allNovels;
  if (sp.genre) {
    novels = allNovels.filter((n) => n.genres.includes(sp.genre!));
  }
  if (sp.type) {
    novels = novels.filter((n) => n.type === sp.type);
  }

  const featured = novels.filter((n) => n.is_featured);
  const popular = [...novels].sort((a, b) => b.views - a.views);
  const recent = [...novels].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const allGenres = Array.from(new Set(allNovels.flatMap((n) => n.genres)));

  // Contagem por tipo pra mostrar nos badges de filtro
  const typeCounts = {
    "all": allNovels.length,
    "light-novel": allNovels.filter((n) => n.type === "light-novel").length,
    "web-novel": allNovels.filter((n) => n.type === "web-novel").length,
    "visual-novel": allNovels.filter((n) => n.type === "visual-novel").length,
    "short": allNovels.filter((n) => n.type === "short").length,
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 space-y-8">
      <div className="space-y-3">
        <Badge variant="secondary">Catálogo</Badge>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
          {sp.genre
            ? sp.genre
            : sp.type === "light-novel" ? "Light Novels"
            : sp.type === "web-novel" ? "Web Novels"
            : (sp.type as string) === "visual-novel" ? "Visual Novels"
            : sp.type === "short" ? "Curtas"
            : "Explorar"}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          {sp.genre
            ? `Novels do gênero ${sp.genre}`
            : sp.type
            ? `Catálogo focado em ${sp.type === "visual-novel" ? "visual novels" : String(sp.type).replace("-", " ")}s`
            : "Descubra a próxima história que vai te prender por horas"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sticky top-16 z-30 py-3 bg-background/80 backdrop-blur-md -mx-4 px-4 border-b border-border/40">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título, autor ou tag..." className="pl-9 h-11" />
        </div>
        <Button variant="outline" className="h-11">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* ── Filtro por tipo ──────────────────────────────────── */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-primary" />
          Tipo de obra
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

      <div className="space-y-2">
        <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          Gêneros
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={sp.type ? `/explore?type=${sp.type}` : "/explore"}>
            <Badge variant={!sp.genre ? "default" : "outline"} className="cursor-pointer">Todos</Badge>
          </Link>
          {allGenres.map((g) => (
            <Link key={g} href={`/explore?genre=${encodeURIComponent(g)}${sp.type ? `&type=${sp.type}` : ""}`}>
              <Badge variant={sp.genre === g ? "default" : "outline"} className="cursor-pointer hover:bg-primary/10">
                {g}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      <Tabs defaultValue="todos" className="w-full">
        <TabsList>
          <TabsTrigger value="todos">Todos ({novels.length})</TabsTrigger>
          <TabsTrigger value="destaque">Destaque ({featured.length})</TabsTrigger>
          <TabsTrigger value="populares">Populares</TabsTrigger>
          <TabsTrigger value="recentes">Recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="mt-6">
          {novels.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhuma novel encontrada. <Link href="/dashboard/novels/new" className="text-primary">Seja o primeiro a publicar!</Link></p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {novels.map((n) => <NovelCard key={n.id} novel={n as any} variant="compact" />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="destaque" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {featured.map((n) => <NovelCard key={n.id} novel={n as any} variant="compact" />)}
          </div>
        </TabsContent>
        <TabsContent value="populares" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {popular.map((n) => <NovelCard key={n.id} novel={n as any} variant="compact" />)}
          </div>
        </TabsContent>
        <TabsContent value="recentes" className="mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recent.map((n) => <NovelCard key={n.id} novel={n as any} variant="compact" />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
