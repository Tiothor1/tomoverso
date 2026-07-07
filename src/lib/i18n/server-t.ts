import type { LanguageCode, NestedDict } from "./types";
import { normalizeLocale } from "./types";
import ptBR from "./locales/pt-BR";
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import de from "./locales/de";
import it from "./locales/it";
import ja from "./locales/ja";
import ko from "./locales/ko";
import zh from "./locales/zh";

const dictionaries: Record<LanguageCode, NestedDict> = {
  "pt-BR": ptBR,
  en,
  es,
  fr,
  de,
  it,
  ja,
  ko,
  zh,
};

function resolveKey(dict: NestedDict, path: string): string {
  const parts = path.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}|{(\w+)}/g, (match, p1, p2) => {
    const key = p1 || p2;
    return key in vars ? String(vars[key]) : match;
  });
}

export function getDictionary(locale: LanguageCode): NestedDict {
  return dictionaries[locale] || dictionaries["pt-BR"];
}

export function createTranslator(locale: LanguageCode) {
  const dict = getDictionary(locale);
  const fallback = dictionaries["pt-BR"];
  return (path: string, vars?: Record<string, string | number>): string => {
    const val = resolveKey(dict, path);
    const resolved = val === path && locale !== "pt-BR" ? resolveKey(fallback, path) : val;
    return interpolate(resolved, vars);
  };
}

/** Accepts either a full Cookie header (`novel_lang=en; ...`) OR the raw cookie value (`en`). */
export function getLocaleFromCookies(cookieHeaderOrValue: string | null | undefined): LanguageCode {
  if (!cookieHeaderOrValue) return "pt-BR";
  const raw = String(cookieHeaderOrValue);
  const match = raw.match(/(?:^|;\s*)novel_lang=([^;]+)/);
  const value = match ? match[1] : raw;
  return normalizeLocale(decodeURIComponent(value));
}
