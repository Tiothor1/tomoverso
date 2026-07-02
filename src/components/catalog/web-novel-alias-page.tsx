import Link from "next/link";
import { BookOpen, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NovelCard } from "@/components/novel/novel-card";
import { getDb } from "@/lib/db";
import { publicReadableNovelSql, readableNovelChapterSql } from "@/lib/public-catalog";
import type { Novel } from "@/lib/types";

export const webNovelAliasMetadata = {
  title: "Web Novels — Tomoverso",
  description: "Web novels em curadoria no Tomoverso.",
};

export const dynamic = "force-dynamic";

function safeJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

type WebNovelRow = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  title_jp: string | null;
  alternative_titles: string | null;
  synopsis: string;
  cover_url: string | null;
  cover_local_path: string | null;
  author_id: string;
  author_name: string | null;
  type: "web-novel";
  status: "ongoing" | "completed" | "hiatus" | "dropped";
  genres: string | null;
  tags: string | null;
  views: number;
  rating_sum: number;
  rating_count: number;
  is_featured: number;
  created_at: string;
  chapter_count: number;
};

function toNovel(row: WebNovelRow): Novel {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    title_en: row.title_en,
    title_jp: row.title_jp,
    alternative_titles: safeJsonArray(row.alternative_titles),
    synopsis: row.synopsis,
    cover_url: row.cover_url || "",
    cover_local_path: row.cover_local_path,
    author_id: row.author_id,
    author_name: row.author_name || undefined,
    type: "web-novel",
    status: row.status,
    genres: safeJsonArray(row.genres),
    tags: safeJsonArray(row.tags),
    views: row.views || 0,
    rating_avg: row.rating_count > 0 ? row.rating_sum / row.rating_count : 0,
    rating_count: row.rating_count || 0,
    chapter_count: row.chapter_count || 0,
    is_featured: !!row.is_featured,
    is_approved: true,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export default function WebNovelAliasPage() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT n.id, n.slug, n.title, n.title_en, n.title_jp, n.alternative_titles,
           n.synopsis, n.cover_url, n.cover_local_path, n.author_id, n.type, n.status,
           n.genres, n.tags, n.views, n.rating_sum, n.rating_count, n.is_featured, n.created_at,
           u.display_name AS author_name,
           (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND ${readableNovelChapterSql("c")}) AS chapter_count
    FROM novels n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE n.type = 'web-novel' AND ${publicReadableNovelSql("n")}
    ORDER BY n.is_featured DESC, n.views DESC, n.created_at DESC
    LIMIT 24
  `).all() as WebNovelRow[];

  const novels = rows.map(toNovel);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
      <section className="space-y-4">
        <Badge variant="secondary" className="w-fit gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Catálogo
        </Badge>
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-bold md:text-5xl">Web Novels</h1>
          <p className="max-w-2xl text-muted-foreground">
            Área reservada para web novels curadas do Tomoverso. As importações cruas em japonês/AO3 ficam fora do público até revisão.
          </p>
        </div>
      </section>

      {novels.length > 0 ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </section>
      ) : (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <BookOpen className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-2xl font-semibold">Web Novels em curadoria</h2>
              <p className="max-w-xl text-sm text-muted-foreground">
                Ainda não tem web novel pública aprovada nessa seção. Enquanto isso, dá pra explorar Light Novels, Mangás e Visual Novels normalmente.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/explore">Ver catálogo</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/manga">Ver mangás</Link>
              </Button>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Quando uma web novel for aprovada, ela aparece aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
