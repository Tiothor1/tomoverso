import Link from "next/link";
import { BookOpen, PenLine, Eye, Heart, MessageCircle, Star, Users, TrendingUp, Plus, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { mockNovels, mockChapters, mockAuthor } from "@/lib/data/mock-novels";

export const metadata = {
  title: "Painel do Autor — Tomoverso",
};

const authorNovels = mockNovels.filter((n) => n.author_id === mockAuthor.id);

export default function DashboardPage() {
  const totalChapters = authorNovels.reduce((acc, n) => acc + n.chapter_count, 0);
  const totalViews = authorNovels.reduce((acc, n) => acc + n.views, 0) + 1247; // mock extra

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">Painel do Autor</h1>
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

      {/* Stats globais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Novels", value: authorNovels.length, icon: BookOpen, color: "text-blue-500" },
          { label: "Capítulos", value: totalChapters, icon: PenLine, color: "text-emerald-500" },
          { label: "Leituras totais", value: totalViews.toLocaleString("pt-BR"), icon: Eye, color: "text-purple-500" },
          { label: "Seguidores", value: "1.2k", icon: Users, color: "text-pink-500" },
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

      {/* Tabs visuais */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de novels */}
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
                <p className="text-sm text-muted-foreground">
                  Comece criando sua primeira Light Novel
                </p>
                <Button asChild className="mt-2">
                  <Link href="/dashboard/novels/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeira novel
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {authorNovels.map((novel) => (
                <Card key={novel.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="w-16 h-20 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-heading text-2xl font-bold text-primary/40 flex-shrink-0">
                        {novel.title.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-heading text-lg font-semibold line-clamp-1">
                              {novel.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge
                                variant={novel.status === "ongoing" ? "default" : "secondary"}
                                className="text-[10px]"
                              >
                                {novel.status === "ongoing" ? "Em andamento" : novel.status}
                              </Badge>
                              <span>·</span>
                              <span>{novel.chapter_count} caps</span>
                              <span>·</span>
                              <span>{novel.views.toLocaleString("pt-BR")} leituras</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/novels/${novel.slug}`}>
                              Ver página
                            </Link>
                          </Button>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button size="sm" asChild>
                            <Link href={`/dashboard/novels/${novel.id}/chapters/new`}>
                              <PenLine className="h-3 w-3 mr-1" />
                              Escrever
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/novels/${novel.id}/edit`}>
                              Editar
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/dashboard/novels/${novel.id}/analytics`}>
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Métricas
                            </Link>
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

        {/* Sidebar: atividade + dicas */}
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-4 w-4 text-primary" />
                Atividade recente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Heart, text: "12 novos seguidores", time: "hoje" },
                { icon: MessageCircle, text: "5 novos comentários", time: "ontem" },
                { icon: Star, text: "Primeira review 5⭐", time: "3 dias" },
                { icon: Eye, text: "Marco de 1.000 leituras!", time: "1 sem" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <a.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div>{a.text}</div>
                    <div className="text-xs text-muted-foreground">{a.time}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6 space-y-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <h3 className="font-heading text-lg font-semibold">
                Dica de hoje
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Capítulos publicados às terças e sextas têm 30% mais leituras.
                Considere criar um calendário regular de postagem.
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/how-to">Ver mais dicas</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
