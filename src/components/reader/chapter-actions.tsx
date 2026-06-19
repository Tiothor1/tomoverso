"use client";

import { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, MessageCircle, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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

  useEffect(() => {
    setReadingTime(Math.ceil(wordCount / 250));
    // Carrega likes/bookmarks do localStorage
    const stored = localStorage.getItem("tomoverso-chapter-states");
    if (stored) {
      try {
        const states = JSON.parse(stored);
        if (states[chapterId]?.liked) {
          setLiked(true);
          setLikes(states[chapterId].likes || 1);
        }
        if (states[chapterId]?.bookmarked) {
          setBookmarked(true);
        }
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
    const newLikes = newLiked ? likes + 1 : likes - 1;
    setLiked(newLiked);
    setLikes(newLikes);
    saveState({ liked: newLiked, likes: newLikes });
    if (newLiked) toast.success("❤️ Você curtiu este capítulo");
  }

  function toggleBookmark() {
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    saveState({ bookmarked: newBookmarked });
    if (newBookmarked) {
      toast.success("🔖 Salvo! Continue sua leitura a qualquer momento");
    }
  }

  function share() {
    const url = `${window.location.origin}/novels/${novelSlug}/${chapterNumber}`;
    if (navigator.share) {
      navigator.share({
        title: "Tomoverso",
        text: "Lendo essa LN incrível no Tomoverso",
        url,
      }).catch(() => copyToClipboard(url));
    } else {
      copyToClipboard(url);
    }
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLike}
        className={liked ? "text-red-500 hover:text-red-600" : ""}
      >
        <Heart className={`h-4 w-4 mr-1.5 ${liked ? "fill-red-500" : ""}`} />
        {likes > 0 ? likes : "Curtir"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={toggleBookmark}
        className={bookmarked ? "text-primary" : ""}
      >
        <Bookmark className={`h-4 w-4 mr-1.5 ${bookmarked ? "fill-primary" : ""}`} />
        {bookmarked ? "Salvo" : "Salvar"}
      </Button>

      <Button variant="ghost" size="sm" onClick={share}>
        <Share2 className="h-4 w-4 mr-1.5" />
        Compartilhar
      </Button>

      <span className="flex items-center gap-1.5 text-xs">
        <Eye className="h-3.5 w-3.5" />
        {viewCount.toLocaleString("pt-BR")} leituras
      </span>

      <span className="flex items-center gap-1.5 text-xs">
        <Clock className="h-3.5 w-3.5" />
        ~{readingTime} min
      </span>

      <Button variant="ghost" size="sm" asChild>
        <a href="#comments">
          <MessageCircle className="h-4 w-4 mr-1.5" />
          Comentários
        </a>
      </Button>
    </div>
  );
}
