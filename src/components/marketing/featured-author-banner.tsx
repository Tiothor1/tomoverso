import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ── Types ─────────────────────────────────────────── */

export interface FeaturedAuthorData {
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  workTitle: string;
  workSlug: string;
  workType: "novel" | "manga";
  badge: "em_alta" | "novidade_br" | "autor_revelacao" | null;
  description: string;
}

/* ── Badge config ──────────────────────────────────── */

const badgeConfig: Record<
  NonNullable<FeaturedAuthorData["badge"]>,
  { label: string; icon: ReactNode; className: string }
> = {
  em_alta: {
    label: "Em alta",
    icon: <span className="text-[1.1em]">🔥</span>,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.15)]",
  },
  novidade_br: {
    label: "Novidade BR",
    icon: <span className="text-[1.1em]">✨</span>,
    className:
      "border-sky-500/30 bg-sky-500/10 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.15)]",
  },
  autor_revelacao: {
    label: "Autor Revelação",
    icon: <span className="text-[1.1em]">⭐</span>,
    className:
      "border-violet-500/30 bg-violet-500/10 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.15)]",
  },
};

/* ── Component ─────────────────────────────────────── */

interface FeaturedAuthorBannerProps extends FeaturedAuthorData {
  className?: string;
}

export default function FeaturedAuthorBanner({
  authorName,
  authorUsername,
  authorAvatar,
  workTitle,
  workSlug,
  workType,
  badge,
  description,
  className,
}: FeaturedAuthorBannerProps) {
  const workHref =
    workType === "novel" ? `/novel/${workSlug}` : `/manga/${workSlug}`;

  return (
    <section
      className={cn(
        "glass-panel neon-card relative overflow-hidden rounded-2xl",
        "flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8 lg:p-10",
        className,
      )}
    >
      {/* Gradient background overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent"
      />

      {/* Left: Author section */}
      <div className="relative z-10 flex shrink-0 items-center gap-4 md:flex-col md:items-start md:text-center">
        <Link
          href={`/@${authorUsername}`}
          className="group shrink-0"
        >
          <div className="relative size-16 overflow-hidden rounded-full ring-2 ring-primary/20 transition-shadow duration-300 group-hover:ring-primary/50 md:size-20 lg:size-24">
            <img
              src={authorAvatar}
              alt={authorName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </Link>
        <div className="min-w-0">
          <Link
            href={`/@${authorUsername}`}
            className="font-heading text-lg font-bold hover:text-primary md:text-xl"
          >
            {authorName}
          </Link>
          <p className="text-sm text-muted-foreground">@{authorUsername}</p>
        </div>
      </div>

      {/* Right: Work info */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={workHref}
            className="font-heading text-xl font-black tracking-tight hover:text-primary md:text-2xl lg:text-3xl"
          >
            {workTitle}
          </Link>

          {badge && (() => {
            const cfg = badgeConfig[badge];
            return (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur",
                  cfg.className,
                )}
              >
                {cfg.icon}
                {cfg.label}
              </span>
            );
          })()}
        </div>

        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground md:text-base">
          {description}
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href={workHref}>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md">
              {workType === "manga" ? "Ler mangá" : "Ler agora"}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link
            href={`/@${authorUsername}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <BadgeCheck className="h-4 w-4 text-emerald-400" />
            Conhecer autor
          </Link>
        </div>
      </div>
    </section>
  );
}
