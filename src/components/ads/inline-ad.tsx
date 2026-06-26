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
        {/* Anúncio real do AdSense */}
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-2780687772948357"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
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
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-2780687772948357"
        data-ad-slot="1234567890"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
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
