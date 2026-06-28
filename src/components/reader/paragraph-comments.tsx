"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

interface ParagraphComment {
  id: string;
  content: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  comment_badge: string | null;
  is_subscriber: number;
}

interface ParagraphCommentsProps {
  paragraphIndex: number;
  chapterId: string;
  novelId: string;
  novelSlug: string;
  chapterNumber: number;
  comments: ParagraphComment[];
  isLoggedIn: boolean;
}

export function ParagraphComments({
  paragraphIndex,
  chapterId,
  novelId,
  novelSlug,
  chapterNumber,
  comments,
  isLoggedIn,
}: ParagraphCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [localComments, setLocalComments] = useState(comments);
  const [posting, setPosting] = useState(false);

  async function handleSubmit() {
    if (!text.trim() || text.trim().length < 3) return;
    setPosting(true);
    try {
      const res = await fetch("/api/comments/paragraph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novelId,
          chapterId,
          paragraphNumber: paragraphIndex + 1,
          content: text.trim().slice(0, 500),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erro ao comentar");
        return;
      }
      const newComment = await res.json();
      setLocalComments((prev) => [newComment, ...prev]);
      setText("");
      toast.success("Comentário adicionado!");
    } catch {
      toast.error("Erro ao enviar comentário");
    } finally {
      setPosting(false);
    }
  }

  return (
    <span className="inline-block align-middle ml-1.5 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] transition-colors hover:bg-primary/20 hover:text-primary text-muted-foreground/50"
        title="Comentar este parágrafo"
      >
        <MessageCircle className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 top-6 w-[320px] md:w-[380px] bg-card border border-border/60 rounded-xl shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
            <span className="text-xs font-semibold text-muted-foreground">
              Comentários deste parágrafo
            </span>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground/50 hover:text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-[240px] overflow-y-auto p-2 space-y-2">
            {localComments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum comentário ainda.
              </p>
            ) : (
              localComments.map((c) => (
                <div key={c.id} className="flex gap-2 p-2 rounded-lg bg-muted/30">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                      {c.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/authors/${c.username}`} className="text-[11px] font-medium hover:text-primary truncate">
                        {c.display_name}
                      </Link>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {isLoggedIn ? (
            <div className="p-2 border-t border-border/30 flex gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Comente este parágrafo..."
                rows={2}
                className="text-xs resize-none min-h-[40px]"
                maxLength={500}
              />
              <Button
                size="sm"
                className="shrink-0 self-end"
                onClick={handleSubmit}
                disabled={posting || text.trim().length < 3}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="p-3 border-t border-border/30 text-center">
              <Link
                href="/auth/login"
                className="text-xs text-primary hover:underline"
              >
                Faça login para comentar
              </Link>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
