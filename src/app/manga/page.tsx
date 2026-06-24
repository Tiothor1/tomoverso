import Link from "next/link";
import { BookOpen, AlertTriangle } from "lucide-react";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function MangaCatalogPage() {
  let rows: any[] = [];
  try {
    const db = getDb();
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mangas'")
      .get();
    if (!tableExists) {
      return (
        <div className="container mx-auto max-w-7xl px-4 py-10">
          <div className="text-center py-20 border border-dashed border-red-500/30 rounded-2xl">
            <AlertTriangle className="h-16 w-16 mx-auto text-red-400 mb-4" />
            <h2 className="font-heading text-xl font-semibold mb-2">Banco de dados incompleto</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              A tabela de mangás não foi encontrada. Execute a migration:
            </p>
            <code className="bg-muted px-3 py-1 rounded text-sm">npm run migrate</code>
          </div>
        </div>
      );
    }
    rows = db
      .prepare(
        `SELECT m.id, m.slug, m.title, m.alternative_titles, m.synopsis,
                m.cover_url, m.cover_local_path, m.author, m.artist,
                m.status, m.source, m.source_url,
                (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
         FROM mangas m ORDER BY m.updated_at DESC`
      )
      .all() as any[];
  } catch (e: any) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="text-center py-20 border border-dashed border-red-500/30 rounded-2xl">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-400 mb-4" />
          <h2 className="font-heading text-xl font-semibold mb-2">Erro ao carregar catálogo</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">{e.message?.slice(0, 200)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">Catálogo de Mangás</h1>
          <p className="text-muted-foreground">{rows.length} {rows.length === 1 ? "obra" : "obras"} disponíveis</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="font-heading text-xl font-semibold mb-2">Catálogo vazio</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Nenhum mangá importado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {rows.map((r) => {
            const coverSrc = r.cover_local_path || r.cover_url;
            return (
              <Link key={r.id} href={`/manga/${r.slug}`} className="group block">
                <div className="overflow-hidden rounded-lg border border-border/40 bg-card hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10">
                  <div className="aspect-[2/3] overflow-hidden bg-muted relative">
                    {coverSrc ? (
                      <img src={coverSrc} alt={r.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                        <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {r.status === "completed" ? "Completo" : r.status === "hiatus" ? "Hiato" : "Em andamento"}
                    </span>
                  </div>
                  <div className="p-3 space-y-1">
                    <h3 className="font-heading text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
                      {r.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">📖 {r.chapter_count || 0} capítulos</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
