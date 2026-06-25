/**
 * Componente de anúncio.
 * 
 * COMO USAR: Coloque <AdSlot /> em qualquer lugar que você queira exibir anúncios
 * (entre capítulos, na sidebar, no rodapé, etc).
 * 
 * CONFIGURAÇÃO:
 * 1. Crie uma conta no Google AdSense (https://adsense.google.com)
 * 2. Adicione seu site e obtenha o código do ad unit
 * 3. Substitua o "ca-pub-XXXXX" abaixo pelo seu publisher ID
 * 4. Substitua o data-ad-slot pelo slot ID do AdSense
 * 
 * ALTERNATIVAS:
 * - Propaganda afiliada (Amazon, Mercado Livre, etc)
 * - Anúncios nativos via BuySellAds
 * - Parceria direta com editoras de light novel
 */

"use client";

import { useEffect, useState } from "react";
import { getCookie } from "@/lib/client-cookies";

// Descomente para ativar o AdSense real
// const ADSENSE_PUBLISHER = "ca-pub-0000000000000000"; // ← substitua pelo seu

export function AdSlot({ format = "auto", className = "" }: { format?: string; className?: string }) {
  const [showAd, setShowAd] = useState(true);

  useEffect(() => {
    // Não mostrar anúncios para assinantes
    const hasSub = document.cookie.includes("tomoverso-subscriber=1");
    setShowAd(!hasSub);
  }, []);

  if (!showAd) return null;

  return (
    <div className={`my-4 flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/30 text-center text-xs text-muted-foreground ${className}`}>
      <div className="p-4">
        <p className="text-[10px] uppercase tracking-widest opacity-40">Publicidade</p>
        <p className="mt-1">
          {/* Adsense real: descomente quando tiver o código */}
          {/* <ins class="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={ADSENSE_PUBLISHER}
            data-ad-slot="0000000000"
            data-ad-format={format}
            data-full-width-responsive="true"
          /> */}
          Espaço reservado para anúncio.
        </p>
        <p className="mt-2 text-[10px] opacity-30">
          <a href="/store/plans" className="hover:underline">Assine Pro e remova anúncios</a>
        </p>
      </div>
    </div>
  );
}

/**
 * Banner de incentivo à assinatura (mostrado para não-assinantes)
 */
export function SubscribePrompt() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const hasSub = document.cookie.includes("tomoverso-subscriber=1");
    setShow(!hasSub);
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-card p-6 text-center">
      <p className="text-lg font-bold">💎 Apoie o Tomoverso</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Remova anúncios, tenha acesso antecipado e badge exclusivo.
      </p>
      <a
        href="/store/plans"
        className="mt-3 inline-block rounded-xl bg-amber-500 px-6 py-2 text-sm font-bold text-amber-950 hover:bg-amber-400"
      >
        Ver planos
      </a>
    </div>
  );
}
