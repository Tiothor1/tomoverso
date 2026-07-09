"use client";

import { useEffect, useState, useRef } from "react";

function getRemaining(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0 };
  const total = Math.floor(diff / 1000);
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function LaunchPage() {
  const [remaining, setRemaining] = useState({ h: 99, m: 99, s: 99 });
  const [currentInfo, setCurrentInfo] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const target = document.body.getAttribute("data-launch-target") || "2026-07-09T22:00:00-03:00";
    setRemaining(getRemaining(target));
    const timer = setInterval(() => setRemaining(getRemaining(target)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentInfo((p) => (p + 1) % 4), 5000);
    return () => clearInterval(interval);
  }, []);

  const infos = [
    {
      icon: "📖",
      title: "Milhares de novels, mangás e histórias",
      desc: "Leitura gratuita, sem enrolação. De light novels a webcomics brasileiros.",
    },
    {
      icon: "✍️",
      title: "Publique sua própria história",
      desc: "Crie, edite e publique capítulos. Sua obra, seu universo, seu público.",
    },
    {
      icon: "🎶",
      title: "TomoMusic embutido",
      desc: "Música ambiente lofi gratuita enquanto você lê. Sem anúncio, sem pausa.",
    },
    {
      icon: "🏆",
      title: "Promoção de lançamento",
      desc: "Poste sobre o site no TikTok/Instagram, marque @fb_fandub e ganhe 30 dias grátis do Plano Leitor!",
    },
  ];

  const total = remaining.h * 3600 + remaining.m * 60 + remaining.s;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050806] text-white overflow-hidden">
      {/* Background video */}
      <div className="absolute inset-0 z-0 opacity-20">
        <iframe
          ref={iframeRef}
          src="https://www.youtube.com/embed/U6oxLf6D1us?autoplay=1&loop=1&playlist=U6oxLf6D1us&controls=0&showinfo=0&rel=0&mute=1&modestbranding=1"
          className="h-full w-full pointer-events-none"
          style={{ filter: "blur(4px) saturate(0.6)" }}
          allow="autoplay; encrypted-media"
          title="Tomo Verso Editora"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050806]/90 via-[#050806]/70 to-[#050806]/95" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center">
        {/* Logo / Title */}
        <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.25em] text-amber-100">
          🔮 Em breve
        </div>

        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
          Tomo Verso
          <br />
          <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
            Editora
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
          Onde histórias ganham vida. Leitura, criação e comunidade — tudo num só lugar.
        </p>

        {/* Countdown */}
        <div className="mt-8 w-full max-w-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-200/80">
            Lançamento em
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <div className="flex flex-col items-center">
              <span className="font-mono text-4xl font-black tabular-nums text-white sm:text-5xl">
                {pad(remaining.h)}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                Horas
              </span>
            </div>
            <span className="mb-6 text-3xl font-black text-amber-300">:</span>
            <div className="flex flex-col items-center">
              <span className="font-mono text-4xl font-black tabular-nums text-white sm:text-5xl">
                {pad(remaining.m)}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                Min
              </span>
            </div>
            <span className="mb-6 text-3xl font-black text-amber-300">:</span>
            <div className="flex flex-col items-center">
              <span className="font-mono text-4xl font-black tabular-nums text-white sm:text-5xl">
                {pad(remaining.s)}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                Seg
              </span>
            </div>
          </div>
          {total <= 0 && (
            <p className="mt-4 text-sm text-emerald-300">O Tomoverso já pode estar disponível! Recarregue a página.</p>
          )}
        </div>

        {/* Rotating info */}
        <div className="mt-8 w-full max-w-md rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] px-5 py-5 backdrop-blur-sm transition-all duration-500">
          <div className="text-3xl">{infos[currentInfo].icon}</div>
          <h3 className="mt-3 text-base font-black text-white">{infos[currentInfo].title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{infos[currentInfo].desc}</p>
        </div>
      </div>

      {/* Promo footer */}
      <div className="relative z-10 mt-8 w-full max-w-lg border-t border-amber-300/15 px-4 pt-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/70">
          🎁 Promoção de lançamento
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Poste sobre o Tomoverso no{" "}
          <strong className="text-white">TikTok</strong> ou{" "}
          <strong className="text-white">Instagram</strong>, marque{" "}
          <strong className="text-amber-200">@fb_fandub</strong> e crie sua conta no site.
          Você ganha <strong className="text-amber-200">30 dias grátis do Plano Leitor</strong>!
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Prazo: até sábado (11/07) às 12h. Posts após esse horário não valem a promoção.
        </p>

        <div className="mt-5 flex items-center justify-center gap-4">
          <a
            href="https://t.me/tomoversoeditora"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-5 py-2.5 text-sm font-bold text-sky-200 transition hover:bg-sky-400/20"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Entre no Telegram
          </a>
        </div>

        <p className="mt-5 text-[10px] text-slate-600">
          Feito com ♥ no Brasil
        </p>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 h-1 bg-amber-300/20">
        <div
          className="h-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-1000"
          style={{ width: `${Math.min(100, (1 - total / 21600) * 100)}%` }}
        />
      </div>
    </div>
  );
}
