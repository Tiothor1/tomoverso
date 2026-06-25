"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { Crown, Lock, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCookie } from "@/lib/client-cookies";
import { useEffect, useState } from "react";

const freeColors = [
  { id: "purple" as const, name: "Roxo", preview: "oklch(0.55 0.2 295)" },
  { id: "blue" as const, name: "Azul", preview: "oklch(0.55 0.2 240)" },
  { id: "sepia" as const, name: "Sépia", preview: "oklch(0.55 0.1 50)" },
];

const premiumColors = [
  { id: "emerald" as const, name: "Esmeralda", preview: "oklch(0.55 0.18 160)" },
  { id: "rose" as const, name: "Rose Gold", preview: "oklch(0.55 0.18 10)" },
  { id: "amber" as const, name: "Âmbar", preview: "oklch(0.65 0.18 80)" },
  { id: "ocean" as const, name: "Oceano", preview: "oklch(0.5 0.15 220)" },
];

export function ColorThemePicker() {
  const { colorTheme, setColorTheme } = useTheme();
  const [isSubscriber, setIsSubscriber] = useState(false);

  useEffect(() => {
    setIsSubscriber(!!getCookie("tomoverso-subscriber"));
  }, []);

  const allColors = isSubscriber ? [...freeColors, ...premiumColors] : freeColors;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mudar cor">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          Cor do tema
          {isSubscriber && <Crown className="h-3 w-3 text-amber-400" />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allColors.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => setColorTheme(c.id)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span
              className="h-5 w-5 rounded-full border-2 border-border shrink-0"
              style={{ background: c.preview }}
            />
            <span className="flex-1">{c.name}</span>
            {colorTheme === c.id && (
              <span className="text-primary text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        {!isSubscriber && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-center">
              <a
                href="/store/plans"
                className="flex items-center justify-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
              >
                <Lock className="h-3 w-3" />
                Assine Pro para +4 cores exclusivas
              </a>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
