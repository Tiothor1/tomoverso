export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Bookmark, Heart, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { publicReadableNovelSql, readableNovelChapterSql } from "@/lib/public-catalog";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Minha estante — Tomo Verso Editora",
};

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = getDb();

  // Novels em progresso (com capítulos lidos)
  const reading = db.prepare(`
    SELECT n.*, u.display_name as author_name,
           MAX(rp.last_read_at) as last_read,
           AVG(rp.progress) as avg_progress
    FROM reading_progress rp
    JOIN novels n ON n.id = rp.novel_id
    LEFT JOIN users u ON u.id = n.author_id
    WHERE rp.user_id = ? AND ${publicReadableNovelSql("n")}
    GROUP BY n.id
    ORDER BY last_read DESC
  `).all(user.id) as any[];

  // Favoritos
  const favorites = db.prepare(`
    SELECT n.*, u.display_name as author_name
    FROM favorites f
    JOIN novels n ON n.id = f.novel_id
    LEFT JOIN users u ON u.id = n.author_id
    WHERE f.user_id = ? AND ${publicReadableNovelSql("n")}
    ORDER BY f.created_at DESC
  `).all(user.id) as any[];

  // Capítulos salvos (bookmarks)
  const bookmarks = db.prepare(`
    SELECT c.id, c.chapter_number, c.title, n.title as novel_title, n.slug as novel_slug, b.created_at
    FROM bookmarks b
    JOIN chapters c ON c.id = b.chapter_id
    JOIN novels n ON n.id = c.novel_id
    WHERE b.user_id = ? AND ${publicReadableNovelSql("n")} AND ${readableNovelChapterSql("c")}
    ORDER BY b.created_at DESC
    LIMIT 50
  `).all(user.id) as any[];

  function parseNovel(r: any) {
    return {
      ...r,
      alternative_titles: JSON.parse(r.alternative_titles || "[]"),
      genres: JSON.parse(r.genres || "[]"),
      tags: JSON.parse(r.tags || "[]"),
      rating_avg: r.rating_count > 0 ? r.rating_sum / r.rating_count : 0,
      chapter_count: 0,
      is_featured: !!r.is_featured,
      is_approved: true,
      updated_at: r.created_at,
      author: r.author_name ? { id: r.author_id, username: "", display_name: r.author_name, created_at: "" } : undefined,
    };
  }

  return (
    <div className="aurora-bg container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div>
        <h1 className="gradient-text font-heading text-3xl font-black tracking-tight md:text-4xl">Minha estante</h1>
        <p className="text-muted-foreground mt-1">Suas novels, organizadas do seu jeito.</p>
      </div>

      <Tabs defaultValue="lendo" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="lendo">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Lendo ({reading.length})
          </TabsTrigger>
          <TabsTrigger value="favoritos">
            <Heart className="h-3.5 w-3.5 mr-1.5" />
            Favoritos ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="salvos">
            <Bookmark className="h-3.5 w-3.5 mr-1.5" />
            Salvos ({bookmarks.length})
          </TabsTrigger>
          <TabsTrigger value="historico">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lendo" className="mt-6">
          {reading.length === 0 ? (
            <EmptyState
              title="Você ainda não começou nenhuma novel"
              desc="Explore o catálogo e comece a ler"
            />
          ) : (
            <div className="space-y-3">
              {reading.map((r, i) => {
                const progress = Math.min(100, Math.round(r.avg_progress || 0));
                const novel = parseNovel(r);
                return (
                  <Card key={r.id} className="neon-card">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="w-20 h-28 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-heading text-3xl font-bold text-primary/40 flex-shrink-0">
                          {r.title.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <Link href={`/novels/${r.slug}`}>
                            <h3 className="font-heading text-lg font-semibold hover:text-primary">{r.title}</h3>
                          </Link>
                          <p className="text-xs text-muted-foreground">por {r.author_name}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{progress}% lido</span>
                              <span className="text-primary font-medium">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" asChild>
                              <Link href={`/novels/${r.slug}/1`}>Continuar</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favoritos" className="mt-6">
          {favorites.length === 0 ? (
            <EmptyState
              title="Nenhum favorito ainda"
              desc="Favorite novels pra ler depois"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {favorites.map((f) => {
                const novel = parseNovel(f);
                return (
                  <Link key={f.id} href={`/novels/${f.slug}`}>
                    <Card className="neon-card">
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="w-20 h-28 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-heading text-3xl font-bold text-primary/40">
                            {f.title.charAt(0)}
                          </div>
                          <h3 className="font-heading text-sm font-semibold line-clamp-2">{f.title}</h3>
                          <p className="text-xs text-muted-foreground">{f.author_name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            <Heart className="h-3 w-3 mr-1 fill-red-500 text-red-500" />
                            Favorito
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="salvos" className="mt-6">
          {bookmarks.length === 0 ? (
            <EmptyState
              title="Nenhum capítulo salvo"
              desc="Use o bookmark nos capítulos pra ler depois"
            />
          ) : (
            <div className="space-y-2">
              {bookmarks.map((b) => (
                <Link key={b.id} href={`/novels/${b.novel_slug}/${b.chapter_number}`} className="block">
                  <Card className="neon-card">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <Bookmark className="h-4 w-4 text-primary fill-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">Cap {b.chapter_number}: {b.title}</div>
                          <div className="text-xs text-muted-foreground">de "{b.novel_title}"</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(b.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <Card className="glass-panel">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              Histórico em breve
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="glass-panel">
      <CardContent className="py-12 text-center space-y-2">
        <BookOpen className="neon-icon-pop mx-auto h-12 w-12 text-primary/65" />
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
        <Button asChild className="neon-button mt-3">
          <Link href="/explore">Explorar novels</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
