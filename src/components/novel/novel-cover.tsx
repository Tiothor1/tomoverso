import type { Novel } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface NovelCoverProps {
  novel: Novel;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Quando true, força uso de <img> direto (sem Next/Image). Útil em SSR simples. */
  unoptimized?: boolean;
}

/**
 * NovelCover — usa a `cover_url` real do banco (VNDB, JIKAN, MangaDex, AniList).
 * Se a capa não existe, faz fallback pra um placeholder com gradiente + título.
 *
 * Por padrão usa Next/Image (otimização automática). Em Vercel, o domínio
 * externo precisa estar em next.config.ts → images.remotePatterns.
 */
export function NovelCover({ novel, className, size = "md", unoptimized }: NovelCoverProps) {
  const hasCover = !!(novel.cover_url && novel.cover_url.trim() !== "");

  // Fallback se não tem capa: gradiente com primeira letra do título
  if (!hasCover) {
    const initial = novel.title?.charAt(0)?.toUpperCase() ?? "?";
    const hue =
      (novel.title || "")
        .split("")
        .reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-md border border-border/30 bg-muted",
          className
        )}
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 60% 25%) 0%, hsl(${(hue + 40) % 360} 50% 40%) 100%)`,
        }}
        aria-label={novel.title}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-heading text-5xl font-bold text-white/80 drop-shadow">
            {initial}
          </span>
        </div>
        {novel.is_featured && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
            ★ Top
          </div>
        )}
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
