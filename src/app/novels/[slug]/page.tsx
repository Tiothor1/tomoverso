import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Eye, Star, Calendar, User, Heart, Share2, Bookmark, MessageCircle, ListOrdered, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { NovelCover } from "@/components/novel/novel-cover";
import { NovelCard } from "@/components/novel/novel-card";
import { NovelTitle } from "@/components/novel/novel-title";
import { getDb } from "@/lib/db";
import { publicReadableNovelSql, readableNovelChapterSql } from "@/lib/public-catalog";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface ChapterRow {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
  published_at: string;
}

interface AuthorRow {
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface NovelRow {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  title_jp: string | null;
  alternative_titles: string;
  synopsis: string;
  cover_url: string;
  author_id: string;
  type: "light-novel" | "web-novel" | "short";
  status: "ongoing" | "completed" | "hiatus" | "dropped";
  genres: string;
  tags: string;
  views: number;
  rating_sum: number;
  rating_count: number;
  is_featured: number;
  created_at: string;
}

export const dynamic = "force-dynamic";

const statusLabels = {
  ongoing: { label: "Em andamento", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  completed: { label: "Completa", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  hiatus: { label: "Hiato", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  dropped: { label: "Droppada", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default async function NovelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const novelRow = db.prepare(`SELECT * FROM novels WHERE slug = ? AND ${publicReadableNovelSql("novels")}`).get(slug) as NovelRow | undefined;
  if (!novelRow) notFound();

  const author = db.prepare("SELECT username, display_name, avatar_url, bio FROM users WHERE id = ?").get(novelRow.author_id) as AuthorRow | undefined;

  const novel = {
    ...novelRow,
    title_en: novelRow.title_en || null,
    title_jp: novelRow.title_jp || null,
    alternative_titles: JSON.parse(novelRow.alternative_titles || "[]"),
    genres: JSON.parse(novelRow.genres || "[]"),
    tags: JSON.parse(novelRow.tags || "[]"),
    rating_avg: novelRow.rating_count > 0 ? novelRow.rating_sum / novelRow.rating_count : 0,
    rating_count: novelRow.rating_count,
    chapter_count: 0,
    is_featured: !!novelRow.is_featured,
    is_approved: true,
    author: author ? { id: novelRow.author_id, ...author, avatar_url: author.avatar_url || undefined, bio: author.bio || undefined, created_at: "" } : undefined,
    updated_at: novelRow.created_at,
  };

  const chapters = db.prepare(`
    SELECT id, chapter_number, title, word_count, published_at
    FROM chapters
    WHERE novel_id = ? AND ${readableNovelChapterSql("chapters")}
    ORDER BY chapter_number ASC
  `).all(novelRow.id) as ChapterRow[];
  novel.chapter_count = chapters.length;

  const related = db.prepare(`
    SELECT * FROM novels n
    WHERE n.id != ? AND n.is_featured = 1 AND ${publicReadableNovelSql("n")}
    LIMIT 4
  `).all(novelRow.id) as NovelRow[];

  const status = statusLabels[novelRow.status];
  const totalWords = chapters.reduce((acc, c) => acc + c.word_count, 0);
  const readingTime = Math.ceil(totalWords / 250);

  const user = await getCurrentUser();
  const isFavorite = user ? !!db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND novel_id = ?").get(user.id, novelRow.id) : false;

  return (
    <div>
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(135deg, var(--primary) 0%, transparent 70%)` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 -mt-40 relative z-10">
        <Button variant="ghost" asChild className="mb-6 -ml-2 backdrop-blur-sm">
          <Link href="/explore">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao catálogo
          </Link>
        </Button>

        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          <aside className="space-y-4">
            <div className="w-full max-w-[280px]">
              <NovelCover novel={novel as any} className="aspect-[3/4] shadow-2xl shadow-primary/20" />
            </div>

            <div className="space-y-2">
              {chapters.length > 0 && (
                <Button asChild className="w-full" size="lg">
                  <Link href={`/novels/${novelRow.slug}/1`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Começar a ler
                  </Link>
                </Button>
              )}
              {user && (
                <form action={async () => {
                  "use server";
                  const dbase = getDb();
                  if (isFavorite) {
                    dbase.prepare("DELETE FROM favorites WHERE user_id = ? AND novel_id = ?").run(user.id, novelRow.id);
                  } else {
                    dbase.prepare("INSERT INTO favorites (user_id, novel_id) VALUES (?, ?)").run(user.id, novelRow.id);
                  }
                  revalidatePath(`/novels/${slug}`);
                }}>
                  <Button variant="outline" className="w-full" type="submit">
                    <Heart className={`h-4 w-4 mr-2 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                    {isFavorite ? "Favoritado" : "Favoritar"}
                  </Button>
                </form>
              )}
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              {author && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Autor</span>
                  <Link href={`/authors/${author.username}`} className="flex items-center gap-2 hover:text-primary">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                        {author.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{author.display_name}</span>
                  </Link>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Capítulos</span>
                <span className="font-medium">{chapters.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Leituras</span>
                <span className="font-medium">{novelRow.views.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Tempo de leitura</span>
                <span className="font-medium">~{readingTime} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={status.className}>{status.label}</Badge>
              </div>
            </div>
          </aside>

          <div className="space-y-8">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {novel.genres.map((g: string) => (
                  <Link key={g} href={`/explore?genre=${encodeURIComponent(g)}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">{g}</Badge>
                  </Link>
                ))}
              </div>
              <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight"><NovelTitle novel={novel as any} /></h1>
              {novel.alternative_titles.length > 0 && (
                <p className="text-muted-foreground mt-2 text-sm">também: {novel.alternative_titles.join(", ")}</p>
              )}
            </div>

            <Tabs defaultValue="sinopse" className="w-full">
              <TabsList>
                <TabsTrigger value="sinopse">Sinopse</TabsTrigger>
                <TabsTrigger value="capitulos">Capítulos ({chapters.length})</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="sinopse" className="space-y-6 mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground leading-relaxed text-lg whitespace-pre-line">{novelRow.synopsis}</p>
                  </CardContent>
                </Card>
                {novel.tags.length > 0 && (
                  <div>
                    <h3 className="font-heading text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {novel.tags.map((t: string) => (
                        <Badge key={t} variant="outline" className="hover:bg-primary/10 cursor-pointer">#{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="capitulos" className="mt-6">
                {chapters.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <ListOrdered className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Nenhum capítulo publicado ainda.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {chapters.map((c) => (
                      <Link key={c.id} href={`/novels/${novelRow.slug}/${c.chapter_number}`} className="block">
                        <Card className="hover:border-primary/50 transition-all hover:bg-accent/30">
                          <CardContent className="py-4 flex items-center gap-4">
                            <div className="font-heading text-2xl font-bold text-primary/40 w-12 text-center">
                              {String(c.chapter_number).padStart(2, "0")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{c.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {c.word_count.toLocaleString("pt-BR")} palavras · {new Date(c.published_at).toLocaleDateString("pt-BR")} · ~{Math.ceil(c.word_count / 250)} min
                              </p>
                            </div>
                            <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Reviews em breve.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {related.length > 0 && (
              <div className="pt-8 border-t border-border/40">
                <h2 className="font-heading text-2xl font-bold mb-6">Você pode gostar</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {related.map((r) => {
                    const rn = {
                      ...r,
                      alternative_titles: JSON.parse(r.alternative_titles || "[]"),
                      genres: JSON.parse(r.genres || "[]"),
                      tags: JSON.parse(r.tags || "[]"),
                      rating_avg: r.rating_count > 0 ? r.rating_sum / r.rating_count : 0,
                      chapter_count: 0,
                      is_featured: !!r.is_featured,
                      is_approved: true,
                      updated_at: r.created_at,
                    };
                    return <NovelCard key={r.id} novel={rn as any} variant="compact" />;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
