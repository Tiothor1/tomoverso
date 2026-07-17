"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HeaderSearchProps {
  className?: string;
}

type CatalogFilters = {
  kind: string;
  status: string;
  sort: string;
};

const catalogFilterKeys = ["kind", "status", "sort", "genre", "tag", "original", "popular", "recent", "author", "minChapters", "page"];

function CatalogFilterMenu({ searchParamsString }: { searchParamsString: string }) {
  const router = useRouter();
  const searchParams = new URLSearchParams(searchParamsString);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<CatalogFilters>({
    kind: searchParams.get("kind") || "all",
    status: searchParams.get("status") || "all",
    sort: searchParams.get("sort") || "popular",
  });

  function setFilter(name: keyof CatalogFilters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function apply() {
    const params = new URLSearchParams(searchParamsString);
    params.delete("page");

    for (const [name, value] of Object.entries(filters)) {
      if ((name === "kind" || name === "status") && value === "all") params.delete(name);
      else if (name === "sort" && value === "popular") params.delete(name);
      else params.set(name, value);
    }

    router.push(`/explore${params.size ? `?${params.toString()}` : ""}`);
    setOpen(false);
  }

  function clear() {
    const params = new URLSearchParams(searchParamsString);
    for (const key of catalogFilterKeys) params.delete(key);
    router.push(`/explore${params.size ? `?${params.toString()}` : ""}`);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Abrir filtros do catálogo"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-muted/35 text-muted-foreground transition hover:border-primary/45 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "border-primary/45 bg-primary/10 text-primary"
        )}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div role="dialog" aria-label="Filtros do catálogo" className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-border/70 bg-popover p-2 shadow-xl ring-1 ring-black/5">
          <div className="mb-1 px-1 text-xs font-bold text-foreground">Filtrar catálogo</div>
          <div className="space-y-1.5">
            <label className="block">
              <span className="sr-only">Tipo</span>
              <select aria-label="Tipo" value={filters.kind} onChange={(event) => setFilter("kind", event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-primary/60">
                <option value="all">Todos os tipos</option>
                <option value="novel">Novels</option>
                <option value="manga">Mangás</option>
                <option value="manhwa">Manhwas</option>
                <option value="book">Livros</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Status</span>
              <select aria-label="Status" value={filters.status} onChange={(event) => setFilter("status", event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-primary/60">
                <option value="all">Todos os status</option>
                <option value="ongoing">Em andamento</option>
                <option value="completed">Completos</option>
                <option value="hiatus">Hiato</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Ordenar</span>
              <select aria-label="Ordenar" value={filters.sort} onChange={(event) => setFilter("sort", event.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:border-primary/60">
                <option value="popular">Mais populares</option>
                <option value="updated">Atualizados</option>
                <option value="chapters">Mais capítulos</option>
                <option value="title">A–Z</option>
              </select>
            </label>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={clear} className="h-8 flex-1 rounded-md border border-border text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Limpar</button>
            <button type="button" onClick={apply} className="h-8 flex-1 rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90">Aplicar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HeaderSearchContent({ className, pathname, searchParamsString }: HeaderSearchProps & { pathname: string; searchParamsString: string }) {
  const router = useRouter();
  const searchParams = new URLSearchParams(searchParamsString);
  const isCatalog = pathname === "/explore";
  const [query, setQuery] = useState(searchParams.get("q") || "");

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();

    if (isCatalog) {
      const params = new URLSearchParams(searchParamsString);
      params.delete("page");
      if (q) params.set("q", q);
      else params.delete("q");
      router.push(`/explore${params.size ? `?${params.toString()}` : ""}`);
      return;
    }

    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <form onSubmit={submit} className="group relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar..."
          aria-label="Buscar obras"
          className="h-9 rounded-full border-border/70 bg-muted/35 pl-8 pr-10 text-sm shadow-none focus-visible:border-primary/45 focus-visible:bg-background focus-visible:ring-primary/20"
        />
        {query ? (
          <button
            type="button"
            aria-label="Limpar pesquisa"
            onClick={() => setQuery("")}
            className="absolute right-11 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="submit"
          aria-label="Buscar"
          className="absolute right-1.5 top-1/2 flex h-7 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </form>
      {isCatalog ? <CatalogFilterMenu key={searchParamsString} searchParamsString={searchParamsString} /> : null}
    </div>
  );
}

export function HeaderSearch({ className }: HeaderSearchProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  return <HeaderSearchContent key={`${pathname}?${searchParamsString}`} className={className} pathname={pathname} searchParamsString={searchParamsString} />;
}
