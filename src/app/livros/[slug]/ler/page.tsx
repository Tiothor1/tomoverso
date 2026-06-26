import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReadingProgress } from "@/components/reader/reading-progress";

export const dynamic = "force-dynamic";

export default async function LerLivroPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const tableExists = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'").get();
  if (!tableExists) notFound();

  const book = db.prepare("SELECT * FROM books WHERE slug = ? AND is_hidden = 0").get(slug) as any;
  if (!book) notFound();

  const genres: string[] = (() => { try { return JSON.parse(book.genres); } catch { return []; } })();

  return (
    <div className="min-h-screen">
      <ReadingProgress />

      {/* Top bar */}
      <div className="border-b border-border/40 bg-muted/20 sticky top-16 z-30 backdrop-blur-md">
        <div className="container mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" asChild size="sm" className="-ml-2">
              <Link href={`/livros/${book.slug}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="truncate max-w-[200px]">{book.title}</span>
              </Link>
            </Button>
            {book.pages > 0 && (
              <Badge variant="outline" className="font-mono">{book.pages} páginas</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Reader content */}
      <article className="mx-auto py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <header className="mb-10 md:mb-12 space-y-4 text-center">
            <div className="mx-auto w-20 h-28 rounded-lg overflow-hidden shadow-md mb-4">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                  <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">{book.title}</h1>
            {book.author && <p className="text-muted-foreground">{book.author}</p>}
            <p className="text-xs text-muted-foreground">
              {book.pages} páginas
              {genres.length > 0 && ` · ${genres.slice(0, 3).join(", ")}`}
            </p>
          </header>

          {/* Texto do livro */}
          {(book.content || book.synopsis) ? (
            <div className="prose prose-lg max-w-none dark:prose-invert mx-auto text-justify leading-relaxed">
              {(book.content || book.synopsis).split(/\n\n+/).map((paragraph: string, i: number) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;
                return <p key={i}>{trimmed}</p>;
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Conteúdo completo em breve.</p>
            </div>
          )}
        </div>
      </article>

      {/* Navigation */}
      <div className="border-t border-border/40 bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href={`/livros/${book.slug}`}>
                <BookOpen className="h-4 w-4 mr-2" />
                Voltar à página do livro
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
