import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cleanBookContent, paginateText } from "@/lib/books/cleaner";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function LerLivroPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const pageNum = Math.max(1, parseInt(pageParam || "1") || 1);

  const db = getDb();
  const tableExists = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'").get();
  if (!tableExists) notFound();

  const book = db.prepare("SELECT * FROM books WHERE slug = ? AND is_hidden = 0").get(slug) as any;
  if (!book) notFound();

  const genres: string[] = (() => {
    try {
      return JSON.parse(book.genres);
    } catch {
      return [];
    }
  })();

  // Clean and paginate only full book content. Synopsis alone is catalog material, not reader content.
  const rawContent = book.content || "";
  const cleanText = cleanBookContent(rawContent);
  const { pages, pageCount } = paginateText(cleanText);
  const currentPageContent = pages[pageNum - 1] || "";
  const hasContent = currentPageContent.length > 0;
  const isLastPage = pageNum >= pageCount;
  const coverSrc = book.cover_local_path || book.cover_url;

  return (
    <div className="min-h-screen">
      {/* Reading progress bar */}
      {pageCount > 1 && (
        <div className="fixed top-16 left-0 right-0 z-40 h-1 bg-border/30">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(pageNum / pageCount) * 100}%` }}
          />
        </div>
      )}

      {/* Top bar */}
      <div className="border-b border-border/40 bg-background/95 sticky top-16 z-30 backdrop-blur-md">
        <div className="container mx-auto max-w-4xl px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" asChild size="sm" className="-ml-2 shrink-0">
              <Link href={`/livros/${book.slug}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="truncate max-w-[180px]">{book.title}</span>
              </Link>
            </Button>
            <div className="flex items-center gap-2 shrink-0">
              {pageCount > 1 && (
                <Badge variant="outline" className="font-mono text-xs">
                  {pageNum}/{pageCount}
                </Badge>
              )}
              {isLastPage && hasContent && (
                <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Fim
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reader content */}
      <article className="mx-auto py-10 md:py-14">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Header */}
          <header className="mb-8 md:mb-10 text-center">
            <div className="mx-auto w-16 h-24 rounded-lg overflow-hidden shadow-md mb-4">
              {coverSrc ? (
                <img src={coverSrc} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                  <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight">{book.title}</h1>
            {book.author && <p className="text-sm text-muted-foreground mt-1">{book.author}</p>}
          </header>

          {/* Content */}
          {hasContent ? (
            <div className="prose prose-lg max-w-none dark:prose-invert mx-auto leading-relaxed">
              {currentPageContent.split("\n\n").map((paragraph, i) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;
                return <p key={i}>{trimmed}</p>;
              })}
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">Conteúdo completo em breve.</p>
              {book.source && (
                <p className="text-xs text-muted-foreground">
                  Fonte: {book.source}
                  {book.source_url && (
                    <>
                      {" · "}
                      <a href={book.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                        Ver original
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Page navigation */}
          {pageCount > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-3" aria-label="Paginação">
              {pageNum > 1 ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/livros/${book.slug}/ler?page=${pageNum - 1}`}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Link>
                </Button>
              ) : (
                <div />
              )}

              <Badge variant="secondary" className="font-mono">
                {pageNum} / {pageCount}
              </Badge>

              {pageNum < pageCount ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/livros/${book.slug}/ler?page=${pageNum + 1}`}>
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/livros/${book.slug}`}>
                    <BookOpen className="h-4 w-4 mr-1" />
                    Finalizar
                  </Link>
                </Button>
              )}
            </nav>
          )}
        </div>
      </article>

      {/* Bottom bar */}
      <div className="border-t border-border/40 bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <div className="flex justify-between items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/livros/${book.slug}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Página do livro
              </Link>
            </Button>
            {pageCount > 1 && (
              <span className="text-xs text-muted-foreground">
                {pageNum} de {pageCount} páginas
                {book.pages > 0 && ` · ${book.pages} páginas no original`}
              </span>
            )}
            {book.source && (
              <span className="text-xs text-muted-foreground">Fonte: {book.source}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
