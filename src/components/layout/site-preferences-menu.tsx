"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Crown,
  Languages,
  Library,
  Monitor,
  MoreHorizontal,
  Moon,
  Palette,
  PenLine,
  Sun,
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
import { cn } from "@/lib/utils";

type Lang = "pt" | "en" | "es";

type NavbarMoreMenuProps = {
  showStore: boolean;
  storeHref: string;
  subBadge?: string | null;
};

const themeOptions: Array<{ id: ThemePreference; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "light", label: "Claro", icon: Sun },
  { id: "system", label: "Sistema", icon: Monitor },
];

const colorOptions: Array<{ id: ColorTheme; label: string; className: string }> = [
  { id: "purple", label: "Roxo", className: "bg-violet-500" },
  { id: "blue", label: "Azul", className: "bg-blue-500" },
  { id: "rose", label: "Rosa", className: "bg-pink-500" },
  { id: "cyan", label: "Ciano", className: "bg-cyan-400" },
  { id: "emerald", label: "Verde", className: "bg-emerald-500" },
  { id: "red", label: "Vermelho", className: "bg-red-500" },
  { id: "amber", label: "Dourado", className: "bg-amber-400" },
];

const languageOptions: Array<{ id: Lang; label: string; short: string; flag: string }> = [
  { id: "pt", label: "Português BR", short: "PT", flag: "🇧🇷" },
  { id: "en", label: "English", short: "EN", flag: "🇺🇸" },
  { id: "es", label: "Español", short: "ES", flag: "🇪🇸" },
];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  return document.cookie.split("; ").find((r) => r.startsWith(name + "="))?.split("=")[1] || null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=31536000;SameSite=Lax`;
}

function normalizeLang(value: string | null | undefined): Lang {
  if (value === "en" || value === "es" || value === "pt") return value;
  if (value === "jp") return "pt";
  return "pt";
}

function useLanguagePreference() {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    const stored = getCookie("novel_lang") || window.localStorage.getItem("tomoverso-locale");
    setLangState(normalizeLang(stored));
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      setCookie("novel_lang", next);
      window.localStorage.setItem("tomoverso-locale", next);
      window.dispatchEvent(new Event("novel-lang-change"));
    } catch {}
  }

  return { lang, setLang };
}

export function NavbarMoreMenu({ showStore, storeHref, subBadge }: NavbarMoreMenuProps) {
  const { theme, resolvedTheme, colorTheme, setTheme, setColorTheme } = useTheme();
  const { lang, setLang } = useLanguagePreference();

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
      <DropdownMenuContent align="end" className="w-72 p-2">
        <DropdownMenuLabel>Mais opções</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/library" className="cursor-pointer gap-2">
            <Library className="h-4 w-4" />
            Estante
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/how-to" className="cursor-pointer gap-2">
            <PenLine className="h-4 w-4" />
            Como criar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/store/plans" className="cursor-pointer gap-2">
            <Crown className="h-4 w-4 text-amber-400" />
            {subBadge ? `Pro · ${subBadge}` : "Pro"}
          </Link>
        </DropdownMenuItem>
        {showStore ? (
          <DropdownMenuItem asChild>
            <Link href={storeHref} className="cursor-pointer gap-2">
              <BookOpen className="h-4 w-4" />
              Loja
            </Link>
          </DropdownMenuItem>
        ) : null}

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
        </DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1 px-1 pb-1">
          {colorOptions.map((option) => {
            const active = colorTheme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setColorTheme(option.id)}
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-lg border px-2 text-xs font-semibold transition-colors",
                  active ? "border-primary/55 bg-primary/12 text-primary" : "border-border/60 bg-muted/30 hover:bg-muted"
                )}
              >
                <span className={cn("h-3.5 w-3.5 rounded-full ring-1 ring-black/10", option.className)} />
                {option.label}
                {active ? <Check className="ml-auto h-3.5 w-3.5" /> : null}
              </button>
            );
          })}
        </div>

        <DropdownMenuLabel className="flex items-center gap-2 pt-2">
          <Languages className="h-3.5 w-3.5" />
          Idioma
        </DropdownMenuLabel>
        <div className="grid gap-1 px-1 pb-1">
          {languageOptions.map((option) => {
            const active = lang === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setLang(option.id)}
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-lg border px-2 text-xs font-semibold transition-colors",
                  active ? "border-primary/55 bg-primary/12 text-primary" : "border-border/60 bg-muted/30 hover:bg-muted"
                )}
              >
                <span>{option.flag}</span>
                <span>{option.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{option.short}</span>
              </button>
            );
          })}
          <p className="px-1 pt-1 text-[11px] leading-snug text-muted-foreground">
            Preferência salva. Tradução completa da interface está em preparação.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobilePreferencesPanel() {
  const { theme, resolvedTheme, colorTheme, setTheme, setColorTheme } = useTheme();
  const { lang, setLang } = useLanguagePreference();

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
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setColorTheme(option.id)}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl border",
                    active ? "border-primary/70 bg-primary/10" : "border-border bg-background/50"
                  )}
                  aria-label={`Usar cor ${option.label}`}
                >
                  <span className={cn("h-5 w-5 rounded-full", option.className)} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Idioma</p>
          <div className="grid grid-cols-3 gap-1.5">
            {languageOptions.map((option) => {
              const active = lang === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLang(option.id)}
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
            Tradução completa da interface está em preparação.
          </p>
        </div>
      </div>
    </section>
  );
}
