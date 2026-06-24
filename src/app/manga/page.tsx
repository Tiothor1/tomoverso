import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getDb } from "@/lib/db";
import { MangaCard } from "@/components/manga/manga-card";
import { toMangaCardData } from "@/lib/manga/types";

export const dynamic = "force-dynamic";

export default function MangaCatalogPage() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.*,
        (SELECT COUNT(*) FROM manga_chapters WHERE manga_id = m.id) AS chapter_count
       FROM mangas m
       ORDER BY m.updated_at DESC`
    )
    .all() as Array<{
    id: string;
    slug: string;
    title: string;
    alternative_titles: string;
    synopsis: string;
    cover_url: string | null;
    cover_local_path: string | null;
    author: string | null;
    artist: string | null;
    status: string;
    source: string | null;
    source_url: string | null;
    chapter_count: number;
  }>;

  const mangas = rows.map((r) => {
    const tags = (db
      .prepare(`SELECT tag FROM manga_tags WHERE manga_id = ?`)
      .all(r.id) as Array<{ tag: string }>).map((t) => t.tag);
    const data = toMangaCardData(r);
    data.tags = tags;
    return data;
  });

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">Catálogo de Mangás</h1>
          <p className="text-muted-foreground">
            {mangas.length} {mangas.length === 1 ? "obra" : "obras"} disponíveis
          </p>
        </div>
      </div>

      {mangas.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="font-heading text-xl font-semibold mb-2">Catálogo vazio</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            O importador ainda não trouxe nenhuma obra. Execute o script de import
            (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">npm run import:mangaonline</code>)
            pra começar a popular o catálogo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {mangas.map((m) => (
            <MangaCard key={m.id} manga={m} />
          ))}
        </div>
      )}
    </div>
  );
}