"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FeedCommentItem, FeedItem } from "@/lib/feed/types";

type Props = {
  item: FeedItem | null;
  open: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  loadComments: (item: FeedItem) => Promise<FeedCommentItem[]>;
  sendComment: (item: FeedItem, body: string) => Promise<boolean>;
};

export function FeedCommentDrawer({ item, open, isLoggedIn, onClose, loadComments, sendComment }: Props) {
  const [comments, setComments] = useState<FeedCommentItem[]>([]);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true);
    loadComments(item)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [open, item?.id]);

  if (!open || !item) return null;

  function submit() {
    if (!item || !body.trim()) return;
    startTransition(async () => {
      const ok = await sendComment(item, body);
      if (ok) {
        setBody("");
        const fresh = await loadComments(item);
        setComments(fresh);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar comentários" className="absolute inset-0" onClick={onClose} />
      <section className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-[2rem] border border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/80 md:inset-y-6 md:left-auto md:right-6 md:w-[28rem] md:rounded-[2rem]">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-300">Comentários</p>
            <h3 className="mt-1 line-clamp-1 font-heading text-xl font-black">{item.title}</h3>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="max-h-[48dvh] overflow-y-auto px-5 py-4 md:max-h-[58dvh]">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-white/60">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> carregando...
            </div>
          ) : comments.length ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <article key={comment.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-400/15 text-xs font-black text-fuchsia-100">
                      {comment.user.avatarUrl ? <img src={comment.user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : comment.user.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{comment.user.displayName}</p>
                      <p className="text-[11px] text-white/45">@{comment.user.username}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/85">{comment.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/60">
              Seja o primeiro comentário nesse card.
            </div>
          )}
        </div>

        <footer className="border-t border-white/10 p-4">
          {isLoggedIn ? (
            <div className="flex gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escreve um comentário curto..."
                className="min-h-12 flex-1 resize-none border-white/10 bg-white/[0.06] text-white placeholder:text-white/35"
              />
              <Button type="button" onClick={submit} disabled={isPending || !body.trim()} className="h-auto rounded-2xl px-4">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Button asChild className="w-full rounded-2xl">
              <a href="/auth/login">Entrar para comentar</a>
            </Button>
          )}
        </footer>
      </section>
    </div>
  );
}
