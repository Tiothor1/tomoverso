import Link from "next/link";
import { Eye, BookOpen, Star, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NovelCover } from "@/components/novel/novel-cover";
import type { Novel } from "@/lib/types";
import { NovelTitle } from "@/components/novel/novel-title";

interface NovelCardProps {
  novel: Novel;
  variant?: "default" | "compact" | "horizontal";
  showAuthor?: boolean;
}

export function NovelCard({
  novel,
  variant = "default",
  showAuthor = true,
}: NovelCardProps) {
  if (variant === "horizontal") {
    return (
      <Link href={`/novels/${novel.slug}`} className="group block">
        <Card className="neon-card overflow-hidden">
          <div className="flex gap-4 p-4">
            <div className="w-20 flex-shrink-0">
              <NovelCover novel={novel} className="story-cover aspect-[3/4]" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h3 className="font-heading font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                <NovelTitle novel={novel} />
              </h3>
              {showAuthor && (novel.author?.display_name || novel.author_name) && (
                <p className="text-xs text-muted-foreground">
                  por {novel.author?.display_name || novel.author_name}
                </p>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {novel.synopsis}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {novel.chapter_count}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {novel.rating_avg || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {novel.views > 0 ? novel.views.toLocaleString("pt-BR") : "novo"}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/novels/${novel.slug}`} className="group block">
      <Card className="neon-card h-full overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden">
          <NovelCover novel={novel} className="story-cover h-full w-full" />
          {/* Overlay de hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Button size="sm" className="neon-button w-full">
              Ler agora
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-2">
          <h3 className="font-heading text-lg font-semibold line-clamp-3 group-hover:text-primary transition-colors min-h-[4rem]">
            <NovelTitle novel={novel} />
          </h3>

          {showAuthor && (novel.author?.display_name || novel.author_name) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {novel.author?.display_name || novel.author_name}
            </p>
          )}

          {variant === "default" && (
            <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
              {novel.synopsis}
            </p>
          )}

          <div className="flex flex-wrap gap-1 pt-1">
            {novel.genres.slice(0, 2).map((g) => (
              <Badge key={g} variant="secondary" className="neon-badge text-xs">
                {g}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
