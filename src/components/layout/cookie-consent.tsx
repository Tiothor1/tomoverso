"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem("cookie-consent");
    if (!consented) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 overflow-x-hidden animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="mx-auto max-w-7xl px-4 pb-4">
        <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl border border-border/60 p-4 shadow-2xl sm:flex-row sm:gap-4">
          <p className="text-center text-sm text-muted-foreground sm:text-left sm:flex-1">
            Usamos cookies e armazenamento local para melhorar sua experiência. Ao continuar, você concorda.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={accept}
              className="neon-button inline-flex cursor-pointer items-center rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Aceitar
            </button>
            <Link
              href="/privacidade"
              className="inline-flex items-center rounded-xl border border-border/60 px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              Saiba mais
            </Link>
            <button
              onClick={accept}
              className="inline-flex items-center justify-center rounded-xl p-2 text-muted-foreground transition-colors hover:bg-accent"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
