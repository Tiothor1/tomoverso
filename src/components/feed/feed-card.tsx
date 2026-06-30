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
  const canFollow = item.user && item.user.id !== item.work?.authorId;
  const titleInitial = (item.work?.title || item.title || "T").slice(0, 1).toUpperCase();

  return (
    <article
      data-feed-card="true"
      data-feed-item-id={item.targetId}
      data-feed-item-type={item.targetType}
      data-feed-index={index}
      className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[46rem] snap-start items-center justify-center overflow-hidden border-x border-white/5 bg-black text-white"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient(item.id)}`} />
      {image ? (
        <img
          src={image}
          alt={item.work?.title || item.title}
          loading={index < 3 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover opacity-80 blur-[1px] scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[36vw] font-black text-white/5">
          {titleInitial}
        </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.20),transparent_28%),linear-gradient(to_top,rgba(0,0,0,0.96),rgba(0,0,0,0.18)_55%,rgba(0,0,0,0.70))]" />

      <div className="relative z-10 flex min-h-[calc(100dvh-4rem)] w-full items-end px-4 pb-6 pt-8 sm:px-6 sm:pb-8">
        <div className="grid w-full grid-cols-[1fr_auto] gap-4">
          <div className="min-w-0 self-end pb-1 pr-1 sm:pr-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-fuchsia-300" />
                {item.kind === "continue" ? "Continue" : item.kind === "post" ? "Comunidade" : item.kind === "trend" ? "Em alta" : "Pra você"}
              </span>
              {item.badges.slice(0, 3).map((badge) => (
                <Badge key={badge} className="border-white/15 bg-black/35 text-white backdrop-blur-md">
                  {badge}
                </Badge>
              ))}
            </div>

            {item.user ? (
              <div className="mb-3 flex items-center gap-2 text-sm text-white/90">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/15 text-xs font-black backdrop-blur-md">
                  {item.user.avatarUrl ? <img src={item.user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : item.user.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <Link href={`/authors/${item.user.username}`} className="block truncate font-bold hover:text-fuchsia-200">
                    {item.user.displayName}
                  </Link>
                  <p className="text-xs text-white/55">@{item.user.username}</p>
                </div>
                {canFollow ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="ml-1 h-8 rounded-full bg-white/15 px-3 text-xs text-white hover:bg-white/25"
                    onClick={() => onFollow(item)}
                  >
                    {item.user.isFollowed ? <UserCheck className="mr-1 h-3 w-3" /> : <UserPlus className="mr-1 h-3 w-3" />}
                    {item.user.isFollowed ? "Seguindo" : "Seguir"}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <h2 className="max-w-[34rem] text-balance font-heading text-3xl font-black leading-[0.95] tracking-tight text-white drop-shadow-2xl sm:text-5xl">
              {item.title}
            </h2>
            <p className="mt-3 max-w-[36rem] text-sm leading-relaxed text-white/82 line-clamp-4 sm:text-base">
              {item.body}
            </p>

            {item.reason ? (
              <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-xs font-medium text-fuchsia-50 backdrop-blur-md">
                <Sparkles className="h-4 w-4 shrink-0 text-fuchsia-200" />
                <span className="line-clamp-2">{item.reason}</span>
              </div>
            ) : null}

            {item.work ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full bg-white px-5 font-black text-black hover:bg-fuchsia-100">
                  <Link href={item.actionHref} onClick={() => undefined}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    {item.actionLabel}
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="rounded-full bg-white/12 px-5 text-white backdrop-blur-md hover:bg-white/20">
                  <Link href={item.work.href}>Ver obra</Link>
                </Button>
                <span className="inline-flex items-center gap-1 text-xs text-white/60">
                  <Eye className="h-3.5 w-3.5" />
                  {item.work.chapterCount} caps
                </span>
              </div>
            ) : null}
          </div>

          <aside className="flex w-16 shrink-0 flex-col items-center justify-end gap-3 pb-2 sm:w-20">
            <RailButton active={item.state.liked} label={formatCount(item.counts.likes)} onClick={() => onLike(item)}>
              <Heart className={item.state.liked ? "h-6 w-6 fill-rose-500 text-rose-500" : "h-6 w-6"} />
            </RailButton>
            <RailButton label={formatCount(item.counts.comments)} onClick={() => onComment(item)}>
              <MessageCircle className="h-6 w-6" />
            </RailButton>
            <RailButton active={item.state.saved} label={formatCount(item.counts.favorites)} onClick={() => onSave(item)}>
              <Bookmark className={item.state.saved ? "h-6 w-6 fill-amber-300 text-amber-300" : "h-6 w-6"} />
            </RailButton>
            <RailButton label={formatCount(item.counts.reposts)} onClick={() => onRepost(item)}>
              <Repeat2 className="h-6 w-6" />
            </RailButton>
            <RailButton label={formatCount(item.counts.shares)} onClick={() => onShare(item)}>
              <Share2 className="h-6 w-6" />
            </RailButton>
            <RailButton label="Não" onClick={() => onHide(item)}>
              <X className="h-5 w-5" />
            </RailButton>
            <RailButton label="Denunciar" onClick={() => onHide(item)} subtle>
              <Flag className="h-4 w-4" />
            </RailButton>
          </aside>
        </div>
      </div>
    </article>
  );
}

function RailButton({ children, label, onClick, active = false, subtle = false }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean; subtle?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-tight transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${subtle ? "text-white/55" : "text-white"}`}
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${active ? "border-white/30 bg-white/25" : "border-white/15 bg-black/35 group-hover:bg-white/18"}`}>
        {children}
      </span>
      <span className="max-w-[4rem] truncate text-center drop-shadow">{label}</span>
    </button>
  );
}
