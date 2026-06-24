import type { Novel } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface NovelCoverProps {
  novel: Novel;
  className?: string;
  size?: "sm" | "md" | "lg";
  unoptimized?: boolean;
}

export function NovelCover({ novel, className, size = "md", unoptimized }: NovelCoverProps) {
  const hasCover = !!(novel.cover_url && novel.cover_url.trim() !== "");

  // Fallback: só texto simples
  if (!hasCover) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/30 border border-border/20 rounded-md",
          className
        )}
        aria-label={novel.title}
      >
        <span className="text-xs text-muted-foreground px-1 text-center leading-tight line-clamp-3">
          {novel.title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-border/30 bg-muted",
        className
      )}
    >
      <Image
        src={novel.cover_url!}
        alt={novel.title}
        fill
        unoptimized={unoptimized}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
        className="object-cover"
      />
      {novel.is_featured && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
          ★ Top
        </div>
      )}
    </div>
  );
}
