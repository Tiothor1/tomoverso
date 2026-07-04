"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SaveWorkButtonProps = {
  id: string;
  type: "novel" | "manga" | "book";
  title: string;
  className?: string;
  compact?: boolean;
};

export function SaveWorkButton({ id, type, title, className, compact = false }: SaveWorkButtonProps) {
  const key = useMemo(() => `tomoverso-saved-works:${type}:${id}`, [id, type]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      setSaved(localStorage.getItem(key) === "1");
    } catch {}
  }, [key]);

  function toggle() {
    const next = !saved;
    setSaved(next);
    try {
      if (next) localStorage.setItem(key, "1");
      else localStorage.removeItem(key);
    } catch {}
  }

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size={compact ? "icon-sm" : "sm"}
      onClick={toggle}
      aria-pressed={saved}
      aria-label={`${saved ? "Remover salvo" : "Salvar"}: ${title}`}
      title={saved ? "Salvo" : "Salvar"}
      className={cn(
        "shrink-0 border-border/70 bg-background/55 backdrop-blur hover:bg-primary/10 hover:text-primary",
        saved && "border-primary/30 bg-primary/15 text-primary",
        !compact && "min-w-0 gap-1.5 px-3",
        className
      )}
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
      {!compact && <span className="hidden sm:inline">{saved ? "Salvo" : "Salvar"}</span>}
    </Button>
  );
}
