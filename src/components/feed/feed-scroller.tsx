"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Home, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedCard } from "@/components/feed/feed-card";
import { FeedCommentDrawer } from "@/components/feed/feed-comment-drawer";
import { FeedCreatePostModal } from "@/components/feed/feed-create-post-modal";
import {
  createFeedCommentAction,
  createFeedPostAction,
  getFeedCommentsAction,
  getFeedPageAction,
  markFeedItemAction,
  registerFeedImpressionAction,
  repostFeedItemAction,
  toggleFeedFollowAction,
  toggleFeedLikeAction,
  toggleFeedSaveAction,
} from "@/lib/actions/feed-actions";
import type { FeedCommentItem, FeedItem, FeedPageResult, FeedWorkOption } from "@/lib/feed/types";

type Props = {
  initialFeed: FeedPageResult;
  workOptions: FeedWorkOption[];
  isLoggedIn: boolean;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function FeedScroller({ initialFeed, workOptions, isLoggedIn }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialFeed.items);
  const [nextCursor, setNextCursor] = useState<number | null>(initialFeed.nextCursor);
  const [sessionId, setSessionId] = useState(initialFeed.sessionId);
  const [commentItem, setCommentItem] = useState<FeedItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const viewTimersRef = useRef<Map<string, number>>(new Map());

  const itemIds = useMemo(() => items.map((i) => i.id).join("|"), [items]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.classList.add("feed-immersive");
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.classList.remove("feed-immersive");
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function loadMore() {
    if (nextCursor === null || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const page = await getFeedPageAction({ cursor: nextCursor, limit: 8, sessionId });
      setSessionId(page.sessionId);
      setItems((current) => {
        const existing = new Set(current.map((item) => item.id));
        const fresh = page.items.filter((item) => !existing.has(item.id));
        return fresh.length ? [...current, ...fresh] : current;
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      console.error("[feed] loadMore failed", error);
      setMessage("Não foi possível carregar mais cards agora.");
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }

  function scrollToIndex(index: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = Array.from(scroller.querySelectorAll<HTMLElement>("[data-feed-card='true']"));
    const target = cards[Math.max(0, Math.min(index, cards.length - 1))];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (items.length && activeIndex >= Math.max(0, items.length - 3)) {
      void loadMore();
    }
  }, [activeIndex, items.length, nextCursor, sessionId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target) || commentItem || createOpen) return;
      const nextKeys = ["ArrowDown", "PageDown", " "];
      const previousKeys = ["ArrowUp", "PageUp"];
      if (nextKeys.includes(event.key)) {
        event.preventDefault();
        scrollToIndex(activeIndex + 1);
      }
      if (previousKeys.includes(event.key)) {
        event.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, commentItem, createOpen, items.length]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = Array.from(scroller.querySelectorAll<HTMLElement>("[data-feed-card='true']"));
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const position = Number(el.dataset.feedIndex || 0);
          if (entry.isIntersecting && entry.intersectionRatio >= 0.72) {
            setActiveIndex(position);
          }

          const itemType = el.dataset.feedItemType;
          const itemId = el.dataset.feedItemId;
          if (!itemType || !itemId) continue;
          const key = `${itemType}:${itemId}:${sessionId}`;

          if (!entry.isIntersecting || entry.intersectionRatio < 0.72) {
            const timer = viewTimersRef.current.get(key);
            if (timer) window.clearTimeout(timer);
            viewTimersRef.current.delete(key);
            continue;
          }

          if (seenRef.current.has(key) || viewTimersRef.current.has(key)) continue;
          const timer = window.setTimeout(() => {
            if (seenRef.current.has(key)) return;
            seenRef.current.add(key);
            viewTimersRef.current.delete(key);
            registerFeedImpressionAction({ itemType, itemId, position, sessionId }).catch(() => undefined);
          }, 800);
          viewTimersRef.current.set(key, timer);
        }
      },
      { root: scroller, threshold: [0, 0.5, 0.72, 0.9] }
    );

    cards.forEach((card) => observer.observe(card));
    return () => {
      observer.disconnect();
      viewTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      viewTimersRef.current.clear();
    };
  }, [itemIds, sessionId]);

  function patchItem(item: FeedItem, patch: Partial<FeedItem>) {
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry)));
  }

  function patchCountsAndState(item: FeedItem, response: any, statePatch: Partial<FeedItem["state"]> = {}) {
    if (!response?.ok) return requireLoginIfNeeded(response);
    patchItem(item, {
      counts: response.counts || item.counts,
      state: { ...item.state, ...statePatch },
    });
  }

  function requireLoginIfNeeded(response: any) {
    if (response?.error === "login_required") {
      setMessage("Entra na conta pra usar essa ação.");
      return false;
    }
    if (response?.error === "feed_unavailable") {
      setMessage("Não foi possível acessar o feed agora. Tenta novamente.");
      return false;
    }
    if (response?.error) setMessage(String(response.error));
    return false;
  }

  async function onLike(item: FeedItem) {
    if (!isLoggedIn) {
      setMessage("Entra na conta pra curtir.");
      return;
    }
    patchItem(item, {
      state: { ...item.state, liked: !item.state.liked },
      counts: { ...item.counts, likes: Math.max(0, item.counts.likes + (item.state.liked ? -1 : 1)) },
    });
    try {
      const response = await toggleFeedLikeAction(item.targetType, item.targetId);
      if (!response?.ok) {
        patchItem(item, { counts: item.counts, state: item.state });
        requireLoginIfNeeded(response);
        return;
      }
      patchCountsAndState(item, response, { liked: "liked" in response ? !!response.liked : item.state.liked });
    } catch (error) {
      console.error("[feed] like failed", error);
      patchItem(item, { counts: item.counts, state: item.state });
      setMessage("Não foi possível curtir agora.");
    }
  }

  async function onSave(item: FeedItem) {
    if (!isLoggedIn) {
      setMessage("Entra na conta pra salvar.");
      return;
    }
    patchItem(item, {
      state: { ...item.state, saved: !item.state.saved },
      counts: { ...item.counts, favorites: Math.max(0, item.counts.favorites + (item.state.saved ? -1 : 1)) },
    });
    try {
      const response = await toggleFeedSaveAction(item.targetType, item.targetId, item.work ? { type: item.work.type, id: item.work.id } : undefined);
      if (!response?.ok) {
        patchItem(item, { counts: item.counts, state: item.state });
        requireLoginIfNeeded(response);
        return;
      }
      patchCountsAndState(item, response, { saved: "saved" in response ? !!response.saved : item.state.saved });
    } catch (error) {
      console.error("[feed] save failed", error);
      patchItem(item, { counts: item.counts, state: item.state });
      setMessage("Não foi possível salvar agora.");
    }
  }

  async function onFollow(item: FeedItem) {
    if (!isLoggedIn) {
      setMessage("Entra na conta pra seguir perfis.");
      return;
    }
    if (!item.user) return;
    try {
      const response = await toggleFeedFollowAction(item.user.id);
      if (!response?.ok) return requireLoginIfNeeded(response);
      setItems((current) => current.map((entry) => (entry.user?.id === item.user?.id ? { ...entry, user: entry.user ? { ...entry.user, isFollowed: "following" in response ? response.following : entry.user.isFollowed } : null } : entry)));
    } catch (error) {
      console.error("[feed] follow failed", error);
      setMessage("Não foi possível seguir agora.");
    }
  }

  async function onShare(item: FeedItem) {
    const url = `${window.location.origin}${item.work?.href || `/feed?item=${item.targetType}:${item.targetId}`}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: item.title, text: item.reason || item.body, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("Link copiado.");
      } else {
        setMessage(url);
      }
      const response = await markFeedItemAction(item.targetType, item.targetId, "share", { url });
      if (response?.ok && "counts" in response) patchItem(item, { counts: response.counts || item.counts });
    } catch {
      await navigator.clipboard?.writeText?.(url).catch(() => undefined);
      setMessage("Link copiado.");
    }
  }

  async function onRepost(item: FeedItem) {
    if (!isLoggedIn) {
      setMessage("Entra na conta pra republicar.");
      return;
    }
    try {
      const response = await repostFeedItemAction(item.targetType, item.targetId, `Recomendo: ${item.title}`);
      if (!response?.ok) return requireLoginIfNeeded(response);
      patchItem(item, { counts: "counts" in response ? response.counts || item.counts : item.counts });
      setMessage("Republicado. Ele entra no feed em instantes.");
    } catch (error) {
      console.error("[feed] repost failed", error);
      setMessage("Não foi possível republicar agora.");
    }
  }

  async function onHide(item: FeedItem) {
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    try {
      const response = await markFeedItemAction(item.targetType, item.targetId, "not_interested");
      if (!response?.ok) requireLoginIfNeeded(response);
      if (items.length < 5) void loadMore();
    } catch (error) {
      console.error("[feed] hide failed", error);
      setMessage("Card ocultado só nesta sessão.");
    }
  }

  async function loadComments(item: FeedItem): Promise<FeedCommentItem[]> {
    try {
      return await getFeedCommentsAction(item.targetType, item.targetId);
    } catch (error) {
      console.error("[feed] loadComments failed", error);
      setMessage("Não foi possível carregar os comentários.");
      return [];
    }
  }

  async function sendComment(item: FeedItem, body: string) {
    try {
      const response = await createFeedCommentAction(item.targetType, item.targetId, body);
      if (!response?.ok) return requireLoginIfNeeded(response);
      patchItem(item, { counts: "counts" in response ? response.counts || { ...item.counts, comments: item.counts.comments + 1 } : item.counts });
      return true;
    } catch (error) {
      console.error("[feed] sendComment failed", error);
      setMessage("Não foi possível comentar agora.");
      return false;
    }
  }

  async function createPost(input: Parameters<typeof createFeedPostAction>[0]) {
    try {
      const response = await createFeedPostAction(input);
      if (!response?.ok) return requireLoginIfNeeded(response);
      setMessage("Post publicado. Ele entra no feed em instantes.");
      return true;
    } catch (error) {
      console.error("[feed] createPost failed", error);
      setMessage("Não foi possível publicar agora.");
      return false;
    }
  }

  return (
    <section className="fixed inset-0 z-[60] overflow-hidden bg-[#030006] text-white" aria-label="Feed Tomoverso em tela cheia">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(217,70,239,0.22),transparent_32%),radial-gradient(circle_at_10%_80%,rgba(124,58,237,0.20),transparent_30%),#030006]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[90] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex w-full max-w-[42rem] items-center justify-between gap-2 rounded-full border border-white/10 bg-black/35 p-1.5 shadow-2xl backdrop-blur-2xl">
          <Button asChild size="sm" variant="ghost" className="rounded-full text-white hover:bg-white/10 hover:text-white">
            <Link href="/">
              <Home className="mr-1.5 h-4 w-4" /> Tomoverso
            </Link>
          </Button>
          <div className="hidden min-w-0 flex-1 items-center justify-center text-center text-[11px] font-black uppercase tracking-[0.22em] text-white/50 sm:flex">
            {items.length ? `${activeIndex + 1} / ${items.length}` : "Feed"}
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => scrollToIndex(activeIndex - 1)} className="hidden rounded-full text-white hover:bg-white/10 hover:text-white sm:inline-flex" aria-label="Card anterior">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => scrollToIndex(activeIndex + 1)} className="hidden rounded-full text-white hover:bg-white/10 hover:text-white sm:inline-flex" aria-label="Próximo card">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button asChild size="sm" variant="ghost" className="hidden rounded-full px-3 text-white hover:bg-white/10 hover:text-white sm:inline-flex">
              <Link href="/dashboard/novels/new">Publicar obra</Link>
            </Button>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)} className="rounded-full bg-white px-3 font-black text-black hover:bg-fuchsia-100" aria-label="Criar post ou recomendação no feed">
              <Plus className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Postar</span><span className="sm:hidden">Criar</span>
            </Button>
          </div>
        </div>
      </div>

      {message ? (
        <button
          type="button"
          onClick={() => setMessage("")}
          className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[150] max-w-[90vw] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-950/90 px-4 py-2 text-sm font-bold text-white shadow-2xl backdrop-blur-xl"
        >
          {message}
        </button>
      ) : null}

      <div ref={scrollerRef} className="feed-reels-scroll relative z-10 h-[100dvh] w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth">
        {items.length ? (
          items.map((item, index) => (
            <FeedCard
              key={item.id}
              item={item}
              index={index}
              onLike={onLike}
              onSave={onSave}
              onComment={setCommentItem}
              onShare={onShare}
              onRepost={onRepost}
              onFollow={onFollow}
              onHide={onHide}
            />
          ))
        ) : (
          <div className="flex h-[100dvh] snap-start items-center justify-center p-6 text-center">
            <div className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-fuchsia-300" />
              <h2 className="font-heading text-2xl font-black">Ainda não há recomendações suficientes</h2>
              <p className="mt-2 text-white/65">Explore algumas obras para personalizar seu feed.</p>
              <Button asChild className="mt-6 rounded-full bg-white text-black hover:bg-fuchsia-100">
                <Link href="/explore">Explorar obras</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {isLoadingMore ? (
        <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-[95] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-2 text-xs font-bold text-white/80 shadow-2xl backdrop-blur-xl">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando mais
        </div>
      ) : null}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] hidden rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] font-bold text-white/40 backdrop-blur-xl xl:block">
        ↑ ↓ para navegar
      </div>

      <FeedCommentDrawer
        item={commentItem}
        open={!!commentItem}
        isLoggedIn={isLoggedIn}
        onClose={() => setCommentItem(null)}
        loadComments={loadComments}
        sendComment={sendComment}
      />
      <FeedCreatePostModal open={createOpen} isLoggedIn={isLoggedIn} workOptions={workOptions} onClose={() => setCreateOpen(false)} onCreate={createPost} />
    </section>
  );
}
