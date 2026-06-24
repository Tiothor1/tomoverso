import type { Novel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { readableTitle } from "@/lib/display-title";

interface NovelCoverProps {
  novel: Novel;
  className?: string;
  size?: "sm" | "md" | "lg";
  unoptimized?: boolean;
}

export function NovelCover({ novel, className }: NovelCoverProps) {
  const title = readableTitle(novel);
  const coverSrc = novel.cover_local_path || novel.cover_url;
  const hasCover = !!(coverSrc && coverSrc.trim() !== "");

  if (!hasCover) {
    return <NovelCoverTextFallback title={title} className={className} />;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-md border border-border/30 bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverSrc!}
        alt={title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {novel.is_featured && (
        <div className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
          ★ Top
        </div>
      )}
    </div>
  );
}

function NovelCoverTextFallback({ title, className }: { title: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border border-border/20 bg-muted/30",
        className
      )}
      aria-label={title}
    >
      <span className="line-clamp-4 px-2 text-center text-xs leading-tight text-muted-foreground">
        {title}
      </span>
    </div>
  );
}
