import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Star,
  Calendar,
  User,
  Heart,
  Share2,
  Bookmark,
  MessageCircle,
  ListOrdered,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NovelCover } from "@/components/novel/novel-cover";
import { NovelCard } from "@/components/novel/novel-card";
import { mockNovels, mockChapters } from "@/lib/data/mock-novels";

export async function generateStaticParams() {
  return mockNovels.map((n) => ({ slug: n.slug }));
}

const statusLabels = {
  ongoing: { label: "Em andamento", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  completed: { label: "Completa", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  hiatus: { label: "Hiato", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  dropped: { label: "Droppada", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default async function NovelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const novel = mockNovels.find((n) => n.slug === slug);
  if (!novel) notFound();

  const chapters = mockChapters
    .filter((c) => c.novel_id === novel.id)
    .sort((a, b) => a.chapter_number - b.chapter_number);

  const status = statusLabels[novel.status];
  const totalWords = chapters.reduce((acc, c) => acc + c.word_count, 0);
  const readingTime = Math.ceil(totalWords / 250); // 250 palavras por minuto

  const related = mockNovels
    .filter((n) => n.id !== novel.id && n.genres.some((g) => novel.genres.includes(g)))
    .slice(0, 4);

  return (
    <div>
      {/* Banner superior com gradiente */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(135deg, var(--primary) 0%, transparent 70%)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, var(--primary) 0%, transparent 50%), radial-gradient(circle at 80% 30%, var(--primary) 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="container mx-auto max-w-6xl px-4 -mt-40 relative z-10">
        <Button variant="ghost" asChild className="mb-6 -ml-2 backdrop-blur-sm">
          <Link href="/explore">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao catálogo
          </Link>
        </Button>

        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          {/* Capa + actions sticky */}
          <aside className="space-y-4">
            <div className="w-full max-w-[280px]">
              <NovelCover novel={novel} className="aspect-[3/4] shadow-2xl shadow-primary/20" />
            </div>

            <div className="space-y-2">
              {chapters.length > 0 && (
                <Button asChild className="w-full" size="lg">
                  <Link href={`/novels/${novel.slug}/1`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Começar a ler
                  </Link>
                </Button>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="icon" title="Favoritar">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" title="Salvar">
                  <Bookmark className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" title="Compartilhar">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Autor</span>
                <Link
                  href={`/authors/${novel.author?.username}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                      {novel.author?.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{novel.author?.display_name}</span>
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> Capítulos
                </span>
                <span className="font-medium">{chapters.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Leituras
                </span>
                <span className="font-medium">{novel.views > 0 ? novel.views.toLocaleString("pt-BR") : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> Avaliação
                </span>
                <span className="font-medium flex items-center gap-1">
                  {novel.rating_avg || "—"}
                  <span className="text-xs text-muted-foreground">({novel.rating_count})</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Tempo de leitura
                </span>
                <span className="font-medium">~{readingTime} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Início
                </span>
                <span className="font-medium">
                  {new Date(novel.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              </div>
            </div>
          </aside>

          {/* Conteúdo principal */}
          <div className="space-y-8">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {novel.genres.map((g) => (
                  <Link
                    key={g}
                    href={`/explore?genre=${encodeURIComponent(g)}`}
                  >
                    <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
                      {g}
                    </Badge>
                  </Link>
                ))}
              </div>
              <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
                {novel.title}
              </h1>
              {novel.alternative_titles && novel.alternative_titles.length > 0 && (
                <p className="text-muted-foreground mt-2 text-sm">
                  também conhecida como: {novel.alternative_titles.join(", ")}
                </p>
              )}
            </div>

            <Tabs defaultValue="sinopse" className="w-full">
              <TabsList>
                <TabsTrigger value="sinopse">Sinopse</TabsTrigger>
                <TabsTrigger value="capitulos">
                  Capítulos ({chapters.length})
                </TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="sinopse" className="space-y-6 mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground leading-relaxed text-lg whitespace-pre-line">
                      {novel.synopsis}
                    </p>
                  </CardContent>
                </Card>

                {novel.tags.length > 0 && (
                  <div>
                    <h3 className="font-heading text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {novel.tags.map((t) => (
                        <Badge key={t} variant="outline" className="hover:bg-primary/10 cursor-pointer">
                          #{t}
                        </Badge>
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
                      <p className="text-muted-foreground">
                        Nenhum capítulo publicado ainda.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {chapters.map((c) => (
                      <Link
                        key={c.id}
                        href={`/novels/${novel.slug}/${c.chapter_number}`}
                        className="block"
                      >
                        <Card className="hover:border-primary/50 transition-all hover:bg-accent/30">
                          <CardContent className="py-4 flex items-center gap-4">
                            <div className="font-heading text-2xl font-bold text-primary/40 w-12 text-center">
                              {String(c.chapter_number).padStart(2, "0")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{c.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {c.word_count.toLocaleString("pt-BR")} palavras ·{" "}
                                {new Date(c.published_at).toLocaleDateString("pt-BR")} ·{" "}
                                ~{Math.ceil(c.word_count / 250)} min
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
                    <p className="text-muted-foreground mb-3">
                      Reviews em breve. Faça login e seja o primeiro a avaliar.
                    </p>
                    <Button asChild variant="outline">
                      <Link href="/auth/login">Entrar pra avaliar</Link>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Novels relacionadas */}
            {related.length > 0 && (
              <div className="pt-8 border-t border-border/40">
                <h2 className="font-heading text-2xl font-bold mb-6">
                  Você pode gostar
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {related.map((n) => (
                    <NovelCard key={n.id} novel={n} variant="compact" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
