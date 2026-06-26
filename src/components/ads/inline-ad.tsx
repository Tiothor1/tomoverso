"use client";

import { useEffect, useState } from "react";
import { getCookie } from "@/lib/client-cookies";

/**
 * Anúncio inline exibido entre parágrafos/conteúdo.
 * - Não aparece para assinantes
 * - Mostra anúncio real do AdSense quando configurado
 * - Fallback visual para quando AdSense não está ativo
 */
export function InlineAd({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isSub = !!getCookie("tomoverso-subscriber");
    setShow(!isSub);
  }, []);

  if (!show) return null;

  return (
    <div className={`my-8 ${className}`}>
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-center">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2">Publicidade</div>
        {/* Anúncio real do AdSense (descomentar quando aprovado) */}
        {process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" ? (
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client="ca-pub-2780687772948357"
            data-ad-slot="1234567890"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          /* Fallback visual */
          <div className="flex items-center justify-center gap-3 py-4 text-sm text-muted-foreground/60">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span>Espaço publicitário — Anuncie aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Anúncio de capítulo — aparece ao abrir um capítulo (topo do leitor).
 * Esse anúncio é exibido sempre que o usuário abre um capítulo para ler.
 */
export function ChapterAd({ chapterNumber }: { chapterNumber: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isSub = !!getCookie("tomoverso-subscriber");
    if (isSub) { setShow(false); return; }
    setShow(true);
  }, [chapterNumber]);

  if (!show) return null;

  return (
    <div className="mb-6 rounded-xl border border-border/30 bg-gradient-to-r from-amber-500/5 to-transparent p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2 text-center">Publicidade</div>
      {process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-2780687772948357"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground/50">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Anúncio</span>
        </div>
      )}
    </div>
  );
}

/**
 * Anúncio entre capítulos — aparece a cada 2 capítulos lidos.
 * chapterNumber: número atual do capítulo
 * interval: a cada quantos capítulos mostrar (default 2)
 */
export function InterChapterAd({ chapterNumber, interval = 2 }: { chapterNumber: number; interval?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isSub = !!getCookie("tomoverso-subscriber");
    if (isSub) { setShow(false); return; }
    // Mostra se o capítulo atual é múltiplo do intervalo (ex: cap 2, 4, 6, 8...)
    setShow(chapterNumber % interval === 0);
  }, [chapterNumber, interval]);

  if (!show) return null;

  return <InlineAd />;
}
