import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, User, Pencil, Hash, Calendar, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MangaCover } from "@/components/manga/manga-cover";
import { getDb } from "@/lib/db";

interface MangaRow {
  id: string;
  slug: string;
  title: string;
  alternative_titles: string;
  synopsis: string;
  cover_url: string | null;
  cover_local_path: string | null;
  author: string | null;
  artist: string | null;
  status: "ongoing" | "completed" | "hiatus" | "dropped";
  source: string | null;
  source_url: string | null;
}

interface ChapterRow {
  id: string;
  chapter_number: number;
  title: string | null;
  slug: string;
  page_count: number;
  published_at: string | null;
}

export const dynamic = "force-dynamic";

const statusLabels = {
  ongoing: { label: "Em andamento", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  completed: { label: "Completo", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  hiatus: { label: "Hiato", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  dropped: { label: "Droppado", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default async function MangaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const manga = db
    .prepare(`SELECT * FROM mangas WHERE slug = ?`)
    .get(slug) as MangaRow | undefined;
  if (!manga) notFound();

  const chapters = db
    .prepare(
      `SELECT ch.id, ch.chapter_number, ch.title, ch.slug,
              (SELECT COUNT(*) FROM manga_pages p WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> '') AS page_count,
              ch.published_at
       FROM manga_chapters ch
       WHERE ch.manga_id = ?
         AND EXISTS (
           SELECT 1 FROM manga_pages p
           WHERE p.chapter_id = ch.id AND coalesce(p.image_url, p.local_path, '') <> ''
         )
       ORDER BY ch.chapter_number DESC`
    )
    .all(manga.id) as ChapterRow[];

  const tags = (db
    .prepare(`SELECT tag FROM manga_tags WHERE manga_id = ? ORDER BY tag`)
    .all(manga.id) as Array<{ tag: string }>).map((t) => t.tag);

  const alternativeTitles: string[] = (() => {
    try {
      const v = JSON.parse(manga.alternative_titles);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  })();

  const status = statusLabels[manga.status];
  const totalPages = chapters.reduce((acc, c) => acc + c.page_count, 0);
  const firstChapter = chapters[chapters.length - 1]; // DESC order, first = last item
  const lastChapter = chapters[0];

  return (
    <div>
      <div className="relative h-48 md:h-64 overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 -mt-32 relative z-10">
        <Button variant="ghost" asChild className="mb-6 -ml-2 backdrop-blur-sm">
          <Link href="/manga">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao catálogo
          </Link>
        </Button>

        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          <aside className="space-y-4">
            <div className="w-full max-w-[280px]">
              <MangaCover
                manga={{
                  id: manga.id,
                  slug: manga.slug,
                  title: manga.title,
                  alternative_titles: alternativeTitles,
                  synopsis: manga.synopsis,
                  cover_url: manga.cover_url,
                  cover_local_path: manga.cover_local_path,
                  author: manga.author,
                  artist: manga.artist,
                  status: manga.status,
                  source: manga.source,
                  source_url: manga.source_url,
                  tags,
                  chapter_count: chapters.length,
                }}
                className="aspect-[2/3] shadow-2xl shadow-primary/20 rounded-lg overflow-hidden"
              />
            </div>

            <div className="space-y-2">
              {firstChapter && (
                <Button asChild className="w-full" size="lg">
                  <Link href={`/manga/${manga.slug}/${firstChapter.slug}`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Começar a ler
                  </Link>
                </Button>
              )}
              {lastChapter && lastChapter.id !== firstChapter?.id && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/manga/${manga.slug}/${lastChapter.slug}`}>
                    Último cap ({lastChapter.chapter_number})
                  </Link>
                </Button>
              )}
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              {manga.author && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                    <User className="h-3.5 w-3.5" /> Autor
                  </span>
                  <span className="font-medium truncate text-right">{manga.author}</span>
                </div>
              )}
              {manga.artist && manga.artist !== manga.author && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                    <Pencil className="h-3.5 w-3.5" /> Artista
                  </span>
                  <span className="font-medium truncate text-right">{manga.artist}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> Capítulos
                </span>
                <span className="font-medium">{chapters.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" /> Páginas
                </span>
                <span className="font-medium">{totalPages.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={status.className}>{status.label}</Badge>
              </div>
              {manga.source && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Hash className="h-3 w-3" /> Fonte
                  </span>
                  <span className="text-xs text-muted-foreground">{manga.source}</span>
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-8 min-w-0">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.slice(0, 8).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
              <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight break-words">
                {manga.title}
              </h1>
              {alternativeTitles.length > 0 && (
                <p className="text-muted-foreground mt-2 text-sm">
                  também: {alternativeTitles.join(", ")}
                </p>
              )}
            </div>

            {manga.synopsis && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-heading text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
                    Sinopse
                  </h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {manga.synopsis}
                  </p>
                </CardContent>
              </Card>
            )}

            <div>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-heading text-2xl font-bold">
                  Capítulos ({chapters.length})
                </h2>
                {chapters.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Mais recente primeiro
                  </span>
                )}
              </div>
              {chapters.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Nenhum capítulo importado ainda.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {chapters.map((c) => (
                    <Link
                      key={c.id}
                      href={`/manga/${manga.slug}/${c.slug}`}
                      className="block group"
                    >
                      <Card className="hover:border-primary/50 transition-all hover:bg-accent/30">
                        <CardContent className="py-3 px-4 flex items-center gap-3">
                          <div className="font-heading text-lg font-bold text-primary/60 w-12 text-center shrink-0">
                            {String(c.chapter_number).padStart(3, "0")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary">
                              {c.title || `Capítulo ${c.chapter_number}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.page_count} {c.page_count === 1 ? "página" : "páginas"}
                              {c.published_at && (
                                <> · {new Date(c.published_at).toLocaleDateString("pt-BR")}</>
                              )}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}