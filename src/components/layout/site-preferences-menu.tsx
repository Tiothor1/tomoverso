"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  BookOpen,
  BookText,
  Check,
  Crown,
  Languages,
  Library,
  Monitor,
  MoreHorizontal,
  Moon,
  Palette,
  PenLine,
  Search,
  Sparkles,
  Sun,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColorTheme, ThemePreference, useTheme } from "@/components/theme/theme-provider";
import { LanguageCode, useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

type NavbarMoreMenuProps = {
  showStore: boolean;
  storeHref: string;
  publishHref: string;
  publishLabel: string;
  hasActiveSubscription: boolean;
  subBadge?: string | null;
};

const themeOptions: Array<{ id: ThemePreference; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "light", label: "Claro", icon: Sun },
  { id: "system", label: "Sistema", icon: Monitor },
];

const colorOptions: Array<{ id: ColorTheme; label: string; className: string; pro?: boolean }> = [
  { id: "sepia", label: "Sépia", className: "bg-amber-200" },
  { id: "blue", label: "Azul", className: "bg-blue-500" },
  { id: "purple", label: "Roxo", className: "bg-violet-500" },
  { id: "rose", label: "Rosa premium", className: "bg-pink-500", pro: true },
  { id: "amber", label: "Dourado pro", className: "bg-amber-400", pro: true },
];

const languageOptions: Array<{ id: LanguageCode; label: string; short: string; flag: string }> = [
  { id: "pt", label: "Português BR", short: "PT", flag: "🇧🇷" },
  { id: "en", label: "English", short: "EN", flag: "🇺🇸" },
  { id: "es", label: "Español", short: "ES", flag: "🇪🇸" },
  { id: "fr", label: "Français", short: "FR", flag: "🇫🇷" },
  { id: "de", label: "Deutsch", short: "DE", flag: "🇩🇪" },
  { id: "it", label: "Italiano", short: "IT", flag: "🇮🇹" },
  { id: "ja", label: "日本語", short: "JA", flag: "🇯🇵" },
  { id: "ko", label: "한국어", short: "KO", flag: "🇰🇷" },
  { id: "zh-CN", label: "中文", short: "ZH", flag: "🇨🇳" },
];

