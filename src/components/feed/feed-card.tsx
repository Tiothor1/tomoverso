"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FeedItem, FeedMediaItem } from "@/lib/feed/types";

type Props = {
  item: FeedItem;
  index: number;
  onLike: (item: FeedItem) => void;
  onSave: (item: FeedItem) => void;
  onComment: (item: FeedItem) => void;
  onShare: (item: FeedItem) => void;
  onRepost: (item: FeedItem) => void;
  onFollow: (item: FeedItem) => void;
  onHide: (item: FeedItem) => void;
};

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value || 0);
}

function fallbackGradient(seed: string) {
  const palettes = [
    "from-violet-950 via-fuchsia-950 to-black",
    "from-slate-950 via-blue-950 to-black",
    "from-zinc-950 via-amber-950 to-black",
    "from-emerald-950 via-teal-950 to-black",
    "from-red-950 via-stone-950 to-black",
  ];
  return palettes[Math.abs(seed.charCodeAt(0) || 0) % palettes.length];
}

function FeedMediaCarousel({ images } : { images: FeedMediaItem[] }) {
  const [active, setActive] = useState(0);
  const [longStrips, setLongStrips] = useState<Record<number, boolean>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const imageCount = images.length;

  const scrollTo = useCallback((next: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const clamped = Math.max(0, Math.min(next, imageCount - 1));
    scroller.scrollTo({ left: scroller.clientWidth * clamped, behavior: "smooth" });
    setActive(clamped);
  }, [imageCount]);

  function handleImgLoad(index: number, w: number, h: number) {
    if (w && h && h / w >= 2.5) {
      setLongStrips((prev) => ({ ...prev, [index]: true }));
    }
  }

  if (imageCount <= 1) {
    const img = images[0];
    return (
      <SingleImage
        src={img.url}
        isPage={img.kind === "page"}
        onLoad={(w, h) => handleImgLoad(0, w, h)}
        isLongStrip={!!longStrips[0]}
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-black">
      <div
        ref={scrollerRef}
        className="feed-page-slices flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (!el.clientWidth) return;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {images.map((img, i) => (
          <div key={i} className="relative h-full min-w-full shrink-0 snap-center overflow-hidden">
            {img.kind === "page" ? (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
                style={{ backgroundImage: `url(${img.url})` }}
              />
            ) : null}
            <img
              src={img.url}
              alt=""
              loading={i < 2 ? "eager" : "lazy"}
              onLoad={(e) => handleImgLoad(i, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
              className={`absolute inset-0 h-full w-full scale-[1.01] ${
                longStrips[i] ? "object-cover object-top" : "object-cover"
              } opacity-90`}
            />
          </div>
        ))}
      </div>

      {imageCount > 1 ? (
        <>
          <div className="pointer-events-none absolute left-4 top-[calc(env(safe-area-inset-top)+2rem)] z-30 rounded-full border border-fuchsia-300/25 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/85 shadow-[0_0_24px_rgba(217,70,239,0.22)] backdrop-blur-md md:top-12">
            {active + 1}/{imageCount}
          </div>

          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={(e) => { e.stopPropagation(); scrollTo(active - 1); }}
            className="absolute left-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-fuchsia-500/20 hover:shadow-[0_0_22px_rgba(217,70,239,0.35)] md:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={(e) => { e.stopPropagation(); scrollTo(active + 1); }}
            className="absolute right-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-xl backdrop-blur-md transition hover:scale-105 hover:bg-fuchsia-500/20 hover:shadow-[0_0_22px_rgba(217,70,239,0.35)] md:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-20 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para imagem ${i + 1}`}
                onClick={(e) => { e.stopPropagation(); scrollTo(i); }}
                className={`h-1.5 rounded-full transition-all ${active === i ? "w-5 bg-white" : "w-1.5 bg-white/35"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function SingleImage({ src, isPage, isLongStrip, onLoad }: { src: string; isPage: boolean; isLongStrip: boolean; onLoad: (w: number, h: number) => void }) {
  return (
    <>
      {isPage ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
          style={{ backgroundImage: `url(${src})` }}
        />
      ) : null}
      <img
        src={src}
        alt=""
        loading="eager"
        onLoad={(e) => onLoad(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
        className={`absolute inset-0 h-full w-full scale-[1.01] ${
          isLongStrip ? "object-cover object-top" : "object-cover"
        } opacity-90`}
      />
    </>
  );
}

export function FeedCard({ item, index, onLike, onSave, onComment, onShare, onRepost, onFollow, onHide }: Props) {
  const images = (item.mediaItems || []).filter((m) => m.url);
  const singleImage = !images.length ? (item.mediaUrl || item.work?.coverUrl || null) : null;
  const canFollow = item.user && item.user.id !== item.work?.authorId;
  const titleInitial = (item.work?.title || item.title || "T").slice(0, 1).toUpperCase();
  const hasCarousel = images.length > 1;
  const isPageMedia = images.length === 1 && images[0].kind === "page" || (!images.length && item.mediaKind === "page");

  return (
    <article
      data-feed-card="true"
      data-feed-item-id={item.targetId}
      data-feed-item-type={item.targetType}
      data-feed-index={index}
      className="relative flex h-[100dvh] min-h-[100dvh] w-full snap-start snap-always items-center justify-center overflow-visible bg-transparent px-0 py-0 text-white md:px-16 md:py-4"
    >
      <div className="relative h-full w-full overflow-visible md:h-[min(860px,calc(100dvh-2rem))] md:w-[min(100vw-10rem,520px)]">
        <div className="absolute inset-0 overflow-hidden bg-black shadow-[0_30px_90px_rgba(0,0,0,0.65),0_0_46px_rgba(168,85,247,0.18)] md:rounded-[2rem] md:border md:border-white/10">
          <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient(item.id)}`} />

          {images.length > 0 ? (
            <FeedMediaCarousel images={images} />
          ) : singleImage ? (
            <>
              {isPageMedia ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
                  style={{ backgroundImage: `url(${singleImage})` }}
                />
              ) : null}
              <img
                src={singleImage}
                alt={item.work?.title || item.title}
                loading={index < 3 ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full scale-[1.01] object-cover opacity-90"
              />
            </>
          ) : null}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_12%,rgba(255,255,255,0.20),transparent_28%),radial-gradient(circle_at_12%_82%,rgba(217,70,239,0.22),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(34,211,238,0.16),transparent_26%),linear-gradient(to_top,rgba(0,0,0,0.96),rgba(0,0,0,0.64)_34%,rgba(0,0,0,0.12)_62%,rgba(0,0,0,0.62))]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/72 to-transparent" />

          {item.mediaCaption && !hasCarousel ? (
            <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-10 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/85 shadow-lg backdrop-blur-md md:left-5 md:top-5">
              {item.mediaCaption}
            </div>
          ) : null}

          <div className="relative z-10 pointer-events-none flex h-full flex-col justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] pr-24 pt-[calc(env(safe-area-inset-top)+5rem)] sm:px-6 sm:pr-28 md:px-7 md:pb-7 md:pr-7 md:pt-20">
            <div className="min-w-0 pointer-events-auto">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/25 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/90 shadow-[0_0_22px_rgba(217,70,239,0.2)] backdrop-blur-md">
                  <Sparkles className="h-2.5 w-2.5 text-fuchsia-300" />
                  {item.kind === "continue" ? "Continue" : item.kind === "post" ? "Comunidade" : item.kind === "trend" ? "Em alta" : "Pra você"}
                </span>
                {item.badges.slice(0, 1).map((badge) => (
                  <Badge key={badge} className="border-white/15 bg-black/35 text-[9px] text-white leading-none py-0.5 backdrop-blur-md">
                    {badge}
                  </Badge>
                ))}
              </div>

              {item.user ? (
                <div className="pointer-events-auto mb-2 flex min-w-0 items-center gap-2 text-xs text-white/85">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 text-[10px] font-black backdrop-blur-md">
                    {item.user.avatarUrl ? <img src={item.user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : item.user.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/authors/${item.user.username}`} className="block truncate font-bold leading-tight hover:text-fuchsia-200">
                      {item.user.displayName}
                    </Link>
                  </div>
                  {canFollow ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="ml-auto h-7 shrink-0 rounded-full bg-white/15 px-2.5 text-[10px] text-white hover:bg-white/25"
                      onClick={() => onFollow(item)}
                    >
                      {item.user.isFollowed ? <UserCheck className="mr-1 h-2.5 w-2.5" /> : <UserPlus className="mr-1 h-2.5 w-2.5" />}
                      {item.user.isFollowed ? "Seg." : "Seguir"}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <h2 className="max-w-[30rem] text-balance font-heading text-[clamp(1.25rem,4.5vw,1.8rem)] font-black leading-[0.95] tracking-tight text-white drop-shadow-2xl line-clamp-2">
                {item.title}
              </h2>
              <p className="mt-1.5 max-w-[32rem] text-xs leading-relaxed text-white/75 line-clamp-2 drop-shadow-lg">
                {item.body}
              </p>

              {item.work ? (
                <div className="pointer-events-auto mt-3 flex flex-wrap items-center gap-1.5">
                  <Button asChild size="sm" className="neon-button h-8 rounded-full bg-white px-3.5 text-[11px] font-black text-black shadow-xl hover:bg-fuchsia-100">
                    <Link href={item.actionHref}>
                      <BookOpen className="mr-1.5 h-3 w-3" />
                      {item.actionLabel}
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm" className="h-8 rounded-full border border-white/15 bg-white/10 px-3 text-[11px] text-white backdrop-blur-md hover:bg-fuchsia-500/20">
                    <Link href={item.work.href}>Ver obra</Link>
                  </Button>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-md">
                    <Eye className="h-3 w-3" />
                    {item.work.chapterCount} caps
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-3 z-20 flex w-12 shrink-0 flex-col items-center justify-end gap-1.5 sm:right-4 sm:w-14 md:bottom-7 md:left-[calc(100%+1rem)] md:right-auto md:w-16">
          <RailButton active={item.state.liked} label={formatCount(item.counts.likes)} ariaLabel="Curtir" onClick={() => onLike(item)}>
            <Heart className={item.state.liked ? "h-5 w-5 fill-rose-500 text-rose-500 sm:h-6 sm:w-6" : "h-5 w-5 sm:h-6 sm:w-6"} />
          </RailButton>
          <RailButton label={formatCount(item.counts.comments)} ariaLabel="Abrir comentários" onClick={() => onComment(item)}>
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          </RailButton>
          <RailButton active={item.state.saved} label={formatCount(item.counts.favorites)} ariaLabel="Salvar" onClick={() => onSave(item)}>
            <Bookmark className={item.state.saved ? "h-5 w-5 fill-amber-300 text-amber-300 sm:h-6 sm:w-6" : "h-5 w-5 sm:h-6 sm:w-6"} />
          </RailButton>
          <RailButton label={formatCount(item.counts.reposts)} ariaLabel="Republicar" onClick={() => onRepost(item)}>
            <Repeat2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </RailButton>
          <RailButton label={formatCount(item.counts.shares)} ariaLabel="Compartilhar" onClick={() => onShare(item)}>
            <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </RailButton>
          <RailButton label="Não" ariaLabel="Não tenho interesse" onClick={() => onHide(item)}>
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </RailButton>
          <div className="hidden w-full sm:block">
            <RailButton label="Den." ariaLabel="Denunciar" onClick={() => onHide(item)} subtle>
              <Flag className="h-3.5 w-3.5" />
            </RailButton>
          </div>
        </aside>
      </div>
    </article>
  );
}

function RailButton({ children, label, ariaLabel, onClick, active = false, subtle = false }: { children: React.ReactNode; label: string; ariaLabel: string; onClick: () => void; active?: boolean; subtle?: boolean }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`group flex w-full flex-col items-center gap-0.5 text-[9px] font-black uppercase tracking-tight transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${subtle ? "text-white/50" : "text-white"}`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all sm:h-11 sm:w-11 ${active ? "border-fuchsia-300/45 bg-fuchsia-500/25 shadow-[0_0_24px_rgba(217,70,239,0.42)]" : "border-white/15 bg-black/40 group-hover:bg-fuchsia-500/20 group-hover:shadow-[0_0_20px_rgba(217,70,239,0.28)]"}`}>
        {children}
      </span>
      <span className="max-w-[3.2rem] truncate text-center leading-none drop-shadow group-hover:text-fuchsia-100">{label}</span>
    </button>
  );
}
