"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Hash,
  Loader2,
  PenLine,
  Search as SearchIcon,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const filters = [
  { id: "all", label: "Tudo" },
  { id: "light-novel", label: "Light Novels" },
  { id: "manga", label: "Mangás" },
  { id: "chapters", label: "Capítulos" },
  { id: "authors", label: "Autores" },
  { id: "genres", label: "Gêneros" },
  { id: "pages", label: "Páginas" },
] as const;

type FilterId = (typeof filters)[number]["id"];

type SearchItem = {
  id: string;
  type: "light-novel" | "manga" | "chapter" | "author" | "genre" | "page";
  title: string;
  subtitle?: string;
  description?: string;
  href: string;
  cover?: string | null;
  meta?: string[];
};

type SearchGroup = {
  id: string;
  label: string;
  items: SearchItem[];
};

type SearchResponse = {
  query: string;
  filter: FilterId;
  total: number;
  groups: SearchGroup[];
  suggestions: string[];
};

const defaultData: SearchResponse = {
  query: "",
  filter: "all",
  total: 0,
  groups: [],
  suggestions: ["isekai", "sistema", "fantasia", "romance", "Record of Ragnarok", "O Que Eu Desenhei"],
};

const typeConfig: Record<SearchItem["type"], { label: string; icon: typeof BookOpen; tone: string }> = {
  "light-novel": { label: "Light Novel", icon: BookOpen, tone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  manga: { label: "Mangá", icon: Sparkles, tone: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  chapter: { label: "Capítulo", icon: FileText, tone: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  author: { label: "Autor", icon: User, tone: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  genre: { label: "Gênero", icon: Hash, tone: "bg-primary/10 text-primary border-primary/20" },
  page: { label: "Página", icon: ArrowRight, tone: "bg-muted text-muted-foreground border-border" },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text?: string; query: string }) {
  if (!text) return null;
  const clean = query.trim();
  if (!clean) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(clean)})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === clean.toLowerCase() ? (
          <mark key={i} className="rounded bg-primary/20 px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialFilter = (searchParams.get("filter") || "all") as FilterId;

  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<FilterId>(filters.some((f) => f.id === initialFilter) ? initialFilter : "all");
  const [data, setData] = useState<SearchResponse>(defaultData);
  const [loading, setLoading] = useState(false);

  const trimmedQuery = query.trim();

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    const nextFilter = (searchParams.get("filter") || "all") as FilterId;
    setFilter(filters.some((f) => f.id === nextFilter) ? nextFilter : "all");
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (trimmedQuery) params.set("q", trimmedQuery);
        if (filter !== "all") params.set("filter", filter);
        const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setData({ ...defaultData, query: trimmedQuery, filter, groups: [], total: 0 });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, trimmedQuery ? 180 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [trimmedQuery, filter]);

  const resultLabel = useMemo(() => {
    if (!trimmedQuery) return "Explore o catálogo ou digite uma busca";
    if (loading) return "Buscando...";
    if (data.total === 0) return "Nenhum resultado encontrado";
    return `${data.total} resultado${data.total === 1 ? "" : "s"} para “${trimmedQuery}”`;
  }, [trimmedQuery, loading, data.total]);

  function updateUrl(nextQuery = query, nextFilter = filter) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextFilter !== "all") params.set("filter", nextFilter);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateUrl(query, filter);
  }

  function chooseFilter(nextFilter: FilterId) {
    setFilter(nextFilter);
    updateUrl(query, nextFilter);
  }

  function chooseSuggestion(value: string) {
    setQuery(value);
    updateUrl(value, filter);
  }

  return (
    <div className="min-h-[70vh] bg-[radial-gradient(circle_at_top,rgba(180,130,70,0.12),transparent_38rem)]">
      <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14 space-y-8">
        <section className="rounded-[2rem] border border-border/50 bg-card/70 p-5 shadow-2xl shadow-black/5 backdrop-blur md:p-8">
          <div className="mx-auto max-w-4xl space-y-5 text-center">
            <Badge variant="secondary" className="mx-auto">Busca livre</Badge>
            <div className="space-y-3">
              <h1 className="font-heading text-4xl font-bold tracking-tight md:text-6xl">
                Pesquise como no Google.
              </h1>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg">
                Digite nome, capítulo, autor, gênero, tag ou trecho. O Tomoverso organiza tudo por tipo.
              </p>
            </div>

            <form onSubmit={submitSearch} className="relative mx-auto max-w-3xl">
              <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar novel, mangá, autor, capítulo, gênero..."
                autoFocus
                className="h-16 rounded-2xl border-border/70 bg-background pl-13 pr-28 text-base shadow-lg shadow-black/5 md:text-lg"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Limpar busca"
                  onClick={() => {
                    setQuery("");
                    updateUrl("", filter);
                  }}
                  className="absolute right-24 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Button type="submit" size="lg" className="absolute right-2 top-1/2 h-12 -translate-y-1/2 rounded-xl px-4">
                Buscar
              </Button>
            </form>

            <div className="flex flex-wrap justify-center gap-2">
              {filters.map((item) => (
                <button key={item.id} type="button" onClick={() => chooseFilter(item.id)}>
                  <Badge variant={filter === item.id ? "default" : "outline"} className="h-7 cursor-pointer px-3">
                    {item.label}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Resultados</p>
              <h2 className="font-heading text-2xl font-bold md:text-3xl">{resultLabel}</h2>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> procurando no catálogo...
              </div>
            )}
          </div>

          {data.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-sm text-muted-foreground">Sugestões:</span>
              {data.suggestions.slice(0, 8).map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => chooseSuggestion(suggestion)}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
                    {suggestion}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {data.total === 0 && trimmedQuery && !loading ? (
            <Card className="border-dashed bg-card/60">
              <CardContent className="py-14 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <SearchIcon className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-xl font-semibold">Nenhum resultado encontrado</h3>
                <p className="mt-2 text-muted-foreground">
                  Tente um nome mais curto, outro gênero, ou pesquise pelo autor.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-7">
              {data.groups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading text-xl font-bold">{group.label}</h3>
                    <span className="text-sm text-muted-foreground">{group.items.length}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.items.map((item) => (
                      <SearchResultCard key={`${group.id}-${item.id}-${item.href}`} item={item} query={trimmedQuery} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SearchResultCard({ item, query }: { item: SearchItem; query: string }) {
  const config = typeConfig[item.type];
  const Icon = config.icon;
  const hasCover = !!item.cover;

  return (
    <Link href={item.href} className="group block">
      <Card className="h-full overflow-hidden border-border/50 bg-card/80 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
        <CardContent className="flex gap-4 p-3 md:p-4">
          <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted md:h-28 md:w-20">
            {hasCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.cover!} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-background to-secondary/20">
                <Icon className="h-7 w-7 text-muted-foreground/70" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={config.tone}>{config.label}</Badge>
              {item.subtitle && <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>}
            </div>
            <h4 className="font-heading text-base font-bold leading-snug group-hover:text-primary md:text-lg">
              <Highlight text={item.title} query={query} />
            </h4>
            {item.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                <Highlight text={item.description} query={query} />
              </p>
            )}
            {item.meta && item.meta.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.meta.slice(0, 4).map((meta) => (
                  <span key={meta} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Highlight text={meta} query={query} />
                  </span>
                ))}
              </div>
            )}
          </div>
          <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </CardContent>
      </Card>
    </Link>
  );
}
