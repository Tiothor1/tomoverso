"use client";

import { useState, useCallback } from "react";
import {
  Bookmark, BookmarkCheck, List, Maximize, Minimize,
  Heart, HeartOff, ChevronRight, ChevronLeft,
} from "lucide-react";

interface ReaderSideActionsProps {
  manga: { slug: string; title: string };
  chapter: { id: string; chapter_number: number; slug: string };
  chapters: { id: string; chapter_number: number; title: string | null; slug: string }[];
  currentPage: number;
  totalPages: number;
  bookmarked: boolean;
  fullscreen: boolean;
  mode: "scroll" | "page";
  onToggleBookmark: () => void;
  onToggleFullscreen: () => void;
  onToggleMode: () => void;
  onChapterSelect: (slug: string) => void;
}

export function ReaderSideActions({
  manga, chapter, chapters,
  currentPage, totalPages,
  bookmarked, fullscreen, mode,
  onToggleBookmark, onToggleFullscreen, onToggleMode,
  onChapterSelect,
}: ReaderSideActionsProps) {
  const [showChapterList, setShowChapterList] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [hidden, setHidden] = useState(false);

  const handleChapterClick = useCallback((slug: string) => {
    setShowChapterList(false);
    onChapterSelect(slug);
  }, [onChapterSelect]);

  return (
    <>
      {/* Side actions bar */}
      <div className={`fixed top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 ${hidden ? "right-0" : "right-2 sm:right-3"}`}>
        {/* Toggle hide/show */}
        <button
          onClick={() => setHidden(!hidden)}
          className={`${hidden ? "h-9 w-7 rounded-l-lg rounded-r-none" : "h-8 w-8 rounded-lg"} flex items-center justify-center border border-black/80 bg-black text-white/75 shadow-lg shadow-black/35 backdrop-blur-sm transition-all hover:text-white`}
          title={hidden ? "Mostrar barra" : "Esconder barra"}
        >
          {hidden ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {!hidden && (<>
        {/* Bookmark */}
        <button
          onClick={onToggleBookmark}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
            bookmarked
              ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.25)]"
              : "border-white/10 bg-black/40 text-white/60 hover:bg-white/15 hover:text-white backdrop-blur-sm"
          }`}
          title={bookmarked ? "Remover marcador" : "Marcar página"}
        >
          {bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        </button>

        {/* Chapters */}
        <div className="relative">
          <button
            onClick={() => { setShowChapterList(!showChapterList); setShowDetails(false); }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
              showChapterList
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/10 bg-black/40 text-white/60 hover:bg-white/15 hover:text-white backdrop-blur-sm"
            }`}
            title="Capítulos"
          >
            <List className="h-5 w-5" />
          </button>

          {showChapterList && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowChapterList(false)} />
              <div className="absolute right-14 top-1/2 -translate-y-1/2 z-50 w-72 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f0f0f]/98 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-white/50 font-semibold">Capítulos</span>
                  <span className="text-[11px] text-white/30">{chapters.length} total</span>
                </div>
                <div className="p-2 space-y-0.5">
                  {chapters.map((c) => {
                    const active = c.id === chapter.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleChapterClick(`/manga/${manga.slug}/${c.slug}`)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                          active
                            ? "bg-primary/20 text-primary font-semibold"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="font-mono text-[11px] w-12 shrink-0 text-right text-white/30">
                          #{String(c.chapter_number).padStart(3, "0")}
                        </span>
                        <span className="truncate text-left">{c.title || `Capítulo ${c.chapter_number}`}</span>
                        {active && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mode toggle */}
        <button
          onClick={onToggleMode}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-black/40 text-xs font-bold text-white/60 hover:bg-white/15 hover:text-white backdrop-blur-sm transition-all"
          title={mode === "scroll" ? "Modo página" : "Modo scroll"}
        >
          {mode === "scroll" ? "P" : "S"}
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-black/40 text-white/60 hover:bg-white/15 hover:text-white backdrop-blur-sm transition-all"
          title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>

        {/* Page counter */}
        <div
          className="w-10 h-20 rounded-xl flex flex-col items-center justify-center gap-0.5 border border-white/10 bg-black/40 backdrop-blur-sm text-white/60"
          title={`Página ${currentPage + 1} de ${totalPages}`}
        >
          <button
            className="text-[10px] font-mono hover:text-white transition-colors"
            onClick={() => setShowDetails(!showDetails)}
          >
            {currentPage + 1}
          </button>
          <div className="w-4 h-px bg-white/20" />
          <span className="text-[10px] font-mono">{totalPages}</span>
        </div>
        </>)}
      </div>

      {/* Tooltip helper - page details popup */}
      {showDetails && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />
          <div className="fixed right-20 top-1/2 -translate-y-1/2 z-50 px-4 py-3 rounded-xl border border-white/10 bg-[#0f0f0f]/98 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <p className="text-sm text-white font-semibold">
              Capítulo {chapter.chapter_number}
            </p>
            <p className="text-xs text-white/50 mt-1">
              Página {currentPage + 1} de {totalPages}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Modo: {mode === "scroll" ? "Scroll" : "Página por página"}
            </p>
          </div>
        </>
      )}
    </>
  );
}
