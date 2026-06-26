import Link from "next/link";
import { getDb } from "@/lib/db";
import { BookOpen, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
            {books.map(book => (
              <Link key={book.id} href={`/livros/${book.slug}`} className="group">
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-2.5 shadow-sm">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                      <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{book.title}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{book.author || "Autor desconhecido"}</p>
              </Link>
            ))}
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
