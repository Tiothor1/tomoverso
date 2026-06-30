"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function FeedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[feed] Route error boundary", error);
  }, [error]);

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-black px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-5 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-fuchsia-100">
          Feed indisponível
        </div>
        <h1 className="font-heading text-3xl font-black sm:text-5xl">Não foi possível carregar o feed agora.</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/65 sm:text-base">
          O erro técnico foi registrado. Você pode tentar novamente ou explorar as obras do Tomoverso.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="rounded-full bg-white px-5 py-3 text-sm font-black text-black hover:bg-fuchsia-100">
            Tentar novamente
          </button>
          <Link href="/explore" className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
            Explorar obras
          </Link>
        </div>
      </div>
    </main>
  );
}
