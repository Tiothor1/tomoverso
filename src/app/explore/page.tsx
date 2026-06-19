import Link from "next/link";
import { ArrowRight, Search, Filter, Grid3x3, List, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NovelCard } from "@/components/novel/novel-card";
import { mockNovels, mockGenres } from "@/lib/data/mock-novels";

export const metadata = {
  title: "Explorar — Tomoverso",
  description: "Descubra Light Novels brasileiras por gênero, popularidade ou recência.",
};

export default function ExplorePage() {
  const populares = [...mockNovels].sort((a, b) => b.views - a.views);
  const recentes = [...mockNovels].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Badge variant="secondary">Catálogo</Badge>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
          Explorar
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Descubra a próxima história que vai te prender por horas. Filtros por gênero, popularidade, status.
        </p>
      </div>

      {/* Search + filtros */}
      <div className="flex flex-col sm:flex-row gap-3 sticky top-16 z-30 py-3 bg-background/80 backdrop-blur-md -mx-4 px-4 border-b border-border/40">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, autor ou tag..."
            className="pl-9 h-11"
          />
        </div>
        <Button variant="outline" className="h-11">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Tags rápidas */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          Gêneros populares
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" className="cursor-pointer">Todos</Badge>
          {mockGenres.map((g) => (
            <Badge key={g} variant="outline" className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors">
              {g}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="todos" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="destaque">
              <span className="hidden sm:inline">⭐ </span>Em destaque
            </TabsTrigger>
            <TabsTrigger value="populares">Populares</TabsTrigger>
            <TabsTrigger value="recentes">Recentes</TabsTrigger>
          </TabsList>
          <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
            <span>Ordenar:</span>
            <Button variant="ghost" size="sm">Relevância</Button>
          </div>
        </div>

        <TabsContent value="todos" className="mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockNovels.map((n) => (
              <NovelCard key={n.id} novel={n} variant="compact" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="destaque" className="mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockNovels
              .filter((n) => n.is_featured)
              .map((n) => (
                <NovelCard key={n.id} novel={n} variant="compact" />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="populares" className="mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {populares.map((n) => (
              <NovelCard key={n.id} novel={n} variant="compact" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recentes" className="mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recentes.map((n) => (
              <NovelCard key={n.id} novel={n} variant="compact" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
