import Link from "next/link";
import { BookOpen, Flame, PenLine, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MangaCover } from "./manga-cover";
import type { MangaCardData } from "@/lib/manga/types";
import { SaveWorkButton } from "@/components/work/save-work-button";
import { cn } from "@/lib/utils";
import { isOriginalOrUserPosted, shouldShowAttribution } from "@/lib/work-attribution";

interface MangaCardProps {
  manga: MangaCardData & {
    is_original?: boolean | number | null;
    views?: number | null;
    engagement_score?: number | null;
    max_chapter_number?: number | null;
  };
  variant?: "default" | "compact";
}

const statusLabels = {
  ongoing: { label: "Em andamento", className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" },
  completed: { label: "Completo", className: "border-sky-300/25 bg-sky-300/10 text-sky-100" },
  hiatus: { label: "Hiato", className: "border-amber-300/25 bg-amber-300/10 text-amber-100" },
  dropped: { label: "Pausado", className: "border-rose-300/25 bg-rose-300/10 text-rose-100" },
};

function StatusBadge({ status }: { status: MangaCardData["status"] }) {
  const data = statusLabels[status] || statusLabels.ongoing;
  return <Badge variant="outline" className={cn("h-6 rounded-full px-2 text-[10px]", data.className)}>{data.label}</Badge>;
}

function isOriginal(manga: MangaCardProps["manga"]) {
  return isOriginalOrUserPosted(manga);
}

function isHot(manga: MangaCardProps["manga"]) {
  return (manga.engagement_score || 0) >= 50 || (manga.views || 0) >= 1000 || (manga.chapter_count || 0) >= 100;
}

function authorName(manga: MangaCardProps["manga"]) {
  return manga.author || manga.artist || "Equipe editorial";
}

export function MangaCard({ manga, variant = "default" }: MangaCardProps) {
  const href = `/manga/${manga.slug}`;
  const compact = variant === "compact";
  const tags = (manga.tags || []).filter(Boolean).slice(0, compact ? 2 : 3);
  const availableChapters = manga.chapter_count || 0;
  const maxChapter = Number(manga.max_chapter_number || 0);
  const chapterLabel = `${availableChapters} ${availableChapters === 1 ? "cap disponível" : "caps disponíveis"}`;
  const rangeLabel = maxChapter > availableChapters ? `até cap. ${maxChapter}` : null;

  return (
    <Card className="neon-card group/work-card flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
      <Link href={href} className="relative block overflow-hidden bg-muted">
        <div className="aspect-[2/3]">
          <MangaCover manga={manga} className="story-cover h-full w-full transition duration-500 group-hover/work-card:scale-[1.04]" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/82 via-transparent to-black/25 opacity-80" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {isOriginal(manga) && <Badge className="bg-primary/92 text-primary-foreground shadow-lg"><Sparkles className="h-3 w-3" /> Original</Badge>}
          {isHot(manga) && <Badge variant="secondary" className="bg-amber-300/15 text-amber-100 shadow-lg"><Flame className="h-3 w-3" /> Em alta</Badge>}
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <StatusBadge status={manga.status} />
          <span className="rounded-full border border-white/15 bg-black/45 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
            {availableChapters} caps
          </span>
        </div>
      </Link>

      <CardContent className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
        <Link href={href} className="block">
          <h3 className={cn("font-heading font-black leading-tight transition-colors group-hover/work-card:text-primary", compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-base sm:text-lg")}>
            {manga.title}
          </h3>
        </Link>

        {shouldShowAttribution(manga) && (
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <PenLine className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{authorName(manga)}</span>
          </p>
        )}

        <div className="flex min-h-5 flex-wrap gap-1.5">
          {tags.length > 0 ? tags.map((t) => <Badge key={t} variant="secondary" className="max-w-full truncate text-[10px]">{t}</Badge>) : <Badge variant="outline" className="text-[10px]">Manhwa</Badge>}
        </div>

        {!compact && manga.synopsis ? <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{manga.synopsis}</p> : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="flex flex-col leading-tight">
              <span>{chapterLabel}</span>
              {rangeLabel ? <span className="text-[10px] font-medium text-muted-foreground/80">{rangeLabel}</span> : null}
            </span>
          </span>
          <div className="flex gap-2">
            <Button asChild size="sm" className="h-8 rounded-full px-3"><Link href={href}>Ler</Link></Button>
            <SaveWorkButton id={manga.id} type="manga" title={manga.title} compact={compact} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}