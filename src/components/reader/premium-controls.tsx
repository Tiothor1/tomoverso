"use client";

import { useEffect, useState } from "react";
import { getCookie } from "@/lib/client-cookies";
import { Crown, Lock, Minus, Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "tomoverso-reader-prefs";

interface ReaderPrefs {
  fontSize: number;
  lineHeight: number;
  maxWidth: "narrow" | "medium" | "wide";
  theme: "sepia" | "dark" | "light" | "green";
}

const defaultPrefs: ReaderPrefs = {
  fontSize: 18,
  lineHeight: 1.8,
  maxWidth: "medium",
  theme: "sepia",
};

const themes: Record<string, { bg: string; text: string; heading: string }> = {
  sepia: { bg: "#f5f0e8", text: "#3d3229", heading: "#2d2219" },
  dark: { bg: "#1a1a2e", text: "#e0e0e0", heading: "#ffffff" },
  light: { bg: "#ffffff", text: "#1a1a2e", heading: "#000000" },
  green: { bg: "#e8f5e9", text: "#2e3d2e", heading: "#1a2e1a" },
};

export function PremiumReaderControls() {
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [prefs, setPrefs] = useState<ReaderPrefs>(defaultPrefs);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sub = !!getCookie("tomoverso-subscriber");
    setIsSubscriber(sub);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPrefs({ ...defaultPrefs, ...JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.querySelector(".prose-ln") as HTMLElement;
    if (!root) return;

    // Apply reader styles
    root.style.fontSize = `${prefs.fontSize}px`;
    root.style.lineHeight = String(prefs.lineHeight);
    root.style.maxWidth =
      prefs.maxWidth === "narrow" ? "680px" :
      prefs.maxWidth === "medium" ? "860px" : "1100px";
    root.style.margin = "0 auto";

    // Apply theme
    const theme = themes[prefs.theme];
    if (theme && isSubscriber) {
      root.style.backgroundColor = theme.bg;
      root.style.color = theme.text;
    }

    if (isSubscriber) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
    }
  }, [prefs, isSubscriber]);

  if (!isSubscriber) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {show && (
        <div className="mb-2 rounded-2xl border border-border/60 bg-card p-4 shadow-lg shadow-black/10 w-64 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modo Leitura Premium</p>

          {/* Font size */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Type className="h-3 w-3" /> Tamanho
            </label>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setPrefs(p => ({...p, fontSize: Math.max(14, p.fontSize - 2)}))}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-10 text-center text-xs font-mono">{prefs.fontSize}px</span>
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setPrefs(p => ({...p, fontSize: Math.min(28, p.fontSize + 2)}))}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Line height */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              Espaçamento
            </label>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setPrefs(p => ({...p, lineHeight: Math.max(1.4, +(p.lineHeight - 0.2).toFixed(1))}))}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-14 text-center text-xs font-mono">{prefs.lineHeight}</span>
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setPrefs(p => ({...p, lineHeight: Math.min(2.4, +(p.lineHeight + 0.2).toFixed(1))}))}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Width */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7-6h6" /></svg>
              Largura
            </label>
            <div className="flex gap-1">
              {(["narrow", "medium", "wide"] as const).map(w => (
                <button key={w} onClick={() => setPrefs(p => ({...p, maxWidth: w}))}
                  className={`flex-1 rounded-lg py-1 text-[10px] font-medium uppercase transition-colors ${
                    prefs.maxWidth === w ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}>
                  {w === "narrow" ? "Estreito" : w === "medium" ? "Médio" : "Largo"}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-1">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
              Tema
            </label>
            <div className="flex gap-1">
              {Object.entries(themes).map(([key, t]) => (
                <button key={key} onClick={() => setPrefs(p => ({...p, theme: key as ReaderPrefs["theme"]}))}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors"
                  style={{ backgroundColor: t.bg, color: t.text }}>
                  {key === "sepia" ? "Sépia" : key === "dark" ? "Escuro" : key === "light" ? "Claro" : "Verde"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setShow(!show)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all">
        <Crown className="h-3.5 w-3.5" />
        {show ? "Fechar" : "Leitor Premium"}
      </button>
    </div>
  );
}
