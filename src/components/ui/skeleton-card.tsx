import { cn } from "@/lib/utils";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-2xl border border-border/40 bg-card/50 overflow-hidden", className)}>
      <div className="aspect-[3/4] bg-muted/60" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 rounded-full bg-muted/60" />
        <div className="h-2 w-1/2 rounded-full bg-muted/40" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonMangaCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-2xl border border-border/40 bg-card/50 overflow-hidden", className)}>
      <div className="aspect-[2/3] bg-muted/60" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-4/5 rounded-full bg-muted/60" />
        <div className="h-2 w-1/3 rounded-full bg-muted/40" />
      </div>
    </div>
  );
}

export function SkeletonLine({ width = "100%", className }: { width?: string; className?: string }) {
  return (
    <div
      className={cn("h-3 animate-pulse rounded-full bg-muted/50", className)}
      style={{ width }}
    />
  );
}
