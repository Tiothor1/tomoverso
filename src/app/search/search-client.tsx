"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search as SearchIcon, ArrowRight, BookOpen, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NovelCard } from "@/components/novel/novel-card";
import { mockNovels, mockChapters } from "@/lib/data/mock-novels";
import Fuse from "fuse.js";

const topSearches = [
  "Sistema de Level Up",
  "Isekai escolar",
  "Regressão",
  "Cultivo moderno",
  "Romance mágico",
  "Murim",
];

const topAuthors = [
  { name: "Yuki_Yamato", works: 5 },
  { name: "fabio_tx", works: 3 },
  { name: "MiaHime", works: 2 },
];

export default function SearchClient() {
  const [query, setQuery] = useState("");

  const fuseNovels = useMemo(
    () =>
      new Fuse(mockNovels, {
        keys: [
          { name: "title", weight: 3 },
          { name: "synopsis", weight: 1 },
          { name: "genres", weight: 2 },
          { name: "tags", weight: 1 },
          { name: "author.display_name", weight: 2 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    []
  );

  const fuseChapters = useMemo(
    () =>
      new Fuse(mockChapters, {
        keys: [
          { name: "title", weight: 3 },
          { name: "content", weight: 1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 4,
      }),
    []
  );

  const novelResults = useMemo(() => {
    if (!query.trim()) return [];
    return fuseNovels.search(query).slice(0, 8).map((r) => r.item);
  }, [query, fuseNovels]);

  const chapterResults = useMemo(() => {
    if (!query.trim() || query.length < 4) return [];
    return fuseChapters.search(query).slice(0, 5).map((r) => r.item);
  }, [query, fuseChapters]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 space-y-10">
      <div className="space-y-4">
        <Badge variant="secondary">Busca</Badge>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
          O que você procura?
        </h1>
        <p className="text-muted-foreground text-lg">
          Busque por título, autor, tag ou trecho da história.
        </p>
      </div>

      {/* Search bar grande */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Tente 'isekai', 'cultivo', 'sistema', ou nome de autor..."
          className="pl-12 pr-12 h-14 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Resultados (se tiver query) */}
      {query.trim() && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
          {novelResults.length > 0 && (
            <div>
              <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Novels ({novelResults.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {novelResults.map((n) => (
                  <NovelCard key={n.id} novel={n} variant="compact" />
                ))}
              </div>
            </div>
          )}

          {chapterResults.length > 0 && (
            <div>
              <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Trechos em capítulos ({chapterResults.length})
              </h2>
              <div className="space-y-2">
                {chapterResults.map((c) => {
                  const novel = mockNovels.find((n) => n.id === c.novel_id);
                  if (!novel) return null;
                  return (
                    <Link
                      key={c.id}
                      href={`/novels/${novel.slug}/${c.chapter_number}`}
                      className="block"
                    >
                      <Card className="hover:border-primary/50 hover:bg-accent/30 transition-all">
                        <CardContent className="py-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="flex-shrink-0">
                              Cap {c.chapter_number}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {c.title}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                de "{novel.title}" — trecho encontrado
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {novelResults.length === 0 && chapterResults.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="text-5xl">🔍</div>
              <h3 className="font-heading text-lg font-semibold">
                Nada encontrado
              </h3>
              <p className="text-muted-foreground text-sm">
                Tente outras palavras-chave ou gênero.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sugestões iniciais */}
      {!query.trim() && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-heading font-semibold">Mais buscados</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topSearches.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => setQuery(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-heading font-semibold">Autores populares</h3>
                </div>
                <div className="space-y-2">
                  {topAuthors.map((a) => (
                    <Link
                      key={a.name}
                      href={`/authors/${a.name}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{a.works} obras</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold">Sendo lidos agora</h2>
              <Button variant="ghost" asChild>
                <Link href="/explore">
                  Ver tudo <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {mockNovels.slice(0, 4).map((n) => (
                <NovelCard key={n.id} novel={n} variant="compact" />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
