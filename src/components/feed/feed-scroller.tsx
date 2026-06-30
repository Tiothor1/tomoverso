"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
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

export function FeedScroller({ initialFeed, workOptions, isLoggedIn }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialFeed.items);
  const [nextCursor, setNextCursor] = useState<number | null>(initialFeed.nextCursor);
  const [sessionId, setSessionId] = useState(initialFeed.sessionId);
  const [commentItem, setCommentItem] = useState<FeedItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoadingMore, startLoadMore] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const itemIds = useMemo(() => items.map((i) => i.id).join("|"), [items]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sentinel = sentinelRef.current;
    if (!sentinel || nextCursor === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "900px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, sessionId]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof IntersectionObserver === "undefined") return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-feed-card='true']"));
    if (!cards.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.65) continue;
          const el = entry.target as HTMLElement;
          const itemType = el.dataset.feedItemType;
          const itemId = el.dataset.feedItemId;
          const position = Number(el.dataset.feedIndex || 0);
          if (!itemType || !itemId) continue;
          const key = `${itemType}:${itemId}:${sessionId}`;
          if (seenRef.current.has(key)) continue;
          seenRef.current.add(key);
          registerFeedImpressionAction({ itemType, itemId, position, sessionId }).catch(() => undefined);
        }
      },
      { threshold: [0.65] }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
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

  function loadMore() {
    if (nextCursor === null || isLoadingMore) return;
    startLoadMore(async () => {
      try {
        const page = await getFeedPageAction({ cursor: nextCursor, limit: 8, sessionId });
        setSessionId(page.sessionId);
        setItems((current) => {
          const existing = new Set(current.map((item) => item.id));
          const fresh = page.items.filter((item) => !existing.has(item.id));
          return [...current, ...fresh];
        });
        setNextCursor(page.nextCursor);
      } catch (error) {
        console.error("[feed] loadMore failed", error);
        setNextCursor(null);
        setMessage("Não foi possível carregar mais cards agora.");
      }
    });
  }

  async function refreshFirstPage() {
    try {
      const page = await getFeedPageAction({ cursor: 0, limit: Math.max(8, items.length), sessionId });
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setSessionId(page.sessionId);
    } catch (error) {
      console.error("[feed] refreshFirstPage failed", error);
      setMessage("Não foi possível atualizar o feed agora.");
    }
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
    const response = await toggleFeedLikeAction(item.targetType, item.targetId);
    if (!response?.ok) {
      patchItem(item, { counts: item.counts, state: item.state });
      requireLoginIfNeeded(response);
      return;
    }
    patchCountsAndState(item, response, { liked: "liked" in response ? !!response.liked : item.state.liked });
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
    const response = await toggleFeedSaveAction(item.targetType, item.targetId, item.work ? { type: item.work.type, id: item.work.id } : undefined);
    if (!response?.ok) {
      patchItem(item, { counts: item.counts, state: item.state });
      requireLoginIfNeeded(response);
      return;
    }
    patchCountsAndState(item, response, { saved: "saved" in response ? !!response.saved : item.state.saved });
  }

  async function onFollow(item: FeedItem) {
    if (!isLoggedIn) {
      setMessage("Entra na conta pra seguir perfis.");
      return;
    }
    if (!item.user) return;
    const response = await toggleFeedFollowAction(item.user.id);
    if (!response?.ok) return requireLoginIfNeeded(response);
    setItems((current) => current.map((entry) => (entry.user?.id === item.user?.id ? { ...entry, user: entry.user ? { ...entry.user, isFollowed: "following" in response ? response.following : entry.user.isFollowed } : null } : entry)));
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
      setMessage("Republicado no feed.");
      await refreshFirstPage();
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
      setMessage("Post publicado.");
      await refreshFirstPage();
      return true;
    } catch (error) {
      console.error("[feed] createPost failed", error);
      setMessage("Não foi possível publicar agora.");
      return false;
    }
  }

  return (
    <div className="relative bg-black text-white">
      <div className="fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/50 p-2 shadow-2xl backdrop-blur-xl md:bottom-7">
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)} className="rounded-full bg-white text-black hover:bg-fuchsia-100">
          <Plus className="mr-1 h-4 w-4" /> Postar
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="rounded-full bg-white/10 text-white hover:bg-white/15">
          <Sparkles className="mr-1 h-4 w-4" /> Pra você
        </Button>
      </div>

      {message ? (
        <button
          type="button"
          onClick={() => setMessage("")}
          className="fixed left-1/2 top-20 z-[150] max-w-[90vw] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm font-bold text-white shadow-2xl"
        >
          {message}
        </button>
      ) : null}

      <div className="h-[calc(100dvh-4rem)] snap-y snap-mandatory overflow-y-auto scroll-smooth bg-black">
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
          <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-6 text-center">
            <div className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-fuchsia-300" />
              <h2 className="font-heading text-2xl font-black">Feed vazio por enquanto</h2>
              <p className="mt-2 text-white/60">Quando houver obras, posts ou interações, o recomendador monta sua fila aqui.</p>
            </div>
          </div>
        )}

        <div ref={sentinelRef} className="flex h-24 items-center justify-center bg-black text-white/50">
          {isLoadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : nextCursor === null ? "Fim do feed por agora" : "Carregando mais..."}
        </div>
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
    </div>
  );
}
