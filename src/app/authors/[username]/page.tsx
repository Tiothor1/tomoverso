import Link from "next/link";
import { BookOpen, Users, Eye, Star, Calendar, ArrowRight, PenLine, MessageCircle, Send, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NovelCard } from "@/components/novel/novel-card";
import { getDb } from "@/lib/db";
import { publicReadableNovelSql, readableNovelChapterSql } from "@/lib/public-catalog";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

export const dynamic = "force-dynamic";

export default async function AuthorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let db;
  try { db = getDb(); } catch { db = null; }

  if (!db) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Serviço temporariamente indisponível</h1>
          <p className="text-muted-foreground">O banco de dados ainda está sendo carregado. Tente recarregar a página em alguns segundos.</p>
          <a href={`/authors/${username}`} className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground">Recarregar</a>
        </div>
      </div>
    );
  }

  const author = db.prepare("SELECT * FROM users WHERE username = ? AND (email IS NULL OR email NOT LIKE '%@external.author')").get(username) as UserRow | undefined;
  if (!author) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
          <p className="text-muted-foreground">Este autor não foi encontrado. Pode ser que o banco de dados ainda esteja sendo carregado.</p>
          <a href={`/authors/${username}`} className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground">Tentar novamente</a>
        </div>
      </div>
    );
  }
  const safeAuthor = author!;

  const authorNovels = db.prepare(`
    SELECT n.*, (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND ${readableNovelChapterSql("c")}) as chapter_count
    FROM novels n WHERE n.author_id = ? AND ${publicReadableNovelSql("n")} ORDER BY n.created_at DESC
  `).all(author.id) as any[];

  const totalChapters = authorNovels.reduce((acc, n) => acc + (n.chapter_count || 0), 0);
  const totalViews = authorNovels.reduce((acc, n) => acc + n.views, 0);
  const followers = (db.prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?").get(author.id) as { c: number }).c;

  const currentUser = await getCurrentUser().catch(() => null);
  const isFollowing = currentUser ? !!db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?").get(currentUser.id, safeAuthor.id) : false;
  const isOwnProfile = currentUser?.id === safeAuthor.id;

  const parseNovel = (r: any) => ({
    ...r,
    alternative_titles: JSON.parse(r.alternative_titles || "[]"),
    genres: JSON.parse(r.genres || "[]"),
    tags: JSON.parse(r.tags || "[]"),
    rating_avg: r.rating_count > 0 ? r.rating_sum / r.rating_count : 0,
    is_featured: !!r.is_featured,
    is_approved: true,
    updated_at: r.created_at,
    author: { id: author.id, username: author.username, display_name: author.display_name, created_at: author.created_at },
  });

  async function toggleFollow() {
    "use server";
    if (!currentUser || isOwnProfile) return;
    const dbase = getDb();
    if (isFollowing) {
      dbase.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(currentUser.id, safeAuthor.id);
    } else {
      dbase.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(currentUser.id, safeAuthor.id);
    }
    revalidatePath(`/authors/${username}`);
  }

  return (
    <div>
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(circle at 20% 50%, var(--primary) 0%, transparent 50%), radial-gradient(circle at 80% 30%, var(--primary) 0%, transparent 50%)` }} />
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-20 relative z-10">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                  {author.display_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-heading text-3xl md:text-4xl font-bold">{safeAuthor.display_name}</h1>
                  {author.role === "admin" && <Badge variant="destructive" className="text-[10px]">Admin</Badge>}
                  {author.role === "author" && <Badge variant="default" className="text-[10px]">Autor</Badge>}
                </div>
                <p className="text-muted-foreground">@{safeAuthor.username}</p>
                {author.bio && <p className="text-foreground/90 max-w-2xl leading-relaxed">{safeAuthor.bio}</p>}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    Desde {new Date(author.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </Badge>
                  <Badge variant="secondary"><BookOpen className="h-3 w-3 mr-1" />{authorNovels.length} novels</Badge>
                  <Badge variant="secondary"><PenLine className="h-3 w-3 mr-1" />{totalChapters} capítulos</Badge>
                </div>
              </div>

              <div className="flex gap-2">
                {!isOwnProfile && currentUser && (
                  <form action={toggleFollow}>
                    <Button type="submit" variant={isFollowing ? "outline" : "default"}>
                      {isFollowing ? "Seguindo" : "Seguir"}
                    </Button>
                  </form>
                )}
                {isOwnProfile && (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/settings">Editar perfil</Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/40">
              {[
                { label: "Novels", value: authorNovels.length, icon: BookOpen },
                { label: "Capítulos", value: totalChapters, icon: PenLine },
                { label: "Leituras", value: totalViews.toLocaleString("pt-BR"), icon: Eye },
                { label: "Seguidores", value: followers, icon: Users },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 rounded-lg bg-muted/30">
                  <s.icon className="h-4 w-4 mx-auto text-primary mb-1" />
                  <div className="text-xl font-heading font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="novels" className="mt-8">
          <TabsList>
            <TabsTrigger value="novels">Novels ({authorNovels.length})</TabsTrigger>
            <TabsTrigger value="sobre">Sobre</TabsTrigger>
          </TabsList>

          <TabsContent value="novels" className="mt-6">
            {authorNovels.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {isOwnProfile ? "Você ainda não publicou nenhuma novel" : "Nenhuma novel publicada ainda"}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {authorNovels.map((n) => <NovelCard key={n.id} novel={parseNovel(n) as any} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sobre" className="mt-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-heading text-xl font-semibold">Sobre {safeAuthor.display_name}</h3>
                {author.bio && <p className="text-muted-foreground leading-relaxed">{safeAuthor.bio}</p>}
                <div>
                  <h4 className="font-semibold mb-2">Gêneros</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(authorNovels.flatMap((n) => JSON.parse(n.genres || "[]")))).map((g: any) => (
                      <Badge key={g} variant="outline">{g}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
