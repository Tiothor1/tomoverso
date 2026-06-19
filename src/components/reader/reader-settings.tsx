"use client";

import { useEffect, useState } from "react";
import { Type, Minus, Plus, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReaderSettings = {
  fontSize: number; // 14-24
  lineHeight: number; // 1.4-2.2
  fontFamily: "serif" | "sans" | "mono";
  maxWidth: number; // 40-90 (em rem)
};

const defaultSettings: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.7,
  fontFamily: "serif",
  maxWidth: 48,
};

const STORAGE_KEY = "tomoverso-reader-settings";

export function ReaderSettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const prose = document.querySelector(".prose-ln") as HTMLElement;
    if (!prose) return;
    prose.style.fontSize = `${settings.fontSize}px`;
    prose.style.lineHeight = String(settings.lineHeight);
    const fonts = { serif: "var(--font-lora)", sans: "var(--font-jakarta)", mono: "var(--font-geist-mono)" };
    prose.style.fontFamily = fonts[settings.fontFamily];
    const container = prose.closest("article") as HTMLElement;
    if (container) container.style.maxWidth = `${settings.maxWidth * 0.25}rem`;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        title="Configurações de leitura"
        className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-lg"
      >
        <Settings2 className="h-5 w-5" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-20 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                Leitura
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Font size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Tamanho da fonte</span>
                  <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettings({ ...settings, fontSize: Math.max(14, settings.fontSize - 1) })}
                    disabled={settings.fontSize <= 14}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${((settings.fontSize - 14) / 10) * 100}%` }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettings({ ...settings, fontSize: Math.min(24, settings.fontSize + 1) })}
                    disabled={settings.fontSize >= 24}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Line height */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Espaçamento</span>
                  <span className="text-xs text-muted-foreground">{settings.lineHeight.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettings({ ...settings, lineHeight: Math.max(1.4, settings.lineHeight - 0.1) })}
                    disabled={settings.lineHeight <= 1.4}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${((settings.lineHeight - 1.4) / 0.8) * 100}%` }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettings({ ...settings, lineHeight: Math.min(2.2, settings.lineHeight + 0.1) })}
                    disabled={settings.lineHeight >= 2.2}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Font family */}
              <div>
                <span className="text-sm font-medium mb-2 block">Família da fonte</span>
                <div className="grid grid-cols-3 gap-1">
                  {(["serif", "sans", "mono"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={settings.fontFamily === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSettings({ ...settings, fontFamily: f })}
                      className="capitalize"
                    >
                      {f === "serif" ? "Serif" : f === "sans" ? "Sans" : "Mono"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Width */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Largura do texto</span>
                  <span className="text-xs text-muted-foreground">{settings.maxWidth}rem</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettings({ ...settings, maxWidth: Math.max(40, settings.maxWidth - 4) })}
                    disabled={settings.maxWidth <= 40}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${((settings.maxWidth - 40) / 50) * 100}%` }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSettings({ ...settings, maxWidth: Math.min(90, settings.maxWidth + 4) })}
                    disabled={settings.maxWidth >= 90}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setSettings(defaultSettings)}
              >
                Resetar
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
