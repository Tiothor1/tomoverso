import Link from "next/link";
import { BookOpen, Bookmark, Heart, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { mockNovels, mockChapters } from "@/lib/data/mock-novels";

export const metadata = {
  title: "Minha estante — Tomoverso",
};

export default function LibraryPage() {
  // Mock: usuário "salvou" as 2 primeiras novels e curtiu todas
  const saved = mockNovels.slice(0, 2);
  const reading = mockNovels.slice(0, 3);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
          Minha estante
        </h1>
        <p className="text-muted-foreground mt-1">
          Suas novels, organizadas do seu jeito.
        </p>
      </div>

      <Tabs defaultValue="lendo" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="lendo">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Lendo ({reading.length})
          </TabsTrigger>
          <TabsTrigger value="salvos">
            <Bookmark className="h-3.5 w-3.5 mr-1.5" />
            Salvos ({saved.length})
          </TabsTrigger>
          <TabsTrigger value="favoritos">
            <Heart className="h-3.5 w-3.5 mr-1.5" />
            Favoritos ({mockNovels.length})
          </TabsTrigger>
          <TabsTrigger value="historico">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lendo" className="mt-6 space-y-3">
          {reading.length === 0 ? (
            <EmptyState
              title="Você ainda não começou nenhuma novel"
              desc="Explore o catálogo e clique em 'ler' na primeira capítulo"
            />
          ) : (
            reading.map((novel, i) => {
              const progress = [42, 78, 5][i] || 0;
              return (
                <Card key={novel.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="w-20 h-28 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-heading text-3xl font-bold text-primary/40 flex-shrink-0">
                        {novel.title.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <Link href={`/novels/${novel.slug}`}>
                            <h3 className="font-heading text-lg font-semibold hover:text-primary">
                              {novel.title}
                            </h3>
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            por {novel.author?.display_name}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {novel.synopsis}
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Cap {Math.max(1, Math.ceil((progress / 100) * novel.chapter_count))} de {novel.chapter_count}
                            </span>
                            <span className="text-primary font-medium">{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-primary/60"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" asChild>
                            <Link href={`/novels/${novel.slug}/${Math.max(1, Math.ceil((progress / 100) * novel.chapter_count))}`}>
                              Continuar
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/novels/${novel.slug}`}>Detalhes</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="salvos" className="mt-6 space-y-3">
          {saved.length === 0 ? (
            <EmptyState
              title="Nenhum item salvo"
              desc="Use o bookmark nos capítulos pra ler depois"
            />
          ) : (
            saved.map((novel) => (
              <Card key={novel.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="w-20 h-28 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-heading text-3xl font-bold text-primary/40 flex-shrink-0">
                      {novel.title.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <Link href={`/novels/${novel.slug}`}>
                          <h3 className="font-heading text-lg font-semibold hover:text-primary">
                            {novel.title}
                          </h3>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Salvo há 2 dias
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {novel.synopsis}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/novels/${novel.slug}`}>Ver</Link>
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="favoritos" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mockNovels.map((n) => (
              <Card key={n.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-20 h-28 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-heading text-3xl font-bold text-primary/40">
                      {n.title.charAt(0)}
                    </div>
                    <Link href={`/novels/${n.slug}`}>
                      <h3 className="font-heading text-sm font-semibold hover:text-primary line-clamp-2">
                        {n.title}
                      </h3>
                    </Link>
                    <div className="flex gap-1">
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                    </div>
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link href={`/novels/${n.slug}`}>Ler</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Histórico de leitura em breve
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-2">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
        <Button asChild className="mt-3">
          <Link href="/explore">Explorar novels</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
