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
const MAX_TEXT_LENGTH = 900;
const BATCH_SIZE = 180;

const htmlLang: Record<LanguageCode, string> = {
  pt: "pt-BR", en: "en", es: "es", fr: "fr", de: "de", it: "it", ja: "ja", ko: "ko", "zh-CN": "zh-CN",
};

const validLanguages: LanguageCode[] = ["pt", "en", "es", "fr", "de", "it", "ja", "ko", "zh-CN"];
const ignoredTags = new Set(["SCRIPT","STYLE","NOSCRIPT","SVG","CANVAS","CODE","PRE","KBD","SAMP","INPUT","TEXTAREA","SELECT","OPTION","IFRAME"]);
const attributeNames = ["placeholder", "aria-label", "title", "alt"] as const;

const fallbackDictionary: Record<Exclude<LanguageCode, "pt">, Record<string, string>> = {
  en: { "Entrar":"Sign in","Buscar":"Search","Mais":"More","Mais opções":"More options","Idioma":"Language","Tema":"Theme","Cor do site":"Site color","Light Novels":"Light Novels","Mangás":"Manga","Livros":"Books","Loja":"Store","Estante":"Library","Como criar":"How to create","Painel":"Dashboard","Português BR":"Brazilian Portuguese","Tudo":"All","Capítulos":"Chapters","Autores":"Authors","Gêneros":"Genres","Recentes":"Recent","Populares":"Popular","Explorar":"Explore","Ver todas":"View all","Ver todos":"View all","Ver originais":"View originals","Feed":"Feed","Loja editorial":"Store","Publique sua história":"Publish your story","Criar conta":"Sign up","Como funciona":"How it works","Buscar no Google":"Search like Google","Navegação principal":"Main navigation","Resultados":"Results","Nenhum resultado encontrado":"No results found","Sugestões":"Suggestions","Gêneros populares":"Popular genres","Filtros":"Filters","Leitura":"Reading","Originais BR":"Brazilian Originals","Publicado aqui":"Published here","Concurso":"Contest","Concursos":"Contests","Abrir menu Mais":"Open More menu","Fechar menu":"Close menu","Tema escuro":"Dark theme","Tema claro":"Light theme","Sistema":"System","Escuro":"Dark","Claro":"Light","Roxo":"Purple","Azul":"Blue","Rosa":"Pink","Ciano":"Cyan","Verde":"Green","Vermelho":"Red","Dourado":"Gold","Sair":"Sign out","Minha estante":"My library","Configurações":"Settings","Admin":"Admin","Notificações":"Notifications","Perfil":"Profile" },
  es: { "Entrar":"Entrar","Buscar":"Buscar","Mais":"Más","Idioma":"Idioma","Tema":"Tema","Mangás":"Mangas","Livros":"Libros","Loja":"Tienda","Estante":"Biblioteca","Como crear":"Cómo crear","Painel":"Panel","Português BR":"Portugués BR","Tudo":"Todo","Capítulos":"Capítulos","Autores":"Autores","Gêneros":"Géneros","Recentes":"Recientes","Populares":"Populares","Explorar":"Explorar","Feed":"Feed","Concursos":"Concursos","Originais BR":"Originales BR","Loja editorial":"Tienda editorial","Publique su historia":"Publica tu historia","Criar conta":"Crear cuenta","Como funciona":"Cómo funciona","Resultados":"Resultados","Sugestões":"Sugerencias" },
  fr: { "Entrar":"Connexion","Buscar":"Rechercher","Mais":"Plus","Idioma":"Langue","Tema":"Thème","Mangás":"Mangas","Livros":"Livres","Loja":"Boutique","Concursos":"Concours","Originais BR":"Originaux BR","Explorar":"Explorer","Feed":"Fil d'actu","Loja editorial":"Boutique éditoriale" },
  de: { "Entrar":"Anmelden","Buscar":"Suchen","Mais":"Mehr","Idioma":"Sprache","Tema":"Design","Mangás":"Manga","Livros":"Bücher","Loja":"Shop","Concursos":"Wettbewerbe","Originais BR":"Brasilianische Originale","Explorar":"Erkunden","Feed":"Feed","Loja editorial":"Redaktionsshop" },
  it: { "Entrar":"Accedi","Buscar":"Cerca","Mais":"Altro","Idioma":"Lingua","Tema":"Tema","Mangás":"Manga","Livros":"Libri","Loja":"Negozio","Concursos":"Concorsi","Originais BR":"Originali BR","Explorar":"Esplora" },
  ja: { "Entrar":"ログイン","Buscar":"検索","Mais":"その他","Idioma":"言語","Tema":"テーマ","Mangás":"マンガ","Livros":"本","Loja":"ストア","Concursos":"コンテスト","Originais BR":"ブラジル作品","Explorar":"探索" },
  ko: { "Entrar":"로그인","Buscar":"검색","Mais":"더보기","Idioma":"언어","Tema":"테마","Mangás":"만화","Livros":"책","Loja":"스토어","Concursos":"대회","Originais BR":"브라질 오리지널","Explorar":"탐색" },
  "zh-CN": { "Entrar":"登录","Buscar":"搜索","Mais":"更多","Idioma":"语言","Tema":"主题","Mangás":"漫画","Livros":"图书","Loja":"商店","Concursos":"比赛","Originais BR":"巴西原创","Explorar":"探索" },
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
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || getCookie(LANGUAGE_COOKIE));
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
  if (trimmed === "Tomo Verso Editora") return false;
  if (trimmed.length < 2 || trimmed.length > MAX_TEXT_LENGTH) return false;
  if (!/[\p{L}]/u.test(trimmed)) return false;
  if (/^[\d\s\p{P}\p{S}]+$/u.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  if (/^[A-Z0-9_\-/.:]+$/.test(trimmed) && trimmed.length < 18) return false;
  return true;
}

