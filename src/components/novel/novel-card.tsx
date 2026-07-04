import Link from "next/link";
import { BookOpen, Flame, PenLine, Sparkles, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NovelCover } from "@/components/novel/novel-cover";
import type { Novel } from "@/lib/types";
import { NovelTitle } from "@/components/novel/novel-title";
import { SaveWorkButton } from "@/components/work/save-work-button";
import { cn } from "@/lib/utils";

type CardNovel = Novel & {
  is_original?: boolean | number | null;
};

interface NovelCardProps {
  novel: CardNovel;
  variant?: "default" | "compact" | "horizontal";
  showAuthor?: boolean;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  ongoing: { label: "Em andamento", className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" },
  completed: { label: "Completa", className: "border-sky-300/25 bg-sky-300/10 text-sky-100" },
  hiatus: { label: "Hiato", className: "border-amber-300/25 bg-amber-300/10 text-amber-100" },
  dropped: { label: "Pausada", className: "border-rose-300/25 bg-rose-300/10 text-rose-100" },
};

function compactNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function authorName(novel: CardNovel) {
  return novel.author?.display_name || novel.author_name || "Tomo Verso";
}

function tagsFor(novel: CardNovel) {
  return [...(novel.genres || []), ...(novel.tags || [])].filter(Boolean).slice(0, 3);
}

function typeLabel(type: string | undefined) {
  const labels: Record<string, string> = {
    "light-novel": "Novel",
    "web-novel": "Web novel",
    "visual-novel": "Visual novel",
    short: "Curta",
  };
  return labels[type || ""] || "Novel";
}

function isOriginal(novel: CardNovel) {
  return Boolean(novel.is_original) || novel.source === "tomoverso" || novel.source === "original";
}

function isHot(novel: CardNovel) {
  return (novel.views || 0) >= 1000 || (novel.chapter_count || 0) >= 20 || Boolean(novel.is_featured);
}

function StatusBadge({ status }: { status: string }) {
  const data = statusLabels[status] || statusLabels.ongoing;
  return <Badge variant="outline" className={cn("h-6 rounded-full px-2 text-[10px]", data.className)}>{data.label}</Badge>;
}

export function NovelCard({ novel, variant = "default", showAuthor = true }: NovelCardProps) {
  const href = `/novels/${novel.slug}`;
  const tags = tagsFor(novel);
  const compact = variant === "compact";

  if (variant === "horizontal") {
    return (
      <Card className="neon-card group/work-card h-full overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:border-primary/35">
        <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
          <Link href={href} className="relative block w-20 shrink-0 overflow-hidden rounded-2xl bg-muted sm:w-24">
            <NovelCover novel={novel} className="story-cover aspect-[3/4] h-full w-full transition duration-500 group-hover/work-card:scale-[1.04]" />
          </Link>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {isOriginal(novel) && <Badge className="bg-primary/90 text-primary-foreground"><Sparkles className="h-3 w-3" /> Original</Badge>}
              {isHot(novel) && <Badge variant="secondary" className="bg-amber-300/12 text-amber-100"><Flame className="h-3 w-3" /> Em alta</Badge>}
              {!isOriginal(novel) && !isHot(novel) && <Badge variant="secondary" className="bg-primary/10 text-primary">{typeLabel(novel.type)}</Badge>}
              <StatusBadge status={novel.status} />
            </div>
            <Link href={href} className="block">
              <h3 className="line-clamp-2 font-heading text-base font-black leading-tight transition-colors group-hover/work-card:text-primary">
                <NovelTitle novel={novel} />
              </h3>
            </Link>
            {showAuthor && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" />{authorName(novel)}</p>}
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 2).map((g) => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><BookOpen className="h-3.5 w-3.5" />{novel.chapter_count || 0} caps</span>
              <div className="flex gap-2">
                <Button asChild size="sm" className="h-8 rounded-full"><Link href={href}>Ler</Link></Button>
                <SaveWorkButton id={novel.id} type="novel" title={novel.title} compact />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="neon-card group/work-card flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <Link href={href} className="relative block overflow-hidden bg-muted">
        <div className="aspect-[2/3] sm:aspect-[3/4]">
          <NovelCover novel={novel} className="story-cover h-full w-full transition duration-500 group-hover/work-card:scale-[1.04]" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25 opacity-80" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {isOriginal(novel) && <Badge className="bg-primary/92 text-primary-foreground shadow-lg"><Sparkles className="h-3 w-3" /> Original</Badge>}
          {isHot(novel) && <Badge variant="secondary" className="bg-amber-300/15 text-amber-100 shadow-lg"><Flame className="h-3 w-3" /> Em alta</Badge>}
          {!isOriginal(novel) && !isHot(novel) && <Badge variant="secondary" className="bg-primary/15 text-primary shadow-lg">{typeLabel(novel.type)}</Badge>}
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <StatusBadge status={novel.status} />
          <span className="rounded-full border border-white/15 bg-black/45 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
            {compactNumber(novel.views)} leituras
          </span>
        </div>
      </Link>

      <CardContent className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
        <Link href={href} className="block">
          <h3 className={cn("font-heading font-black leading-tight transition-colors group-hover/work-card:text-primary", compact ? "line-clamp-2 text-sm sm:text-base" : "line-clamp-2 text-base sm:text-lg")}>
            <NovelTitle novel={novel} />
          </h3>
        </Link>

        {showAuthor && (
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <PenLine className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{authorName(novel)}</span>
          </p>
        )}

        <div className="flex min-h-5 flex-wrap gap-1.5">
          {tags.length > 0 ? tags.map((g) => <Badge key={g} variant="secondary" className="max-w-full truncate text-[10px]">{g}</Badge>) : <Badge variant="outline" className="text-[10px]">Sem tags</Badge>}
        </div>

        {!compact && novel.synopsis ? <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{novel.synopsis}</p> : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            {novel.chapter_count || 0} capítulos
          </span>
          <div className="flex gap-2">
            <Button asChild size="sm" className="h-8 rounded-full px-3"><Link href={href}>Ler</Link></Button>
            <SaveWorkButton id={novel.id} type="novel" title={novel.title} compact={compact} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
