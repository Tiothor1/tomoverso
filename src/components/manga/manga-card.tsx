import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MangaCover } from "./manga-cover";
import type { MangaCardData } from "@/lib/manga/types";

interface MangaCardProps {
  manga: MangaCardData;
  variant?: "default" | "compact";
}

const statusLabels = {
  ongoing: { label: "Em andamento", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  completed: { label: "Completo", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  hiatus: { label: "Hiato", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  dropped: { label: "Droppado", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function MangaCard({ manga, variant = "default" }: MangaCardProps) {
  const status = statusLabels[manga.status as keyof typeof statusLabels];
  const href = `/manga/${manga.slug}`;

  if (variant === "compact") {
    return (
      <Link href={href} className="group block">
        <Card className="neon-card overflow-hidden">
          <div className="aspect-[2/3] overflow-hidden bg-muted">
            <MangaCover manga={manga} className="story-cover h-full w-full" />
          </div>
          <CardContent className="p-3">
            <h3 className="font-heading text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {manga.title}
            </h3>
            {manga.chapter_count !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                {manga.chapter_count} cap.
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block">
      <Card className="neon-card overflow-hidden">
        <div className="aspect-[2/3] overflow-hidden bg-muted relative">
          <MangaCover manga={manga} className="story-cover h-full w-full" />
          {status && (
            <Badge
              variant="outline"
              className={`absolute top-2 right-2 text-[10px] shadow-[0_0_18px_rgba(255,255,255,0.12)] ${status.className}`}
            >
              {status.label}
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-heading text-base font-bold line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
            {manga.title}
          </h3>
          {manga.author && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              por {manga.author}
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {(manga.tags || []).slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary" className="neon-badge text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
          {manga.chapter_count !== undefined && (
            <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
              📖 {manga.chapter_count} capítulos
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}