function textKey(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function protectBrand(text: string): string {
  return text
    .replace(/\bTomoverse\b/gi, "Tomo Verso Editora")
    .replace(/\bTomoversum\b/gi, "Tomo Verso Editora");
}

function loadCache(language: LanguageCode): Record<string, string> {
  if (language === "pt" || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + language);
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch { return {}; }
}

function saveCache(language: LanguageCode, cache: Record<string, string>) {
  if (language === "pt" || typeof window === "undefined") return;
  try {
    const entries = Object.entries(cache).slice(-3000);
    window.localStorage.setItem(CACHE_PREFIX + language, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

async function fetchBatch(language: LanguageCode, texts: string[], signal?: AbortSignal): Promise<Record<string, string>> {
  if (language === "pt" || texts.length === 0) return {};
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: language, texts }),
    signal,
  });
  if (!response.ok) return {};
  const json = await response.json();
  return json?.translations && typeof json.translations === "object" ? json.translations : {};
}

function applyToDom(
  textNodes: Text[],
  attrElements: Element[],
  textOriginals: WeakMap<Text, string>,
  attrOriginals: WeakMap<Element, Partial<Record<(typeof attributeNames)[number], string>>>,
  cache: Record<string, string>,
  dict: Record<string, string>
) {
  textNodes.forEach((node) => {
    const original = textOriginals.get(node) || node.nodeValue || "";
    const key = textKey(original);
    const translated = protectBrand(cache[key] || dict[key] || key);
    if (translated && translated !== key) {
      const leading = original.match(/^\s*/)?.[0] || "";
      const trailing = original.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${translated}${trailing}`;
    }
  });

  attrElements.forEach((element) => {
    const attrMap = attrOriginals.get(element);
    if (!attrMap) return;
    for (const attr of attributeNames) {
      const original = attrMap[attr];
      if (!original) continue;
      const key = textKey(original);
      const translated = protectBrand(cache[key] || dict[key] || key);
      if (translated && translated !== key) element.setAttribute(attr, translated);
    }
  });
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
    document.querySelectorAll("body *").forEach((el) => {
      const map = attributeOriginals.current.get(el);
      if (!map) return;
      for (const attr of attributeNames) {
        const orig = map[attr];
        if (orig != null) el.setAttribute(attr, orig);
      }
    });
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (shouldSkipElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => {
      const orig = textOriginals.current.get(node);
      if (orig != null && node.nodeValue !== orig) node.nodeValue = orig;
    });
    applyingRef.current = false;
  }, []);

  const fastTranslatePage = useCallback(async (next: LanguageCode, signal?: AbortSignal) => {
    if (typeof document === "undefined" || !document.body) return;

    if (next === "pt") {
      restorePortuguese();
      applyHtmlLanguage("pt", "ready");
      setIsTranslating(false);
      return;
    }

    const currentLocale = document.documentElement.getAttribute("data-locale");
    if (currentLocale && currentLocale !== "pt" && currentLocale !== next) restorePortuguese();

    setIsTranslating(true);
    applyHtmlLanguage(next, "translating");

    const dictFallback = fallbackDictionary[next as Exclude<LanguageCode, "pt">] || {};
    const effectiveCache = { ...cacheRef.current };

    // Coletar nós de texto e atributos
    const textNodes: Text[] = [];
    const textKeys = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (shouldSkipElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
        if (!shouldTranslateText(node.nodeValue || "")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!textOriginals.current.has(node)) textOriginals.current.set(node, node.nodeValue || "");
      const orig = textOriginals.current.get(node) || node.nodeValue || "";
      const key = textKey(orig);
      if (!shouldTranslateText(key)) continue;
      textNodes.push(node);
      textKeys.add(key);
    }

    const attrElements: Element[] = [];
    const attrKeys = new Set<string>();
    document.querySelectorAll("body *").forEach((el) => {
      if (shouldSkipElement(el)) return;
      let attrMap = attributeOriginals.current.get(el) || {};
      let hasAny = false;
      for (const attr of attributeNames) {
        const value = el.getAttribute(attr);
        if (!value || !shouldTranslateText(value)) continue;
        if (attrMap[attr] == null) attrMap = { ...attrMap, [attr]: value };
        const key = textKey(attrMap[attr] || value);
        if (!shouldTranslateText(key)) continue;
        attrKeys.add(key);
        hasAny = true;
      }
      if (hasAny) { attributeOriginals.current.set(el, attrMap); attrElements.push(el); }
    });

    const allKeys = Array.from(new Set([...textKeys, ...attrKeys]));

    // 1. APLICAR FALLBACK + CACHE IMEDIATAMENTE (sem esperar API)
    applyToDom(textNodes, attrElements, textOriginals.current, attributeOriginals.current, effectiveCache, dictFallback);
    applyHtmlLanguage(next, "ready");

    // 2. Buscar textos não encontrados no cache nem no dicionário
    const missing = allKeys.filter((k) => !effectiveCache[k] && !dictFallback[k]);
    if (missing.length > 0 && !signal?.aborted) {
      const batches: string[][] = [];
      for (let i = 0; i < missing.length; i += BATCH_SIZE) batches.push(missing.slice(i, i + BATCH_SIZE));

      // PARALELO: todas as batches simultâneas
      try {
        const results = await Promise.all(batches.map((batch) => fetchBatch(next, batch, signal)));
        // Merge results into cache
        for (const result of results) {
          Object.assign(effectiveCache, result);
        }
        Object.assign(cacheRef.current, effectiveCache);
        saveCache(next, cacheRef.current);

        // Re-aplicar agora com as traduções da API
        if (!signal?.aborted) {
          applyToDom(textNodes, attrElements, textOriginals.current, attributeOriginals.current, effectiveCache, dictFallback);
        }
      } catch {
        // Fallback já foi aplicado, deixa como está
      }
    }

    applyingRef.current = false;
    setIsTranslating(false);
  }, [applyHtmlLanguage, restorePortuguese]);

  const scheduleTranslation = useCallback((delay = 10) => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      void fastTranslatePage(language, controller.signal);
    }, delay);
  }, [language, fastTranslatePage]);

  // Disparar na mudança de idioma
  useEffect(() => {
    persistLanguage(language);
    cacheRef.current = loadCache(language);
    applyHtmlLanguage(language, language === "pt" ? "ready" : "translating");
    scheduleTranslation(10); // ← delay reduzido de 80ms pra 10ms
  }, [language, persistLanguage, applyHtmlLanguage, scheduleTranslation]);

  // Disparar na navegação
  useEffect(() => {
    scheduleTranslation(50); // ← delay reduzido de 260ms pra 50ms
  }, [pathname, scheduleTranslation]);

  // MutationObserver para conteúdo dinâmico
  useEffect(() => {
    if (typeof MutationObserver === "undefined" || !document.body) return;
    observerRef.current?.disconnect();
    let timeout: number | null = null;
    observerRef.current = new MutationObserver(() => {
      if (applyingRef.current || language === "pt") return;
      if (timeout != null) window.clearTimeout(timeout);
      timeout = window.setTimeout(() => scheduleTranslation(150), 150); // ← de 420ms pra 150ms
    });
    observerRef.current.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...attributeNames] });
    return () => { observerRef.current?.disconnect(); if (timeout != null) window.clearTimeout(timeout); };
  }, [language, scheduleTranslation]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); if (debounceRef.current != null) window.clearTimeout(debounceRef.current); observerRef.current?.disconnect(); };
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
