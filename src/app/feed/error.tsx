"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, BookOpen } from "lucide-react";

export default function FeedError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[feed] Route error boundary", error);
  }, [error]);

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-6 py-16">
      <div className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center text-center">
        <div className="glass-panel error-state rounded-[2rem] p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-destructive/25 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-primary">
            Feed fora da estante
          </div>
          <h1 className="font-heading text-3xl font-black sm:text-5xl">Não foi possível carregar o feed agora.</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Registramos o erro. Você pode tentar novamente ou seguir para o catálogo enquanto reorganizamos a página.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={reset} className="neon-button rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground hover:bg-primary/90">
              Tentar novamente
            </button>
            <Link href="/explore" className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/55 px-5 py-3 text-sm font-black text-foreground hover:bg-muted/70">
              <BookOpen className="mr-2 h-4 w-4" />
              Explorar obras
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
