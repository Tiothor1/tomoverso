"use client";

import { useTheme } from "@/components/theme/theme-provider";
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

const colors = [
  { id: "purple" as const, name: "Roxo", preview: "oklch(0.55 0.2 295)" },
  { id: "blue" as const, name: "Azul", preview: "oklch(0.55 0.2 240)" },
  { id: "sepia" as const, name: "Sépia", preview: "oklch(0.55 0.1 50)" },
];

export function ColorThemePicker() {
  const { colorTheme, setColorTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mudar cor">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Cor do tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {colors.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => setColorTheme(c.id)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span
              className="h-5 w-5 rounded-full border-2 border-border"
              style={{ background: c.preview }}
            />
            <span className="flex-1">{c.name}</span>
            {colorTheme === c.id && (
              <span className="text-primary text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
