"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColorTheme, useTheme } from "@/components/theme/theme-provider";

const colors: Array<{ id: ColorTheme; name: string; preview: string }> = [
  { id: "purple", name: "Roxo", preview: "oklch(0.58 0.2 295)" },
  { id: "blue", name: "Azul", preview: "oklch(0.58 0.18 240)" },
  { id: "rose", name: "Rosa", preview: "oklch(0.62 0.2 340)" },
  { id: "cyan", name: "Ciano", preview: "oklch(0.7 0.15 205)" },
  { id: "emerald", name: "Verde", preview: "oklch(0.65 0.16 155)" },
  { id: "red", name: "Vermelho", preview: "oklch(0.6 0.2 25)" },
  { id: "amber", name: "Dourado", preview: "oklch(0.72 0.16 78)" },
];

export function ColorThemePicker() {
  const { colorTheme, setColorTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 rounded-full" aria-label="Mudar cor do site">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Cor</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Cor do site</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {colors.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => setColorTheme(c.id)} className="cursor-pointer gap-3">
            <span className="h-5 w-5 shrink-0 rounded-full border border-border" style={{ background: c.preview }} />
            <span className="flex-1">{c.name}</span>
            {colorTheme === c.id ? <span className="text-primary">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
