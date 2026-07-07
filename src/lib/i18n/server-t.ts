import type { LanguageCode, NestedDict } from "./types";
import { normalizeLocale, LOCALE_NAMES } from "./types";

const localeCache = new Map<string, NestedDict>();

function loadLocaleSync(code: LanguageCode): NestedDict {
  if (localeCache.has(code)) return localeCache.get(code)!;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(`./locales/${code}`);
    const dict = mod.default || mod;
    localeCache.set(code, dict);
    return dict;
  } catch {
    const fallback = require("./locales/pt-BR");
    const dict = fallback.default || fallback;
    localeCache.set(code, dict);
    return dict;
  }
}

function resolveKey(dict: NestedDict, path: string): string {
  const parts = path.split(".");
  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}|{(\w+)}/g, (_, p1, p2) => {
    const key = p1 || p2;
    return key in vars ? String(vars[key]) : _;
  });
}

export function createTranslator(locale: LanguageCode) {
  const dict = loadLocaleSync(locale);
  return (path: string, vars?: Record<string, string | number>): string => {
    const val = resolveKey(dict, path);
    return interpolate(val, vars);
  };
}

export function getLocaleFromCookies(cookieHeader: string | null): LanguageCode {
  if (!cookieHeader) return "pt-BR";
  const match = cookieHeader.match(/novel_lang=([^;]+)/);
  if (match) {
    const decoded = decodeURIComponent(match[1]);
    return normalizeLocale(decoded);
  }
  return "pt-BR";
}
