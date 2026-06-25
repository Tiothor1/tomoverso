export const dynamic = "force-dynamic";
export const revalidate = 60; // cache por 60s para evitar timeout no cold start

import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { readableTitle, hasCjk } from "@/lib/display-title";

interface NovelRow {
  id: string; slug: string; title: string; alternative_titles: string;
  synopsis: string; cover_url: string | null; cover_local_path?: string | null;
  type: string; genres: string;
}

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { const p = JSON.parse(val); return Array.isArray(p) ? p.filter(Boolean).map(String) : []; } catch { return []; }
}

function getCover(r: { cover_local_path?: string | null; cover_url?: string | null }) {
  return r.cover_local_path || r.cover_url || "";
}

export default function HomePage() {
  let stats = { novels: 0, mangas: 0, chapters: 0 };
  let topMangas: any[] = [];
  let novels: NovelRow[] = [];

  try {
    const db = getDb();
    db.pragma("max_variables_count = 100000");

    stats = {
      novels: (db.prepare("SELECT COUNT(DISTINCT novel_id) AS c FROM chapters WHERE length(trim(coalesce(content, ''))) > 30 OR coalesce(word_count, 0) > 5").get() as any).c,
      mangas: (db.prepare("SELECT COUNT(DISTINCT m.id) AS c FROM mangas m JOIN manga_chapters ch ON ch.manga_id = m.id JOIN manga_pages p ON p.chapter_id = ch.id WHERE coalesce(p.image_url, p.local_path, '') <> ''").get() as any).c,
      chapters: (db.prepare("SELECT COUNT(*) AS c FROM manga_chapters ch WHERE EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')").get() as any).c,
    };

    // Top mangás com páginas reais
    topMangas = db.prepare(`
      SELECT m.id, m.slug, m.title, m.cover_url, m.cover_local_path,
             (SELECT COUNT(*) FROM manga_chapters ch WHERE ch.manga_id = m.id AND EXISTS (SELECT 1 FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '')) AS chapter_count
      FROM mangas m
      WHERE EXISTS (
        SELECT 1 FROM manga_chapters ch
        JOIN manga_pages p ON p.chapter_id = ch.id
        WHERE ch.manga_id = m.id AND coalesce(p.image_url, p.local_path, '') <> ''
      )
      ORDER BY chapter_count DESC
      LIMIT 5
    `).all() as any[];

    // Novels com texto real (hide CJK titles)
    novels = (db.prepare(`
      SELECT n.id, n.slug, n.title, n.alternative_titles, n.synopsis, n.cover_url, n.cover_local_path,
             n.type, n.genres
      FROM novels n
      WHERE EXISTS (
        SELECT 1 FROM chapters c
        WHERE c.novel_id = n.id AND (length(trim(coalesce(c.content, ''))) > 30 OR coalesce(c.word_count, 0) > 5)
      )
      ORDER BY n.is_featured DESC, n.views DESC
      LIMIT 20
    `).all() as NovelRow[]).filter(n => !hasCjk(n.title)).slice(0, 6);
  } catch (err: any) {
    console.error("Home page error:", err?.message, err?.stack?.slice(0, 500));
    // Fallback com zeros — nunca quebrar a home
  }

  return (
    <main>
      {/* Hero */}
      <section className="container mx-auto max-w-6xl px-4 pt-16 pb-12 md:pt-20 md:pb-16">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            {stats.novels} LNs · {stats.mangas} mangás · {stats.chapters.toLocaleString("pt-BR")} capítulos
          </div>
          <h1 className="font-heading text-5xl font-black tracking-tight md:text-7xl">
            Tomoverso
            <span className="block text-primary">ler sem frescura.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Catálogo brasileiro com leitor por páginas, busca rápida e conteúdo que realmente dá pra ler.
          </p>
          <form action="/search" className="relative mx-auto max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input name="q" placeholder="Pesquisar mangá, novel, capítulo..."
              className="h-14 w-full rounded-2xl border border-border/60 bg-card/90 pl-12 pr-36 text-base shadow-lg outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10" />
            <Button type="submit" size="lg" className="absolute right-1.5 top-1/2 h-11 -translate-y-1/2 rounded-xl px-5">
              Buscar
            </Button>
          </form>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button size="lg" asChild><Link href="/manga">Ler mangás <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/explore">Explorar novels</Link></Button>
            <Button variant="ghost" asChild><Link href="/auth/signup"><PenLine className="mr-2 h-4 w-4" /> Publicar</Link></Button>
          </div>
        </div>
      </section>

      {/* Mangás */}
      {topMangas.length > 0 && (
        <section className="container mx-auto max-w-6xl px-4 pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">Mangás</h2>
            <Button variant="ghost" asChild><Link href="/manga">Ver todos <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {topMangas.map(m => (
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

      {/* Light Novels */}
      {novels.length > 0 && (
        <section className="container mx-auto max-w-6xl px-4 pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">Light Novels</h2>
            <Button variant="ghost" asChild><Link href="/explore">Ver todas <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {novels.map(n => (
              <Link key={n.id} href={`/novels/${n.slug}`} className="group block">
                <Card className="overflow-hidden border-border/40 hover:border-primary/50 transition-all hover:shadow-lg h-full">
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    {getCover(n) ? (
                      <img src={getCover(n)} alt={n.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-secondary/20 p-3 text-center text-xs text-muted-foreground">
                        {n.title}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5 space-y-1">
                    <h3 className="font-heading text-xs font-bold line-clamp-2 leading-tight group-hover:text-primary">{readableTitle({ title: n.title, alternative_titles: n.alternative_titles, type: n.type })}</h3>
                    <div className="flex flex-wrap gap-1">
                      {safeJsonArray(n.genres).slice(0, 2).map(g => (
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

      {/* CTA */}
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
