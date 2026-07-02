"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type LanguageCode = "pt" | "en" | "es" | "fr" | "de" | "it" | "ja" | "ko" | "zh-CN";

type LanguageProviderState = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  isTranslating: boolean;
};

type LanguageProviderProps = {
  children: React.ReactNode;
};

const LANGUAGE_STORAGE_KEY = "tomoverso-locale";
const LANGUAGE_COOKIE = "novel_lang";
const CACHE_PREFIX = "tomoverso-translation-cache-v2:";
const SOURCE_LANG = "pt";
const MAX_CACHE_ITEMS = 1400;
const MAX_TEXT_LENGTH = 900;
const BATCH_SIZE = 140;

const htmlLang: Record<LanguageCode, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  ja: "ja",
  ko: "ko",
  "zh-CN": "zh-CN",
};

const validLanguages: LanguageCode[] = ["pt", "en", "es", "fr", "de", "it", "ja", "ko", "zh-CN"];
const ignoredTags = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
  "CANVAS",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
  "IFRAME",
]);
const attributeNames = ["placeholder", "aria-label", "title", "alt"] as const;

const fallbackDictionary: Record<Exclude<LanguageCode, "pt">, Record<string, string>> = {
  en: {
    "Entrar": "Sign in",
    "Buscar": "Search",
    "Mais": "More",
    "Mais opções": "More options",
    "Idioma": "Language",
    "Tema": "Theme",
    "Cor do site": "Site color",
    "Light Novels": "Light Novels",
    "Mangás": "Manga",
    "Livros": "Books",
    "Loja": "Store",
    "Estante": "Library",
    "Como criar": "How to create",
    "Painel": "Dashboard",
    "Português BR": "Brazilian Portuguese",
    "Tudo": "All",
    "Capítulos": "Chapters",
    "Autores": "Authors",
    "Gêneros": "Genres",
    "Recentes": "Recent",
    "Populares": "Popular",
  },
  es: {
    "Entrar": "Entrar",
    "Buscar": "Buscar",
    "Mais": "Más",
    "Mais opções": "Más opciones",
    "Idioma": "Idioma",
    "Tema": "Tema",
    "Cor do site": "Color del sitio",
    "Mangás": "Mangas",
    "Livros": "Libros",
    "Loja": "Tienda",
    "Estante": "Biblioteca",
    "Como criar": "Cómo crear",
    "Painel": "Panel",
    "Português BR": "Portugués BR",
    "Tudo": "Todo",
    "Capítulos": "Capítulos",
    "Autores": "Autores",
    "Gêneros": "Géneros",
    "Recentes": "Recientes",
    "Populares": "Populares",
  },
  fr: { "Entrar": "Connexion", "Buscar": "Rechercher", "Mais": "Plus", "Idioma": "Langue", "Tema": "Thème", "Mangás": "Mangas", "Livros": "Livres", "Loja": "Boutique" },
  de: { "Entrar": "Anmelden", "Buscar": "Suchen", "Mais": "Mehr", "Idioma": "Sprache", "Tema": "Design", "Mangás": "Manga", "Livros": "Bücher", "Loja": "Shop" },
  it: { "Entrar": "Accedi", "Buscar": "Cerca", "Mais": "Altro", "Idioma": "Lingua", "Tema": "Tema", "Mangás": "Manga", "Livros": "Libri", "Loja": "Negozio" },
  ja: { "Entrar": "ログイン", "Buscar": "検索", "Mais": "その他", "Idioma": "言語", "Tema": "テーマ", "Mangás": "マンガ", "Livros": "本", "Loja": "ストア" },
  ko: { "Entrar": "로그인", "Buscar": "검색", "Mais": "더보기", "Idioma": "언어", "Tema": "테마", "Mangás": "만화", "Livros": "책", "Loja": "스토어" },
  "zh-CN": { "Entrar": "登录", "Buscar": "搜索", "Mais": "更多", "Idioma": "语言", "Tema": "主题", "Mangás": "漫画", "Livros": "图书", "Loja": "商店" },
};

const LanguageContext = createContext<LanguageProviderState | undefined>(undefined);

