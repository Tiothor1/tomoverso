"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, BadgeCheck, Flag, Sparkles, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemType = "novel" | "manga";
type CurationLabel = "em_alta" | "novidade_br" | "autor_revelacao" | "";

interface CatalogItem {
  id: string;
  slug: string;
  title: string;
  item_type: ItemType;
  item_id: string;
  is_original: number;
  curation_label: string | null;
  author_name?: string;
  chapter_count?: number;
}

const curationLabels: { value: CurationLabel; label: string; icon: typeof Sparkles }[] = [
  { value: "em_alta", label: "Em alta", icon: Zap },
  { value: "novidade_br", label: "Novidade BR", icon: Sparkles },
  { value: "autor_revelacao", label: "Autor Revelação", icon: Star },
];

export default function AdminCurationPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "original" | "imported">("all");

  useEffect(() => {
    fetch("/api/admin/catalog-items")
      .then((r) => r.json())
      .then((data) => {
        if (data.items) setItems(data.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function toggleOriginal(itemType: ItemType, itemId: string, current: number) {
    const res = await fetch("/api/admin/catalog-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_type: itemType, item_id: itemId, is_original: current ? 0 : 1 }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.item_id === itemId && i.item_type === itemType ? { ...i, is_original: current ? 0 : 1 } : i))
      );
    }
  }

  async function setCuration(itemType: ItemType, itemId: string, label: CurationLabel) {
    const res = await fetch("/api/admin/catalog-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_type: itemType, item_id: itemId, curation_label: label }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i.item_id === itemId && i.item_type === itemType ? { ...i, curation_label: label } : i))
      );
    }
  }

  const filtered = items.filter((item) => {
    if (filter === "original" && !item.is_original) return false;
    if (filter === "imported" && item.is_original) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AdminShell
      eyebrow="curadoria"
      title="Curadoria de conteúdo"
      description="Marque obras como Originais BR e atribua selos de curadoria (Em alta, Novidade BR, Autor Revelação)."
    >
      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border/50 bg-muted/30 p-1">
          {(["all", "original", "imported"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "Todas" : f === "original" ? "Originais" : "Importadas"}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma obra encontrada.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={`${item.item_type}-${item.item_id}`} className="border-border/40">
              <CardContent className="flex flex-wrap items-center gap-3 p-3 md:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                      {item.item_type === "novel" ? "LN" : "Mangá"}
                    </Badge>
                    <span className="font-medium truncate">{item.title}</span>
                    {item.author_name && (
                      <span className="text-xs text-muted-foreground truncate hidden md:inline">por {item.author_name}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">/{item.slug}</p>
                </div>

                {/* Original toggle */}
                <button
                  onClick={() => toggleOriginal(item.item_type, item.item_id, item.is_original)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                    item.is_original
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-border/50 text-muted-foreground hover:border-muted-foreground/30"
                  )}
                >
                  <BadgeCheck className="h-3 w-3" />
                  {item.is_original ? "Original" : "Marcar original"}
                </button>

                {/* Curation badges */}
                <div className="flex gap-1">
                  {curationLabels.map((cl) => {
                    const Icon = cl.icon;
                    const active = item.curation_label === cl.value;
                    return (
                      <button
                        key={cl.value}
                        onClick={() => setCuration(item.item_type, item.item_id, active ? "" : cl.value)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/40 text-muted-foreground/60 hover:border-muted-foreground/30"
                        )}
                        title={cl.label}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{cl.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
