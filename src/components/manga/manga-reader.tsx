"use client";

import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, List, ArrowLeft, Maximize, Minimize, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface MangaReaderChapter {
  id: string;
  chapter_number: number;
  title: string | null;
  slug: string;
  page_count: number;
}

export interface MangaReaderPage {
  id: string;
  page_number: number;
  image_url: string;
  width: number | null;
  height: number | null;
}

interface MangaReaderProps {
  manga: { slug: string; title: string };
  chapter: MangaReaderChapter;
  pages: MangaReaderPage[];
  prevChapter: MangaReaderChapter | null;
  nextChapter: MangaReaderChapter | null;
  allChapters: MangaReaderChapter[];
}

export function MangaReader({
  manga, chapter, pages, prevChapter, nextChapter, allChapters,
}: MangaReaderProps) {
  const [mode, setMode] = useState<"scroll" | "page">("scroll");
  const [pageIdx, setPageIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstPageRef = useRef<HTMLDivElement>(null);

  // Check bookmark on mount
  useEffect(() => {
    const saved = localStorage.getItem(`manga-bookmark-${manga.slug}-${chapter.chapter_number}`);
    if (saved) {
      setBookmarked(true);
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < pages.length) setPageIdx(idx);
    }
  }, [manga.slug, chapter.chapter_number, pages.length]);

  const toggleBookmark = useCallback(() => {
    const key = `manga-bookmark-${manga.slug}-${chapter.chapter_number}`;
    if (bookmarked) {
      localStorage.removeItem(key);
      setBookmarked(false);
    } else {
      localStorage.setItem(key, String(pageIdx));
      setBookmarked(true);
    }
  }, [bookmarked, manga.slug, chapter.chapter_number, pageIdx]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  }, []);

  // Save page position on change
  useEffect(() => {
    if (bookmarked) {
      localStorage.setItem(`manga-bookmark-${manga.slug}-${chapter.chapter_number}`, String(pageIdx));
    }
  }, [pageIdx, bookmarked, manga.slug, chapter.chapter_number]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mode === "page") {
        if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const goNext = useCallback(() => {
    if (pageIdx < pages.length - 1) setPageIdx((i) => i + 1);
    else if (nextChapter) window.location.href = `/manga/${manga.slug}/${nextChapter.slug}`;
  }, [pageIdx, pages.length, nextChapter, manga.slug]);

  const goPrev = useCallback(() => {
    if (pageIdx > 0) setPageIdx((i) => i - 1);
    else if (prevChapter) window.location.href = `/manga/${manga.slug}/${prevChapter.slug}`;
  }, [pageIdx, prevChapter, manga.slug]);

  // Click handler for page mode
  const handlePageClick = useCallback((e: React.MouseEvent) => {
    if (mode !== "page") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x > third * 2) goNext();
    else if (x < third) goPrev();
  }, [mode, goNext, goPrev]);

  // Scroll mode scroll detection
  useEffect(() => {
    if (mode !== "scroll" || !firstPageRef.current) return;
    // On mount in scroll mode, scroll to top
    window.scrollTo(0, 0);
  }, [mode, chapter.chapter_number]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#06040a] text-foreground">
      {/* Topbar */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#06040a]/92 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 h-14 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 shrink-0">
            <Link href={`/manga/${manga.slug}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline truncate max-w-[120px]">{manga.title}</span>
              <span className="sm:hidden">Voltar</span>
            </Link>
          </Button>
          <div className="flex items-center gap-1 min-w-0">
            <Badge variant="outline" className="shrink-0 border-primary/35 bg-primary/10 text-xs text-white shadow-[0_0_18px_rgba(168,85,247,0.18)]">
              Cap {chapter.chapter_number}
            </Badge>
            {/* Mode toggle */}
            <button
              onClick={() => { setMode(mode === "scroll" ? "page" : "scroll"); setPageIdx(0); }}
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-white/75 hover:bg-primary/15 hover:text-white"
              title={mode === "scroll" ? "Modo página" : "Modo scroll"}
            >
              {mode === "scroll" ? "📄 Pág" : "📜 Scroll"}
            </button>
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-full p-1.5 text-white/70 hover:bg-primary/15 hover:text-white"
              title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            {/* Bookmark */}
            <button
              onClick={toggleBookmark}
              className={`rounded-full p-1.5 ${bookmarked ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]" : "text-white/70"} hover:bg-primary/15 hover:text-white`}
              title={bookmarked ? "Remover marcador" : "Marcar página"}
            >
              {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          </div>
          <ChapterListButton manga={manga} allChapters={allChapters} currentChapterId={chapter.id} />
        </div>
      </div>

      {mode === "scroll" ? (
        /* ═══ SCROLL MODE (original) ═══ */
        <div className="flex flex-col items-center py-4">
          {pages.length === 0 && (
            <div className="py-20 text-center text-white/50">
              <p>Nenhuma página disponível neste capítulo.</p>
            </div>
          )}
          {pages.map((page, idx) => (
            <PageImage key={page.id} page={page} index={idx} total={pages.length} />
          ))}
        </div>
      ) : (
        /* ═══ PAGE MODE (virar página) ═══ */
        <div
          className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] select-none cursor-pointer relative"
          onClick={handlePageClick}
        >
          {pages.length === 0 ? (
            <div className="text-center text-white/50">
              <p>Nenhuma página disponível.</p>
            </div>
          ) : (
            <div className="relative w-full max-w-4xl mx-auto flex items-center justify-center">
              {/* Current page */}
              <div className="flex flex-col items-center w-full max-h-[calc(100vh-4rem)]">
                <img
                  src={pages[pageIdx].image_url}
                  alt={`Página ${pages[pageIdx].page_number}`}
                  className="max-w-full max-h-[calc(100vh-4rem)] w-auto h-auto object-contain select-none"
                  draggable={false}
                  style={{ aspectRatio: "auto" }}
                />
              </div>
              {/* Navigation indicators */}
              <div className="absolute inset-0 flex pointer-events-none">
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full" />
              </div>
            </div>
          )}

          {/* Page counter / overlay bottom */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white shadow-[0_0_24px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <span>{pageIdx + 1} / {pages.length}</span>
            {prevChapter && pageIdx === 0 && (
              <span className="text-white/50 text-[10px]">« Anterior</span>
            )}
            {nextChapter && pageIdx >= pages.length - 1 && (
              <span className="text-white/50 text-[10px]">Próximo »</span>
            )}
          </div>

          {/* Tap zone indicators — subtle */}
          <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
            <div className="w-1/3 h-full flex items-center justify-start pl-4 opacity-0 group-hover:opacity-30">
              <ChevronLeft className="h-8 w-8 text-white/30" />
            </div>
            <div className="w-1/3 h-full" />
            <div className="w-1/3 h-full flex items-center justify-end pr-4 opacity-0 group-hover:opacity-30">
              <ChevronRight className="h-8 w-8 text-white/30" />
            </div>
          </div>
        </div>
      )}

      {/* Footer navigation (both modes) */}
      <div className="border-t border-white/10 bg-[#06040a]/95 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          {prevChapter ? (
            <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-primary/15">
              <Link href={`/manga/${manga.slug}/${prevChapter.slug}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Cap {prevChapter.chapter_number}</span>
                <span className="sm:hidden">Anterior</span>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled className="border-white/10 text-white/30">
              <ChevronLeft className="h-4 w-4 mr-1" /> Primeiro
            </Button>
          )}
          <div className="text-xs text-white/60 hidden sm:block">
            {pages.length} {pages.length === 1 ? "página" : "páginas"}
          </div>
          {nextChapter ? (
            <Button asChild size="sm" className="neon-button bg-primary hover:bg-primary/90">
              <Link href={`/manga/${manga.slug}/${nextChapter.slug}`}>
                <span className="hidden sm:inline">Cap {nextChapter.chapter_number}</span>
                <span className="sm:hidden">Próximo</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled className="bg-primary/30">
              Último <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PageImage({ page, index, total }: { page: MangaReaderPage; index: number; total: number }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="w-full max-w-3xl mx-auto">
      {!loaded && (
        <div className="w-full min-h-[80vh] bg-white/[0.03] animate-pulse rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-white/20">
            <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-xs">Carregando...</span>
          </div>
        </div>
      )}
      <img
        src={page.image_url}
        alt={`Página ${page.page_number}`}
        loading={index < 10 ? "eager" : "lazy"}
        decoding="async"
        className={`w-full h-auto block mx-auto select-none ${loaded ? "opacity-100" : "opacity-0 h-0"}`}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          e.currentTarget.style.opacity = "0.3";
          setLoaded(true);
        }}
      />
      <div className="text-center text-xs text-white/30 py-2">
        {page.page_number} / {total}
      </div>
    </div>
  );
}

function ChapterListButton({ manga, allChapters, currentChapterId }: {
  manga: { slug: string };
  allChapters: MangaReaderChapter[];
  currentChapterId: string;
}) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-white/10 text-white">
        <List className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 top-full mt-2 w-72 max-h-[70vh] overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-50">
        <div className="p-3 border-b border-white/10 text-xs uppercase tracking-wider text-white/50 font-semibold">
          Capítulos
        </div>
        <div className="p-1">
          {allChapters.map((c) => {
            const active = c.id === currentChapterId;
            return (
              <Link
                key={c.id}
                href={`/manga/${manga.slug}/${c.slug}`}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-white/10 ${
                  active ? "bg-primary/20 text-primary" : "text-white/80"
                }`}
              >
                <span className="font-mono text-xs text-white/50 w-10 shrink-0">
                  #{String(c.chapter_number).padStart(3, "0")}
                </span>
                <span className="truncate">{c.title || `Capítulo ${c.chapter_number}`}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </details>
  );
}
