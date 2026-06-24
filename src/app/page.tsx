export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { readableTitle } from "@/lib/display-title";

interface NovelRow {
  id: string; slug: string; title: string; alternative_titles: string;
  synopsis: string; cover_url: string | null; cover_local_path?: string | null;
  author_id: string; author_name?: string | null;
  type: string; genres: string;
  is_featured: number; chapter_count: number; views: number;
}

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { const p = JSON.parse(val); return Array.isArray(p) ? p.filter(Boolean).map(String) : []; } catch { return []; }
}

function getCover(r: { cover_local_path?: string | null; cover_url?: string | null }) {
  return r.cover_local_path || r.cover_url || "";
}

function compact(text: string | null | undefined, size = 140) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  return clean.length > size ? clean.slice(0, size) + "..." : clean;
}

export default function HomePage() {
  const db = getDb();

  // Stats reais
  const stats = {
    novels: (db.prepare("SELECT COUNT(DISTINCT novel_id) AS c FROM chapters").get() as any).c,
    mangas: (db.prepare("SELECT COUNT(*) AS c FROM mangas").get() as any).c,
    chapters: (db.prepare("SELECT COUNT(*) AS c FROM manga_chapters").get() as any).c,
  };

  // Top 3 mangas por capitulos
  const topMangas = db.prepare(`
    SELECT m.id, m.slug, m.title, m.synopsis, m.cover_url, m.cover_local_path, m.author,
           (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
    FROM mangas m
    WHERE (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) > 0
    ORDER BY chapter_count DESC
    LIMIT 6
  `).all() as any[];

  // Novels com capitulos (até 6)
  const novels = db.prepare(`
    SELECT n.id, n.slug, n.title, n.alternative_titles, n.synopsis, n.cover_url, n.cover_local_path,
           n.type, n.genres, n.is_featured, n.views,
           (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) AS chapter_count
    FROM novels n
    WHERE (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) > 0
    ORDER BY n.is_featured DESC, n.views DESC
    LIMIT 6
  `).all() as NovelRow[];

  const heroManga = topMangas[0];

  return (
    <main>
      <section className="container mx-auto max-w-6xl px-4 pt-12 pb-8 md:pt-16 md:pb-10">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              {stats.novels} LNs · {stats.mangas} mangás · {stats.chapters.toLocaleString("pt-BR")} capítulos
            </div>

            <h1 className="font-heading text-5xl font-black tracking-tight md:text-7xl">
              Tomoverso
              <span className="block text-primary">ler sem frescura.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Catálogo brasileiro com leitor por páginas, busca rápida e conteúdo que realmente dá pra ler.
            </p>

            <form action="/search" className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                placeholder="Pesquisar mangá, novel, capítulo..."
                className="h-14 w-full rounded-2xl border border-border/60 bg-card/90 pl-12 pr-32 text-base shadow-lg outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
              <Button type="submit" size="lg" className="absolute right-1.5 top-1/2 h-11 -translate-y-1/2 rounded-xl px-4">
                Buscar
              </Button>
            </form>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild><Link href="/manga">Ler mangás <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link href="/explore">Explorar novels</Link></Button>
              <Button variant="ghost" asChild><Link href="/auth/signup"><PenLine className="mr-2 h-4 w-4" /> Publicar</Link></Button>
            </div>
          </div>

          {heroManga && (
            <Link href={`/manga/${heroManga.slug}`} className="group block">
              <Card className="overflow-hidden border-border/50 hover:border-primary/50 transition-all hover:shadow-xl">
                <div className="aspect-[16/10] overflow-hidden bg-muted relative">
                  {getCover(heroManga) ? (
                    <img src={getCover(heroManga)} alt={heroManga.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-xs uppercase tracking-widest text-white/70">Mais lido</p>
                    <h2 className="font-heading text-xl font-bold text-white">{heroManga.title}</h2>
                    <p className="text-sm text-white/80">{heroManga.chapter_count} capítulos</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>
      </section>

      {topMangas.length > 1 && (
        <section className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">Mangás</h2>
            <Button variant="ghost" asChild><Link href="/manga">Ver todos <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {topMangas.slice(1).map((m) => (
              <Link key={m.id} href={`/manga/${m.slug}`} className="group block">
                <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-all hover:shadow-lg">
                  <div className="aspect-[2/3] overflow-hidden bg-muted">
                    <img src={getCover(m)} alt={m.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <CardContent className="p-2.5 space-y-1">
                    <h3 className="font-heading text-sm font-bold line-clamp-2 leading-tight group-hover:text-primary">{m.title}</h3>
                    <p className="text-xs text-muted-foreground">{m.chapter_count} capítulos</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {novels.length > 0 && (
        <section className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">Light Novels</h2>
            <Button variant="ghost" asChild><Link href="/explore">Ver todas <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {novels.map((n) => (
              <Link key={n.id} href={`/novels/${n.slug}`} className="group block">
                <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-all hover:shadow-lg h-full">
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    {getCover(n) ? (
                      <img src={getCover(n)} alt={n.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-secondary/20 p-2 text-center text-xs text-muted-foreground">
                        {n.title}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5 space-y-1">
                    <h3 className="font-heading text-xs font-bold line-clamp-2 leading-tight group-hover:text-primary">{n.title}</h3>
                    <div className="flex flex-wrap gap-1">
                      {safeJsonArray(n.genres).slice(0, 2).map((g) => (
                        <span key={g} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{g}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="font-heading text-2xl font-bold">Publique sua história</h2>
          <p className="mt-2 text-sm text-muted-foreground">Crie conta e publique capítulos. Grátis.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button asChild><Link href="/auth/signup">Criar conta <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button variant="outline" asChild><Link href="/how-to">Como funciona</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
