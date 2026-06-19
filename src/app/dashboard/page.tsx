export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, PenLine, Eye, Users, MessageCircle, Star, TrendingUp, Plus, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logoutAction } from "@/lib/actions/auth-actions";

export const metadata = {
  title: "Painel do Autor — Tomoverso",
};

interface AuthorNovel {
  id: string;
  slug: string;
  title: string;
  status: string;
  views: number;
  chapter_count: number;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = getDb();

  // Stats
  const authorNovels = db.prepare(`
    SELECT n.id, n.slug, n.title, n.status, n.views,
           (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id) as chapter_count
    FROM novels n
    WHERE n.author_id = ?
    ORDER BY n.created_at DESC
  `).all(user.id) as AuthorNovel[];

  const totalChapters = authorNovels.reduce((acc, n) => acc + n.chapter_count, 0);
  const totalViews = authorNovels.reduce((acc, n) => acc + n.views, 0);
  const totalFollowers = (db.prepare("SELECT COUNT(*) as c FROM follows WHERE following_id = ?").get(user.id) as { c: number }).c;
  const totalComments = (db.prepare("SELECT COUNT(*) as c FROM comments c JOIN novels n ON n.id = c.novel_id WHERE n.author_id = ?").get(user.id) as { c: number }).c;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">
            Olá, {user.display_name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas novels, capítulos e métricas
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/novels/new">
            <Plus className="h-4 w-4 mr-2" />
            Nova novel
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Novels", value: authorNovels.length, icon: BookOpen, color: "text-blue-500" },
          { label: "Capítulos", value: totalChapters, icon: PenLine, color: "text-emerald-500" },
          { label: "Leituras", value: totalViews.toLocaleString("pt-BR"), icon: Eye, color: "text-purple-500" },
          { label: "Seguidores", value: totalFollowers, icon: Users, color: "text-pink-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-heading font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">Suas novels</h2>
            <Badge variant="secondary">{authorNovels.length}</Badge>
          </div>

          {authorNovels.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <h3 className="font-heading text-lg font-semibold">Nenhuma novel ainda</h3>
                <p className="text-sm text-muted-foreground">Comece criando sua primeira</p>
                <Button asChild className="mt-2">
                  <Link href="/dashboard/novels/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {authorNovels.map((n) => (
                <Card key={n.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="w-16 h-20 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-heading text-2xl font-bold text-primary/40 flex-shrink-0">
                        {n.title.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-heading text-lg font-semibold line-clamp-1">{n.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant={n.status === "ongoing" ? "default" : "secondary"} className="text-[10px]">
                                {n.status === "ongoing" ? "Em andamento" : n.status}
                              </Badge>
                              <span>·</span>
                              <span>{n.chapter_count} caps</span>
                              <span>·</span>
                              <span>{n.views} leituras</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/novels/${n.slug}`}>Ver página</Link>
                          </Button>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" asChild>
                            <Link href={`/dashboard/novels/${n.id}/chapters/new`}>
                              <PenLine className="h-3 w-3 mr-1" />
                              Escrever
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/novels/${n.id}/edit`}>Editar</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-4 w-4 text-primary" />
                Atividade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {totalComments > 0 ? (
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div>{totalComments} comentários nas suas novels</div>
                  </div>
                </div>
              ) : null}
              <div className="flex items-start gap-3">
                <Star className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <div>Continue postando consistentemente</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6 space-y-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <h3 className="font-heading text-lg font-semibold">Dica de hoje</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Capítulos publicados às terças e sextas têm 30% mais leituras.
                Considere criar um calendário regular de postagem.
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/how-to">Ver mais dicas</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <form action={logoutAction}>
                <Button type="submit" variant="outline" className="w-full">
                  Sair da conta
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
