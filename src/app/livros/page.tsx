import Link from "next/link";
import { getDb } from "@/lib/db";
import { BookOpen, Search, Filter, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SaveWorkButton } from "@/components/work/save-work-button";

export const revalidate = 120;

const ALL_GENRES = [
  "Fantasia", "Romance", "Terror", "Suspense", "Ação", "Aventura",
  "Ficção Científica", "Sobrenatural", "Mistério", "Policial", "Drama", "Comédia", "Outros"
];

const PAGE_SIZE = 24;

interface BookRow {
  id: string;
  slug: string;
  title: string;
  author: string;
  synopsis: string;
  cover_url: string;
  cover_local_path: string | null;
  genres: string;
  pages: number;
  is_featured?: number;
}

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export default async function LivrosPage({ searchParams }: { searchParams: Promise<{ genero?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const db = getDb();

  const tableExists = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'").get();
  if (!tableExists) return <div className="container mx-auto max-w-7xl px-4 py-16 text-center"><p className="text-muted-foreground">Seção de livros em breve.</p></div>;

  const genero = params.genero || "";
  const q = (params.q || "").trim().toLowerCase();
  const pageNum = Math.max(1, parseInt(params.page || "1"));
  const offset = (pageNum - 1) * PAGE_SIZE;

  const where: string[] = ["is_hidden = 0"];
  const queryParams: any[] = [];

  if (genero && genero !== "todos") {
    where.push("lower(genres) LIKE ?");
    queryParams.push(`%"${genero.toLowerCase()}"%`);
  }
  if (q) {
    where.push("(lower(title) LIKE ? OR lower(author) LIKE ? OR lower(synopsis) LIKE ?)");
    const like = `%${q}%`;
    queryParams.push(like, like, like);
  }

  const whereSql = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

  const total = (db.prepare(`SELECT COUNT(*) as c FROM books ${whereSql}`).get(...queryParams) as { c: number }).c;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const books = db.prepare(`SELECT * FROM books ${whereSql} ORDER BY is_featured DESC, created_at DESC LIMIT ? OFFSET ?`).all(...queryParams, PAGE_SIZE, offset) as BookRow[];

  return (
    <div className="min-h-screen">
      <div className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-3xl md:text-4xl font-bold">Livros</h1>
          </div>
          <p className="text-muted-foreground max-w-xl">Histórias completas em formato de livro. Fantasia, romance, terror e muito mais.</p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Busca */}
        <form className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input name="q" defaultValue={q} placeholder="Buscar por título, autor..." className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-background text-sm outline-none focus:border-primary" />
        </form>

        {/* Filtro de gêneros */}
        <div className="flex flex-wrap gap-2">
          <Link href="/livros" className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${!genero ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>Todos</Link>
          {ALL_GENRES.map(g => (
            <Link key={g} href={`/livros?genero=${g.toLowerCase()}`} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${genero === g.toLowerCase() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{g}</Link>
          ))}
        </div>

        {/* Grid de livros */}
        {books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum livro encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map(book => {
              const coverSrc = book.cover_local_path || book.cover_url;
              const tags = safeJsonArray(book.genres).slice(0, 3);
              return (
                <article key={book.id} className="neon-card group/work-card flex h-full flex-col overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1 hover:border-primary/35">
                  <Link href={`/livros/${book.slug}`} className="relative block overflow-hidden bg-muted">
                    <div className="aspect-[2/3]">
                      {coverSrc ? (
                        <img src={coverSrc} alt={book.title} className="story-cover h-full w-full object-cover transition duration-500 group-hover/work-card:scale-[1.04]" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/82 via-transparent to-black/25 opacity-80" />
                    <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                      {book.is_featured ? <Badge className="bg-primary/92 text-primary-foreground shadow-lg"><Sparkles className="h-3 w-3" /> Original</Badge> : null}
                      <Badge variant="secondary" className="bg-amber-300/15 text-amber-100 shadow-lg">Livro</Badge>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                      <Badge variant="outline" className="h-6 rounded-full border-sky-300/25 bg-sky-300/10 px-2 text-[10px] text-sky-100">Completo</Badge>
                      <span className="rounded-full border border-white/15 bg-black/45 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">{book.pages || 0} págs</span>
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
                    <Link href={`/livros/${book.slug}`} className="block">
                      <h3 className="line-clamp-2 font-heading text-base font-black leading-tight transition-colors group-hover/work-card:text-primary sm:text-lg">{book.title}</h3>
                    </Link>
                    <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <PenLine className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{book.author || "Autor desconhecido"}</span>
                    </p>
                    <div className="flex min-h-5 flex-wrap gap-1.5">
                      {tags.length > 0 ? tags.map(t => <Badge key={t} variant="secondary" className="max-w-full truncate text-[10px]">{t}</Badge>) : <Badge variant="outline" className="text-[10px]">Livro</Badge>}
                    </div>
                    {book.synopsis ? <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{book.synopsis}</p> : null}
                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><BookOpen className="h-3.5 w-3.5 text-primary" />{book.pages || 0} páginas</span>
                      <div className="flex gap-2">
                        <Button asChild size="sm" className="h-8 rounded-full px-3"><Link href={`/livros/${book.slug}`}>Ler</Link></Button>
                        <SaveWorkButton id={book.id} type="book" title={book.title} compact />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            {pageNum > 1 && <Button variant="outline" asChild><Link href={`/livros?page=${pageNum - 1}${genero ? `&genero=${genero}` : ""}${q ? `&q=${q}` : ""}`}>Anterior</Link></Button>}
            <span className="flex items-center px-4 text-sm text-muted-foreground">{pageNum} de {totalPages}</span>
            {pageNum < totalPages && <Button variant="outline" asChild><Link href={`/livros?page=${pageNum + 1}${genero ? `&genero=${genero}` : ""}${q ? `&q=${q}` : ""}`}>Próximo</Link></Button>}
          </div>
        )}
      </div>
    </div>
  );
}