function normalizeLanguage(value: unknown): LanguageCode {
  return validLanguages.includes(value as LanguageCode) ? (value as LanguageCode) : "pt";
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  return document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1] || null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

function readInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") return "pt";
  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || decodeURIComponent(getCookie(LANGUAGE_COOKIE) || ""));
  } catch {
    return "pt";
  }
}

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;
  if (ignoredTags.has(element.tagName)) return true;
  if (element.closest("[data-no-translate], .notranslate, [translate='no'], script, style, noscript, svg, canvas, code, pre, kbd, samp, input, textarea, select, option, iframe")) return true;
  return false;
}

function shouldTranslateText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "Tomoverso") return false;
  if (trimmed.length < 2 || trimmed.length > MAX_TEXT_LENGTH) return false;
  if (!/[\p{L}]/u.test(trimmed)) return false;
  if (/^[\d\s\p{P}\p{S}]+$/u.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  if (/^[A-Z0-9_\-/.:]+$/.test(trimmed) && trimmed.length < 18) return false;
  return true;
}

function preserveWhitespace(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

function textKey(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function protectBrand(text: string): string {
  return text
    .replace(/\bTomoverse\b/gi, "Tomoverso")
    .replace(/\bTomoversum\b/gi, "Tomoverso");
}

function loadCache(language: LanguageCode): Record<string, string> {
  if (language === "pt" || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + language);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveCache(language: LanguageCode, cache: Record<string, string>) {
  if (language === "pt" || typeof window === "undefined") return;
  try {
    const entries = Object.entries(cache).slice(-MAX_CACHE_ITEMS);
    window.localStorage.setItem(CACHE_PREFIX + language, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

async function fetchTranslations(language: LanguageCode, texts: string[], signal?: AbortSignal): Promise<Record<string, string>> {
  if (language === "pt" || texts.length === 0) return {};

  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: language, texts }),
    signal,
  });

  if (!response.ok) throw new Error(`translate_http_${response.status}`);
  const json = await response.json();
  return json?.translations && typeof json.translations === "object" ? json.translations : {};
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState<LanguageCode>(() => readInitialLanguage());
  const [isTranslating, setIsTranslating] = useState(false);
  const textOriginals = useRef<WeakMap<Text, string>>(new WeakMap());
  const attributeOriginals = useRef<WeakMap<Element, Partial<Record<(typeof attributeNames)[number], string>>>>(new WeakMap());
  const cacheRef = useRef<Record<string, string>>({});
  const observerRef = useRef<MutationObserver | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const applyingRef = useRef(false);

  const persistLanguage = useCallback((next: LanguageCode) => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      setCookie(LANGUAGE_COOKIE, next);
      window.dispatchEvent(new CustomEvent("novel-lang-change", { detail: { language: next } }));
    } catch {}
  }, []);

  const applyHtmlLanguage = useCallback((next: LanguageCode, status: "ready" | "translating" | "error" = "ready") => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = htmlLang[next] || "pt-BR";
    document.documentElement.setAttribute("data-locale", next);
    document.documentElement.setAttribute("data-translation-status", status);
  }, []);

  const restorePortuguese = useCallback(() => {
    applyingRef.current = true;
    document.querySelectorAll("body *").forEach((element) => {
      const attrMap = attributeOriginals.current.get(element);
      if (!attrMap) return;
      for (const attr of attributeNames) {
        const original = attrMap[attr];
        if (original != null) element.setAttribute(attr, original);
      }
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => {
      const original = textOriginals.current.get(node);
      if (original != null && node.nodeValue !== original) node.nodeValue = original;
    });
    applyingRef.current = false;
  }, []);

  const collectTextNodes = useCallback(() => {
    const nodes: Text[] = [];
    const texts = new Set<string>();

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
        if (!shouldTranslateText(node.nodeValue || "")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!textOriginals.current.has(node)) textOriginals.current.set(node, node.nodeValue || "");
      const original = textOriginals.current.get(node) || node.nodeValue || "";
      const key = textKey(original);
      if (!shouldTranslateText(key)) continue;
      nodes.push(node);
      texts.add(key);
    }

    return { nodes, texts };
  }, []);

  const collectAttributes = useCallback(() => {
    const elements: Element[] = [];
    const texts = new Set<string>();

    document.querySelectorAll("body *").forEach((element) => {
      if (shouldSkipElement(element)) return;
      let hasAny = false;
      let attrMap = attributeOriginals.current.get(element) || {};

      for (const attr of attributeNames) {
        const value = element.getAttribute(attr);
        if (!value || !shouldTranslateText(value)) continue;
        if (attrMap[attr] == null) attrMap = { ...attrMap, [attr]: value };
        const original = attrMap[attr] || value;
        const key = textKey(original);
        if (!shouldTranslateText(key)) continue;
        texts.add(key);
        hasAny = true;
      }

      if (hasAny) {
        attributeOriginals.current.set(element, attrMap);
        elements.push(element);
      }
    });

    return { elements, texts };
  }, []);

  const translatePage = useCallback(async (next: LanguageCode, signal?: AbortSignal) => {
    if (typeof document === "undefined" || !document.body) return;

    if (next === "pt") {
      restorePortuguese();
      applyHtmlLanguage(next, "ready");
      setIsTranslating(false);
      return;
    }

    const currentLocale = document.documentElement.getAttribute("data-locale");
    if (currentLocale && currentLocale !== "pt" && currentLocale !== next) {
      restorePortuguese();
    }

    setIsTranslating(true);
    applyHtmlLanguage(next, "translating");

    const dictFallback = fallbackDictionary[next as Exclude<LanguageCode, "pt">] || {};
    const textNodes = collectTextNodes();
    const attrs = collectAttributes();
    const allTexts = Array.from(new Set([...textNodes.texts, ...attrs.texts]));
    const missing = allTexts.filter((text) => !cacheRef.current[text]);

    try {
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        if (signal?.aborted) return;
        const batch = missing.slice(i, i + BATCH_SIZE);
        const translated = await fetchTranslations(next, batch, signal);
        cacheRef.current = { ...cacheRef.current, ...translated };
      }
      saveCache(next, cacheRef.current);
    } catch {
      // Se a API externa falhar, ainda aplicamos o dicionário local nos textos principais.
    }

    if (signal?.aborted) return;

    applyingRef.current = true;
    textNodes.nodes.forEach((node) => {
      const original = textOriginals.current.get(node) || node.nodeValue || "";
      const key = textKey(original);
      const translated = protectBrand(cacheRef.current[key] || dictFallback[key] || key);
      if (translated && translated !== key) node.nodeValue = preserveWhitespace(original, translated);
    });

    attrs.elements.forEach((element) => {
      const attrMap = attributeOriginals.current.get(element);
      if (!attrMap) return;
      for (const attr of attributeNames) {
        const original = attrMap[attr];
        if (!original) continue;
        const key = textKey(original);
        const translated = protectBrand(cacheRef.current[key] || dictFallback[key] || key);
        if (translated && translated !== key) element.setAttribute(attr, translated);
      }
    });

    applyingRef.current = false;
    applyHtmlLanguage(next, "ready");
    setIsTranslating(false);
  }, [applyHtmlLanguage, collectAttributes, collectTextNodes, restorePortuguese]);

  const scheduleTranslation = useCallback((delay = 180) => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      void translatePage(language, controller.signal);
    }, delay);
  }, [language, translatePage]);

  useEffect(() => {
    persistLanguage(language);
    cacheRef.current = loadCache(language);
    applyHtmlLanguage(language, language === "pt" ? "ready" : "translating");
    scheduleTranslation(80);
  }, [language, persistLanguage, applyHtmlLanguage, scheduleTranslation]);

  useEffect(() => {
    scheduleTranslation(260);
  }, [pathname, scheduleTranslation]);

  useEffect(() => {
    if (typeof MutationObserver === "undefined" || !document.body) return;
    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(() => {
      if (applyingRef.current || language === "pt") return;
      scheduleTranslation(420);
    });
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...attributeNames],
    });
    return () => observerRef.current?.disconnect();
  }, [language, scheduleTranslation]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      observerRef.current?.disconnect();
    };
  }, []);

  const value = useMemo<LanguageProviderState>(() => ({
    language,
    setLanguage: (next) => setLanguageState(normalizeLanguage(next)),
    isTranslating,
  }), [language, isTranslating]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
