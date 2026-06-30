"use client";

import Link from "next/link";
import {
  Bookmark,
  BookOpen,
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
import type { FeedItem } from "@/lib/feed/types";

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

export function FeedCard({ item, index, onLike, onSave, onComment, onShare, onRepost, onFollow, onHide }: Props) {
  const image = item.mediaUrl || item.work?.coverUrl || null;
  const isPagePreview = item.mediaKind === "page";
  const canFollow = item.user && item.user.id !== item.work?.authorId;
  const titleInitial = (item.work?.title || item.title || "T").slice(0, 1).toUpperCase();

  return (
    <article
      data-feed-card="true"
      data-feed-item-id={item.targetId}
      data-feed-item-type={item.targetType}
      data-feed-index={index}
      className="relative flex h-[100dvh] min-h-[100dvh] w-full snap-start snap-always items-center justify-center overflow-visible bg-transparent px-0 py-0 text-white md:px-16 md:py-4"
    >
      <div className="relative h-full w-full overflow-visible md:h-[min(860px,calc(100dvh-2rem))] md:w-[min(100vw-10rem,520px)]">
        <div className="absolute inset-0 overflow-hidden bg-black shadow-[0_30px_90px_rgba(0,0,0,0.65)] md:rounded-[2rem] md:border md:border-white/10">
          <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient(item.id)}`} />
          {image ? (
            <img
              src={image}
              alt={item.work?.title || item.title}
              loading={index < 3 ? "eager" : "lazy"}
              className={`absolute inset-0 h-full w-full scale-[1.01] ${isPagePreview ? "object-contain opacity-95" : "object-cover opacity-90"}`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[42vw] font-black text-white/5 md:text-[15rem]">
              {titleInitial}
            </div>
          )}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_12%,rgba(255,255,255,0.20),transparent_28%),linear-gradient(to_top,rgba(0,0,0,0.96),rgba(0,0,0,0.64)_34%,rgba(0,0,0,0.12)_62%,rgba(0,0,0,0.62))]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/72 to-transparent" />

          {item.mediaCaption ? (
            <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-10 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/85 shadow-lg backdrop-blur-md md:left-5 md:top-5">
              {item.mediaCaption}
            </div>
          ) : null}

          <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pr-24 pt-[calc(env(safe-area-inset-top)+5rem)] sm:px-6 sm:pr-28 md:px-7 md:pb-8 md:pr-7 md:pt-20">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                  <Sparkles className="h-3 w-3 text-fuchsia-300" />
                  {item.kind === "continue" ? "Continue" : item.kind === "post" ? "Comunidade" : item.kind === "trend" ? "Em alta" : "Pra você"}
                </span>
                {item.badges.slice(0, 2).map((badge) => (
                  <Badge key={badge} className="border-white/15 bg-black/35 text-[10px] text-white backdrop-blur-md">
                    {badge}
                  </Badge>
                ))}
              </div>

              {item.user ? (
                <div className="mb-3 flex min-w-0 items-center gap-2 text-sm text-white/90">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 text-xs font-black backdrop-blur-md">
                    {item.user.avatarUrl ? <img src={item.user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : item.user.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/authors/${item.user.username}`} className="block truncate font-bold hover:text-fuchsia-200">
                      {item.user.displayName}
                    </Link>
                    <p className="truncate text-xs text-white/55">@{item.user.username}</p>
                  </div>
                  {canFollow ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="ml-1 h-8 shrink-0 rounded-full bg-white/15 px-3 text-xs text-white hover:bg-white/25"
                      onClick={() => onFollow(item)}
                    >
                      {item.user.isFollowed ? <UserCheck className="mr-1 h-3 w-3" /> : <UserPlus className="mr-1 h-3 w-3" />}
                      {item.user.isFollowed ? "Seguindo" : "Seguir"}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <h2 className="max-w-[32rem] text-balance font-heading text-[clamp(2rem,9vw,4rem)] font-black leading-[0.92] tracking-tight text-white drop-shadow-2xl md:text-[2.65rem]">
                {item.title}
              </h2>
              <p className="mt-3 max-w-[34rem] text-sm leading-relaxed text-white/84 line-clamp-3 drop-shadow-lg sm:text-base md:line-clamp-4">
                {item.body}
              </p>

              {item.reason ? (
                <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-xs font-medium text-fuchsia-50 backdrop-blur-md">
                  <Sparkles className="h-4 w-4 shrink-0 text-fuchsia-200" />
                  <span className="line-clamp-2">{item.reason}</span>
                </div>
              ) : null}

              {item.work ? (
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <Button asChild size="lg" className="h-11 rounded-full bg-white px-5 font-black text-black shadow-xl hover:bg-fuchsia-100">
                    <Link href={item.actionHref}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      {item.actionLabel}
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg" className="h-11 rounded-full bg-white/10 px-4 text-white backdrop-blur-md hover:bg-white/20">
                    <Link href={item.work.href}>Ver obra</Link>
                  </Button>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-xs text-white/70 backdrop-blur-md">
                    <Eye className="h-3.5 w-3.5" />
                    {item.work.chapterCount} caps
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] right-3 z-20 flex w-14 shrink-0 flex-col items-center justify-end gap-2 sm:right-4 sm:w-16 md:bottom-8 md:left-[calc(100%+1rem)] md:right-auto md:w-[4.5rem]">
          <RailButton active={item.state.liked} label={formatCount(item.counts.likes)} ariaLabel="Curtir" onClick={() => onLike(item)}>
            <Heart className={item.state.liked ? "h-6 w-6 fill-rose-500 text-rose-500" : "h-6 w-6"} />
          </RailButton>
          <RailButton label={formatCount(item.counts.comments)} ariaLabel="Abrir comentários" onClick={() => onComment(item)}>
            <MessageCircle className="h-6 w-6" />
          </RailButton>
          <RailButton active={item.state.saved} label={formatCount(item.counts.favorites)} ariaLabel="Salvar" onClick={() => onSave(item)}>
            <Bookmark className={item.state.saved ? "h-6 w-6 fill-amber-300 text-amber-300" : "h-6 w-6"} />
          </RailButton>
          <RailButton label={formatCount(item.counts.reposts)} ariaLabel="Republicar" onClick={() => onRepost(item)}>
            <Repeat2 className="h-6 w-6" />
          </RailButton>
          <RailButton label={formatCount(item.counts.shares)} ariaLabel="Compartilhar" onClick={() => onShare(item)}>
            <Share2 className="h-6 w-6" />
          </RailButton>
          <RailButton label="Não" ariaLabel="Não tenho interesse" onClick={() => onHide(item)}>
            <X className="h-5 w-5" />
          </RailButton>
          <div className="hidden w-full sm:block">
            <RailButton label="Den." ariaLabel="Denunciar" onClick={() => onHide(item)} subtle>
              <Flag className="h-4 w-4" />
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
      className={`group flex w-full flex-col items-center gap-1 text-[10px] font-black uppercase tracking-tight transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${subtle ? "text-white/55" : "text-white"}`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-colors sm:h-12 sm:w-12 ${active ? "border-white/30 bg-white/25" : "border-white/15 bg-black/40 group-hover:bg-white/20"}`}>
        {children}
      </span>
      <span className="max-w-[3.6rem] truncate text-center leading-none drop-shadow">{label}</span>
    </button>
  );
}
