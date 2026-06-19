import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, Users, Eye, Star, Calendar, ArrowRight, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NovelCard } from "@/components/novel/novel-card";
import { mockNovels, mockAuthor } from "@/lib/data/mock-novels";

export async function generateStaticParams() {
  return [{ username: mockAuthor.username }];
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const author = mockAuthor.username === username ? mockAuthor : null;
  if (!author) notFound();

  const authorNovels = mockNovels.filter((n) => n.author_id === author.id);
  const totalChapters = authorNovels.reduce(
    (acc, n) => acc + n.chapter_count,
    0
  );
  const totalViews = authorNovels.reduce((acc, n) => acc + n.views, 0);

  return (
    <div>
      {/* Banner com gradiente */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, var(--primary) 0%, transparent 50%), radial-gradient(circle at 80% 30%, var(--primary) 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="container mx-auto max-w-5xl px-4 -mt-20 relative z-10">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                  {author.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <h1 className="font-heading text-3xl md:text-4xl font-bold">
                  {author.display_name}
                </h1>
                <p className="text-muted-foreground">@{author.username}</p>
                <p className="text-foreground/90 max-w-2xl leading-relaxed">
                  {author.bio}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    Desde {new Date(author.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </Badge>
                  <Badge variant="secondary">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {authorNovels.length} novels
                  </Badge>
                  <Badge variant="secondary">
                    <PenLine className="h-3 w-3 mr-1" />
                    {totalChapters} capítulos
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button>Seguir</Button>
                <Button variant="outline">Mensagem</Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/40">
              {[
                { label: "Novels", value: authorNovels.length, icon: BookOpen },
                { label: "Capítulos", value: totalChapters, icon: PenLine },
                { label: "Leituras", value: totalViews.toLocaleString("pt-BR"), icon: Eye },
                { label: "Seguidores", value: "1.2k", icon: Users },
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

        {/* Tabs de conteúdo */}
        <Tabs defaultValue="novels" className="mt-8">
          <TabsList>
            <TabsTrigger value="novels">Novels ({authorNovels.length})</TabsTrigger>
            <TabsTrigger value="sobre">Sobre</TabsTrigger>
            <TabsTrigger value="atividades">Atividade</TabsTrigger>
          </TabsList>

          <TabsContent value="novels" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {authorNovels.map((n) => (
                <NovelCard key={n.id} novel={n} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sobre" className="mt-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-heading text-xl font-semibold">Sobre {author.display_name}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {author.bio}
                </p>
                <div>
                  <h4 className="font-semibold mb-2">Gêneros que escreve</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(authorNovels.flatMap((n) => n.genres))).map((g) => (
                      <Badge key={g} variant="outline">{g}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atividades" className="mt-6">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Timeline de publicações em breve.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
