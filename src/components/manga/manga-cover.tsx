import { BookOpen } from "lucide-react";
import type { MangaCardData } from "@/lib/manga/types";
import { proxyImageUrl } from "@/lib/manga/image-proxy";

interface MangaCoverProps {
  manga: MangaCardData;
  className?: string;
}

/**
 * MangaCover — capa do mangá.
 * Estratégia:
 * 1. Se cover_local_path existe, usa local (/uploads/mangas/...)
 * 2. Se cover_url existe (CDN externo), usa com fallback
 * 3. Se nenhum, gera SVG gradiente com inicial do título
 *
 * NOTA: Server Component — não pode ter onError. O fallback é tratado por CSS.
 */
export function MangaCover({ manga, className }: MangaCoverProps) {
  const rawCoverSrc = manga.cover_local_path
    ? manga.cover_local_path
    : manga.cover_url?.startsWith("/uploads/")
      ? manga.cover_url
      : "";
  const coverSrc = rawCoverSrc ? proxyImageUrl(rawCoverSrc) : "";

  if (coverSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverSrc}
        alt={manga.title}
        loading="lazy"
        className={`object-cover ${className || ""}`}
      />
    );
  }

  return <MangaCoverFallback manga={manga} className={className} />;
}

function MangaCoverFallback({ manga, className }: MangaCoverProps) {
  // Gera gradiente baseado no hash do título
  const hash = Array.from(manga.title).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 60) % 360;

  return (
    <div
      className={`flex items-center justify-center text-white/90 font-heading font-bold ${className || ""}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.45 ${0.15 + (hash % 10) / 100} ${hue1}) 0%, oklch(0.35 ${0.18 + (hash % 10) / 100} ${hue2}) 100%)`,
      }}
    >
      <div className="flex max-w-[82%] flex-col items-center gap-3 text-center">
        <BookOpen className="h-10 w-10 opacity-45" />
        <span className="line-clamp-4 text-lg leading-tight tracking-tight">{manga.title}</span>
      </div>
    </div>
  );
}