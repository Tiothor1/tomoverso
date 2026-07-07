import type { NestedDict, LanguageCode } from "./types";

/** Load a locale module dynamically */
const localeCache = new Map<string, NestedDict>();

export async function loadLocale(code: LanguageCode): Promise<NestedDict> {
  if (localeCache.has(code)) return localeCache.get(code)!;
  try {
    const mod = await import(`./locales/${code}`);
    const dict = mod.default || mod;
    localeCache.set(code, dict);
    return dict;
  } catch {
    const fallback = await import("./locales/pt-BR");
    localeCache.set(code, fallback.default || fallback);
    return localeCache.get(code)!;
  }
}

/** Preload pt-BR immediately */
let preloadedDict: NestedDict | null = null;
import("./locales/pt-BR").then(m => { preloadedDict = m.default || m; localeCache.set("pt-BR", preloadedDict!); });

export function getPreloaded(): NestedDict | null {
  return preloadedDict;
}

/** Resolve a dot-path like "home.hero.title" inside a dict */
export function resolveKey(dict: NestedDict, path: string): string {
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

/** Simple {{placeholder}} replacement */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}|{(\w+)}/g, (_, p1, p2) => {
    const key = p1 || p2;
    return key in vars ? String(vars[key]) : _;
  });
}
