import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { BookOpen, ArrowLeft, User, BookText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface BookRow {
  id: string;
  slug: string;
  title: string;
  author: string;
  synopsis: string;
  content: string;
  cover_url: string;
  cover_local_path: string | null;
  genres: string;
  pages: number;
  source: string;
  source_url: string;
  language: string;
  created_at: string;
}

export default async function LivroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const tableExists = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'").get();
  if (!tableExists) notFound();

  const book = db.prepare("SELECT * FROM books WHERE slug = ? AND is_hidden = 0").get(slug) as BookRow | undefined;
  if (!book) notFound();

  const genres: string[] = (() => { try { return JSON.parse(book.genres); } catch { return []; } })();

  // Related books (same genres)
  const related = genres.length > 0
    ? db.prepare(`SELECT slug, title, author, cover_url, cover_local_path FROM books WHERE slug != ? AND is_hidden = 0 AND (${genres.map(() => "lower(genres) LIKE ?").join(" OR ")}) LIMIT 4`)
      .all(book.slug, ...genres.map(g => `%"${g.toLowerCase()}"%`)) as any[]
    : [];

  const coverSrc = book.cover_local_path || book.cover_url;
  const hasReadableContent = Boolean(book.content?.trim());

  return (
    <div className="min-h-screen">
      <div className="border-b border-border/40 bg-muted/20">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <Button variant="ghost" asChild size="sm" className="-ml-2">
            <Link href="/livros"><ArrowLeft className="h-4 w-4 mr-2" />Voltar ao catálogo</Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-10">
        <div className="grid md:grid-cols-[300px_1fr] gap-8 md:gap-12">
          {/* Cover */}
          <div className="mx-auto w-full max-w-[260px]">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-black/10">
              {coverSrc ? (
                <img src={coverSrc} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">{book.title}</h1>
              {book.author && (
                <p className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  {book.author}
                </p>
              )}
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map(g => <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>)}
              </div>
            )}

            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><BookText className="h-4 w-4" />{hasReadableContent ? `${book.pages} páginas` : "Conceito de catálogo"}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(book.created_at).toLocaleDateString("pt-BR")}</span>
              {book.language && <span>{book.language === "pt-BR" ? "Português" : book.language}</span>}
            </div>

            {hasReadableContent ? (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/livros/${book.slug}/ler`}><BookOpen className="h-4 w-4 mr-2" />Começar a ler</Link>
              </Button>
            ) : (
              <div className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/5 px-5 py-3 text-sm font-medium text-primary">
                Conceito de catálogo — história em breve
              </div>
            )}

            {book.synopsis && (
              <div className="space-y-2">
                <h2 className="font-heading text-lg font-bold">Sinopse</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{book.synopsis}</p>
              </div>
            )}

            {book.source && (
              <p className="text-xs text-muted-foreground">Fonte: {book.source}</p>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-border/40">
            <h2 className="font-heading text-xl font-bold mb-6">Livros relacionados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {related.map(r => {
                const relatedCover = r.cover_local_path || r.cover_url;
                return (
                <Link key={r.slug} href={`/livros/${r.slug}`} className="group">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-2 shadow-sm">
                    {relatedCover ? <img src={relatedCover} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted"><BookOpen className="h-6 w-6 text-muted-foreground/40" /></div>}
                  </div>
                  <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary">{r.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{r.author}</p>
                </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