export function NavbarMoreMenu({ showStore, storeHref, publishHref, publishLabel, hasActiveSubscription, subBadge }: NavbarMoreMenuProps) {
  const { theme, resolvedTheme, colorTheme, setTheme, setColorTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="hidden rounded-full border border-border/60 px-3 text-sm font-semibold hover:border-primary/35 hover:bg-primary/8 lg:inline-flex"
          aria-label="Abrir menu Mais"
        >
          Mais
          <MoreHorizontal className="ml-1.5 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <DropdownMenuLabel>Mais no Tomo Verso</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/search" className="cursor-pointer gap-2">
            <Search className="h-4 w-4" />
            Buscar obras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/explore" className="cursor-pointer gap-2">
            <BookOpen className="h-4 w-4" />
            Light novels
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/manga" className="cursor-pointer gap-2">
            <BookText className="h-4 w-4" />
            Mangás e manhwas
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/livros" className="cursor-pointer gap-2">
            <BookText className="h-4 w-4" />
            Livros
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/library" className="cursor-pointer gap-2">
            <Library className="h-4 w-4" />
            Minha estante
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={publishHref} className="cursor-pointer gap-2">
            <PenLine className="h-4 w-4 text-primary" />
            {publishLabel || "Publicar história"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/how-to" className="cursor-pointer gap-2">
            <Sparkles className="h-4 w-4" />
            Como publicar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/store/plans" className="cursor-pointer gap-2">
            <Crown className="h-4 w-4 text-amber-400" />
            {subBadge ? `Pro · ${subBadge}` : "Planos Pro"}
          </Link>
        </DropdownMenuItem>
        {showStore ? (
          <DropdownMenuItem asChild>
            <Link href={storeHref} className="cursor-pointer gap-2">
              <BookOpen className="h-4 w-4" />
              Loja editorial
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/concurso" className="cursor-pointer gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Concursos
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2">
          <Moon className="h-3.5 w-3.5" />
          Tema
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
            {theme === "system" ? `Sistema · ${resolvedTheme === "dark" ? "escuro" : "claro"}` : theme === "dark" ? "Escuro" : "Claro"}
          </span>
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const active = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors",
                  active ? "border-primary/55 bg-primary/12 text-primary" : "border-border/60 bg-muted/30 hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>

        <DropdownMenuLabel className="flex items-center gap-2 pt-2">
          <Palette className="h-3.5 w-3.5" />
          Cor do site
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">3 grátis</span>
        </DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1 px-1 pb-1">
          {colorOptions.map((option) => {
            const active = colorTheme === option.id;
            const locked = Boolean(option.pro && !hasActiveSubscription);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => locked ? undefined : setColorTheme(option.id)}
                disabled={locked}
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-lg border px-2 text-xs font-semibold transition-colors",
                  locked ? "cursor-not-allowed border-border/40 bg-muted/15 text-muted-foreground opacity-70" : active ? "border-primary/55 bg-primary/12 text-primary" : "border-border/60 bg-muted/30 hover:bg-muted"
                )}
              >
                <span className={cn("h-3.5 w-3.5 rounded-full ring-1 ring-black/10", option.className)} />
                {option.label}
                {locked ? <Crown className="ml-auto h-3.5 w-3.5 text-amber-400" /> : null}
                {active ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
              </button>
            );
          })}
        </div>

        <DropdownMenuLabel className="flex items-center gap-2 pt-2">
          <Languages className="h-3.5 w-3.5" />
          Idioma
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
            {language.toUpperCase()}
          </span>
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1">
          {languageOptions.map((option) => {
            const active = language === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setLanguage(option.id)}
                className={cn(
                  "flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors",
                  active ? "border-primary/55 bg-primary/12 text-primary" : "border-border/60 bg-muted/30 hover:bg-muted"
                )}
              >
                <span>{option.flag}</span>
                <span>{option.short}</span>
              </button>
            );
          })}
          <p className="col-span-3 px-1 pt-1 text-[11px] leading-snug text-muted-foreground">
            Idiomas liberados grátis. A preferência fica salva neste navegador.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobilePreferencesPanel({ hasActiveSubscription }: { hasActiveSubscription: boolean }) {
  const { theme, resolvedTheme, colorTheme, setTheme, setColorTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  return (
    <section className="rounded-2xl border border-border/60 bg-muted/25 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">Aparência</h3>
          <p className="text-xs text-muted-foreground">
            {theme === "system" ? `Sistema · ${resolvedTheme === "dark" ? "escuro" : "claro"}` : theme === "dark" ? "Tema escuro" : "Tema claro"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Tema</p>
          <div className="grid grid-cols-3 gap-1.5">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const active = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1 rounded-xl border text-xs font-semibold",
                    active ? "border-primary/55 bg-primary/12 text-primary" : "border-border bg-background/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Cor</p>
          <div className="grid grid-cols-4 gap-1.5">
            {colorOptions.map((option) => {
              const active = colorTheme === option.id;
              const locked = Boolean(option.pro && !hasActiveSubscription);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => locked ? undefined : setColorTheme(option.id)}
                  disabled={locked}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl border",
                    locked ? "cursor-not-allowed border-border/40 bg-muted/20 opacity-60" : active ? "border-primary/70 bg-primary/10" : "border-border bg-background/50"
                  )}
                  aria-label={`Usar cor ${option.label}`}
                >
                  <span className={cn("h-5 w-5 rounded-full", option.className)} />
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            Sépia é a principal. Azul e roxo também são grátis; o resto é Autor+.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Idioma
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {languageOptions.map((option) => {
              const active = language === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLanguage(option.id)}
                  aria-label={`Usar idioma ${option.label}`}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1 rounded-xl border text-xs font-semibold",
                    active ? "border-primary/55 bg-primary/12 text-primary" : "border-border bg-background/50"
                  )}
                >
                  <span>{option.flag}</span>
                  {option.short}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            Idiomas grátis para todos. A tradução é aplicada automaticamente na página.
          </p>
        </div>
      </div>
    </section>
  );
}
