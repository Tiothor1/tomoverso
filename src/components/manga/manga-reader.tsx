"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, List, ArrowLeft } from "lucide-react";
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

/**
 * MangaReader — leitor vertical de mangá.
 *
 * Features:
 * - Páginas em coluna única, largura natural, sem cortar/esticar
 * - Lazy loading (loading="lazy") em todas as imagens
 * - Skeleton enquanto imagem carrega
 * - Botões fixos inferior: prev/next chapter + abrir lista
 * - Topbar: voltar pro mangá + indicador de progresso
 * - Lista lateral de capítulos (drawer simples em mobile)
 */
export function MangaReader({
  manga,
  chapter,
  pages,
  prevChapter,
  nextChapter,
  allChapters,
}: MangaReaderProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="container mx-auto max-w-7xl px-4 h-14 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
            <Link href={`/manga/${manga.slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{manga.title}</span>
              <span className="sm:hidden">Voltar</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="text-white border-white/20 shrink-0">
              Cap {chapter.chapter_number}
            </Badge>
            <span className="text-sm text-white/70 truncate">
              {chapter.title || `Capítulo ${chapter.chapter_number}`}
            </span>
          </div>
          <ChapterListButton manga={manga} allChapters={allChapters} currentChapterId={chapter.id} />
        </div>
      </div>

      {/* Páginas — coluna única, largura natural, lazy load */}
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

      {/* Footer com prev/next */}
      <div className="border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur sticky bottom-0 z-40">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          {prevChapter ? (
            <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              <Link href={`/manga/${manga.slug}/${prevChapter.slug}`}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Cap {prevChapter.chapter_number}</span>
                <span className="sm:hidden">Anterior</span>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled className="border-white/10 text-white/30">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Primeiro
            </Button>
          )}
          <div className="text-xs text-white/60 hidden sm:block">
            {pages.length} {pages.length === 1 ? "página" : "páginas"}
          </div>
          {nextChapter ? (
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
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

/** Imagem individual — usa <img> em vez de next/image pra evitar otimização agressiva */
function PageImage({ page, index, total }: { page: MangaReaderPage; index: number; total: number }) {
  // Fallback para width/height se null
  const aspectRatio =
    page.width && page.height ? page.height / page.width : 1.4; // proporção típica de página de mangá

  return (
    <div
      className="w-full max-w-3xl mx-auto"
      style={{ aspectRatio: `${1} / ${aspectRatio}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.image_url}
        alt={`Página ${page.page_number}`}
        loading={index < 3 ? "eager" : "lazy"}
        decoding="async"
        className="w-full h-auto block mx-auto select-none"
        draggable={false}
        onError={(e) => {
          e.currentTarget.style.opacity = "0.3";
          e.currentTarget.alt = `❌ Página ${page.page_number} falhou ao carregar`;
        }}
      />
      {/* Indicador discreto de página, lado direito */}
      <div className="text-center text-xs text-white/30 py-2">
        {page.page_number} / {total}
      </div>
    </div>
  );
}

/** Botão que abre drawer com lista de capítulos */
function ChapterListButton({
  manga,
  allChapters,
  currentChapterId,
}: {
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