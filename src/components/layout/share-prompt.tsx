"use client";

import { X, Share2, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

export function SharePrompt() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show after user has been on page for 10 seconds or scrolled 50%
    const handleScroll = () => {
      if (dismissed) return;
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrollPercent > 0.3 || document.readyState === "complete") {
        setTimeout(() => { if (!dismissed) setShow(true); }, 8000);
      }
    };
    
    const timer = setTimeout(() => {
      if (!dismissed) setShow(true);
    }, 12000);

    window.addEventListener("scroll", handleScroll, { once: true });

    // Check localStorage
    try {
      if (localStorage.getItem("tomoverso_share_prompt_dismissed")) setDismissed(true);
    } catch {}

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [dismissed]);

  if (!show || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    try { localStorage.setItem("tomoverso_share_prompt_dismissed", "true"); } catch {}
  };

  const handleShare = () => {
    const url = window.location.href;
    const text = "📚 Tô lendo aqui na Tomo Verso Editora — mangás, novels e manhwas em português! Vem ler também:";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({ title: "Tomo Verso Editora", text, url }).catch(() => {});
    } else {
      const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
      window.open(wa, "_blank");
    }
    handleDismiss();
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-5 max-w-[320px] relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-full p-2.5 mt-0.5 shrink-0">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100 mb-1">Gostou do que viu?</p>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Compartilhe com um amigo que também ama mangás e novels! Isso ajuda o site a crescer 🚀
            </p>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Compartilhar agora <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
