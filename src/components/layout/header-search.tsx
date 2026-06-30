"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderSearchProps {
  className?: string;
}

export function HeaderSearch({ className }: HeaderSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <form onSubmit={submit} className={cn("group relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Pesquisar..."
        className="h-10 rounded-full border-primary/10 bg-muted/45 pl-9 pr-14 text-sm shadow-inner focus-visible:border-primary/45 focus-visible:bg-background focus-visible:ring-primary/20 md:pr-20"
      />
      {query && (
        <button
          type="button"
          aria-label="Limpar pesquisa"
          onClick={() => setQuery("")}
          className="absolute right-16 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <Button type="submit" size="sm" className="neon-button absolute right-1 top-1/2 h-8 -translate-y-1/2 rounded-full px-3">
        Ir
      </Button>
    </form>
  );
}
