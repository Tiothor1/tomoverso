"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  Users,
  Compass,
  PenLine,
  Heart,
  Settings,
  Home,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  X,
} from "lucide-react";
import { mockNovels, mockChapters, mockAuthor } from "@/lib/data/mock-novels";
import Fuse from "fuse.js";

type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  group: "Página" | "Novel" | "Capítulo" | "Ação" | "Gênero";
  keywords?: string[];
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  // Cmd+K / Ctrl+K pra abrir
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset quando fecha
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      { id: "home", title: "Início", icon: Home, action: () => router.push("/"), group: "Página" },
      { id: "explore", title: "Explorar novels", icon: Compass, action: () => router.push("/explore"), group: "Página" },
      { id: "search", title: "Buscar", icon: Search, action: () => router.push("/search"), group: "Página" },
      { id: "how-to", title: "Como criar uma LN", icon: BookOpen, action: () => router.push("/how-to"), group: "Página" },
      { id: "sobre", title: "Sobre o Tomoverso", icon: Heart, action: () => router.push("/sobre"), group: "Página" },
      { id: "dashboard", title: "Painel do autor", icon: PenLine, action: () => router.push("/dashboard"), group: "Página" },
      { id: "library", title: "Minha estante", icon: BookOpen, action: () => router.push("/library"), group: "Página" },
      { id: "new-novel", title: "Criar nova novel", icon: PenLine, action: () => router.push("/dashboard/novels/new"), group: "Ação" },
      { id: "settings", title: "Configurações de leitura", icon: Settings, action: () => {
        // Rola até o botão de settings do leitor se tiver
        document.querySelector('[title="Configurações de leitura"]')?.parentElement?.querySelector("button")?.click();
      }, group: "Ação" },
    ];

    // Adiciona novels
    mockNovels.forEach((n) => {
      list.push({
        id: `novel-${n.id}`,
        title: n.title,
        subtitle: `por ${n.author?.display_name} · ${n.genres.join(", ")}`,
        icon: BookOpen,
        action: () => router.push(`/novels/${n.slug}`),
        group: "Novel",
        keywords: [n.synopsis, ...n.genres, ...n.tags, n.author?.display_name || ""],
      });
    });

    // Adiciona capítulos
    mockChapters.forEach((c) => {
      const novel = mockNovels.find((n) => n.id === c.novel_id);
      if (!novel) return;
      list.push({
        id: `chapter-${c.id}`,
        title: `Cap ${c.chapter_number}: ${c.title}`,
        subtitle: `de "${novel.title}"`,
        icon: BookOpen,
        action: () => router.push(`/novels/${novel.slug}/${c.chapter_number}`),
        group: "Capítulo",
        keywords: [novel.title, c.title, c.content.slice(0, 200)],
      });
    });

    // Adiciona gêneros
    const genres = Array.from(new Set(mockNovels.flatMap((n) => n.genres)));
    genres.forEach((g) => {
      list.push({
        id: `genre-${g}`,
        title: g,
        subtitle: "Filtrar por gênero",
        icon: Sparkles,
        action: () => router.push(`/explore?genre=${encodeURIComponent(g)}`),
        group: "Gênero",
      });
    });

    return list;
  }, [router]);

  // Fuse search
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "title", weight: 3 },
          { name: "subtitle", weight: 1 },
          { name: "keywords", weight: 1 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
      }),
    [items]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 12);
    return fuse.search(query).slice(0, 20).map((r) => r.item);
  }, [query, items, fuse]);

  // Reset active idx quando filtered muda
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[activeIdx];
        if (item) {
          item.action();
          setOpen(false);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIdx]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md border border-border/50 bg-secondary/30 text-sm text-muted-foreground hover:bg-secondary/60 hover:border-border transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    );
  }

  // Group filtered items
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={() => setOpen(false)}
      />
      <div className="fixed top-[10vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-top-4">
        <div className="rounded-xl border border-border/50 bg-card shadow-2xl shadow-primary/10 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              placeholder="Buscar novels, capítulos, gêneros, páginas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex h-6 select-none items-center rounded border border-border/50 bg-muted/50 px-2 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
            <button
              onClick={() => setOpen(false)}
              className="md:hidden text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum resultado pra "{query}"
              </div>
            ) : (
              Object.entries(grouped).map(([group, groupItems]) => (
                <div key={group} className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </div>
                  <div className="space-y-0.5">
                    {groupItems.map((item) => {
                      const globalIdx = filtered.indexOf(item);
                      const isActive = globalIdx === activeIdx;
                      return (
                        <button
                          key={item.id}
                          onMouseEnter={() => setActiveIdx(globalIdx)}
                          onClick={() => {
                            item.action();
                            setOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                            isActive
                              ? "bg-primary/15 text-foreground"
                              : "text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <div className={`p-1.5 rounded-md ${isActive ? "bg-primary/20" : "bg-muted/50"}`}>
                            <item.icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          {isActive && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/40 bg-muted/20 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 h-4 inline-flex items-center rounded border border-border/50 bg-muted/50 font-mono">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 h-4 inline-flex items-center rounded border border-border/50 bg-muted/50 font-mono">↵</kbd>
                abrir
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 h-4 inline-flex items-center rounded border border-border/50 bg-muted/50 font-mono">esc</kbd>
                fechar
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>Tomoverso</span>
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
