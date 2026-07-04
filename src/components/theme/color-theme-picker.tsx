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

const colors: Array<{ id: ColorTheme; name: string; preview: string; pro?: boolean }> = [
  { id: "purple", name: "Padrão Tomo", preview: "oklch(0.58 0.2 295)" },
  { id: "blue", name: "Azul editorial", preview: "oklch(0.58 0.18 240)", pro: true },
  { id: "rose", name: "Rosa premium", preview: "oklch(0.62 0.2 340)", pro: true },
  { id: "amber", name: "Dourado pro", preview: "oklch(0.72 0.16 78)", pro: true },
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
            {c.pro ? <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">Pro</span> : null}
            {colorTheme === c.id ? <span className="text-primary">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
