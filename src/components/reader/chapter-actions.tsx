"use client";

import { useState, useEffect } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  Link as LinkIcon,
  MessageCircle,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChapterActionsProps {
  chapterId: string;
  novelSlug: string;
  chapterNumber: number;
  wordCount: number;
  viewCount: number;
}

export function ChapterActions({
  chapterId,
  novelSlug,
  chapterNumber,
  wordCount,
  viewCount,
}: ChapterActionsProps) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setReadingTime(Math.ceil(wordCount / 250));
    const stored = localStorage.getItem("tomoverso-chapter-states");
    if (stored) {
      try {
        const states = JSON.parse(stored);
        if (states[chapterId]?.liked) {
          setLiked(true);
          setLikes(states[chapterId].likes || 1);
        }
        if (states[chapterId]?.bookmarked) setBookmarked(true);
      } catch {}
    }
  }, [chapterId, wordCount]);

  function saveState(update: Record<string, unknown>) {
    const stored = localStorage.getItem("tomoverso-chapter-states") || "{}";
    const states = JSON.parse(stored);
    states[chapterId] = { ...(states[chapterId] || {}), ...update };
    localStorage.setItem("tomoverso-chapter-states", JSON.stringify(states));
  }

  function toggleLike() {
    const newLiked = !liked;
    const newLikes = Math.max(0, newLiked ? likes + 1 : likes - 1);
    setLiked(newLiked);
    setLikes(newLikes);
    saveState({ liked: newLiked, likes: newLikes });
    if (newLiked) toast.success("Você curtiu este capítulo");
  }

  function toggleBookmark() {
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    saveState({ bookmarked: newBookmarked });
    if (newBookmarked) toast.success("Capítulo salvo na leitura");
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  function share() {
    const url = `${window.location.origin}/novels/${novelSlug}/${chapterNumber}`;
    if (navigator.share) {
      navigator.share({ title: "Tomo Verso Editora", text: "Lendo no Tomo Verso Editora", url }).catch(() => copyToClipboard(url));
    } else {
      copyToClipboard(url);
    }
  }

  function copyLink() {
    copyToClipboard(`${window.location.origin}/novels/${novelSlug}/${chapterNumber}`);
  }

  const actionClass = "flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/55 text-white/65 shadow-lg shadow-black/25 backdrop-blur-md transition hover:bg-black/80 hover:text-white";

  return (
    <div className="fixed right-2 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 sm:right-3">
      <button
        type="button"
        onClick={() => setHidden((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/80 bg-black text-white/75 shadow-lg shadow-black/35 transition hover:text-white"
        title={hidden ? "Mostrar ícones" : "Esconder ícones"}
        aria-label={hidden ? "Mostrar ícones da lateral" : "Esconder ícones da lateral"}
      >
        {hidden ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {!hidden ? (
        <>
          <button type="button" onClick={toggleLike} className={cn(actionClass, liked && "border-red-400/30 bg-red-500/15 text-red-300")} title={liked ? "Descurtir" : "Curtir"}>
            <Heart className={cn("h-5 w-5", liked && "fill-current")} />
          </button>
          <button type="button" onClick={toggleBookmark} className={cn(actionClass, bookmarked && "border-amber-300/35 bg-amber-300/15 text-amber-200")} title={bookmarked ? "Remover salvo" : "Salvar capítulo"}>
            {bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
          </button>
          <a href="#comments" className={actionClass} title="Comentários">
            <MessageCircle className="h-5 w-5" />
          </a>
          <button type="button" onClick={share} className={actionClass} title="Compartilhar">
            <Share2 className="h-5 w-5" />
          </button>
          <button type="button" onClick={copyLink} className={actionClass} title="Copiar link">
            <LinkIcon className="h-5 w-5" />
          </button>
          <div className="hidden w-10 rounded-xl border border-white/10 bg-black/45 px-1.5 py-2 text-center text-[10px] text-white/55 backdrop-blur-md sm:block" title={`${viewCount.toLocaleString("pt-BR")} leituras · ${readingTime} min`}>
            <Eye className="mx-auto mb-1 h-3.5 w-3.5" />
            <Clock className="mx-auto h-3.5 w-3.5" />
            <span className="mt-1 block">{readingTime}m</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
