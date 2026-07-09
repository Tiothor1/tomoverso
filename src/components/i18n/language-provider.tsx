"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LanguageCode, NestedDict } from "@/lib/i18n/types";
import { LOCALE_HTML_MAP, normalizeLocale } from "@/lib/i18n/types";
import { loadLocale, resolveKey, interpolate, getPreloaded } from "@/lib/i18n/client";
import ptBR from "@/lib/i18n/locales/pt-BR";

const LANGUAGE_STORAGE_KEY = "tomoverso-locale";
const LANGUAGE_COOKIE = "novel_lang";
const DOM_CACHE_PREFIX = "tomoverso-dom-i18n";
const originalTextNodes = new Map<Text, string>();

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION", "CODE", "PRE", "SVG", "CANVAS"]);

type LanguageProviderState = {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dict: NestedDict | null;
};

const LanguageContext = createContext<LanguageProviderState | undefined>(undefined);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  return document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1] || null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

function readStoredLocale(): LanguageCode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || getCookie(LANGUAGE_COOKIE);
    return stored ? normalizeLocale(stored) : null;
  } catch {
    return null;
  }
}

function readInitial(): LanguageCode {
  // PT-BR é o idioma principal. Só sai dele quando o usuário/cookie já escolheu outro idioma.
  return readStoredLocale() || "pt-BR";
}

function persist(next: LanguageCode) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    setCookie(LANGUAGE_COOKIE, next);
  } catch {}
}

function applyHtml(next: LanguageCode) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = LOCALE_HTML_MAP[next] || "pt-BR";
  document.documentElement.setAttribute("data-locale", next);
  document.documentElement.setAttribute("data-translation-status", "ready");
}

interface UserLocalePref {
  userId?: string;
  locale: LanguageCode;
}

async function persistUserPref(locale: LanguageCode) {
  try {
    const res = await fetch("/api/user/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    await res.json();
  } catch {}
}

function flattenStrings(dict: NestedDict | null): Set<string> {
  const out = new Set<string>();
  function walk(value: unknown) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) out.add(trimmed);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(walk);
    }
  }
  walk(dict);
  return out;
}

function hashText(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

function restoreOriginalTextNodes() {
  originalTextNodes.forEach((original, node) => {
    if (node.isConnected && node.nodeValue !== original) node.nodeValue = original;
  });
}

function shouldSkipNode(node: Text, translatedDictValues: Set<string>) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest("[data-no-auto-translate], [data-i18n-ignore], .notranslate")) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  const text = node.nodeValue || "";
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length < 2 || trimmed.length > 280) return true;
  if (!/[A-Za-zÀ-ÿ]/.test(trimmed)) return true;
  if (/^[\d\s.,:%+\-–—/()]+$/.test(trimmed)) return true;
  if (translatedDictValues.has(trimmed)) return true;
  return false;
}

function collectTranslatableTextNodes(root: ParentNode, translatedDictValues: Set<string>, limit = 80) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkipNode(node as Text, translatedDictValues) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  let current = walker.nextNode();
  while (current && nodes.length < limit) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function AutoTranslateDom({ language, dict }: { language: LanguageCode; dict: NestedDict | null }) {
  const translatedDictValues = useMemo(() => flattenStrings(dict), [dict]);

  useEffect(() => {
    if (typeof document === "undefined" || !dict) return;
    let cancelled = false;
    let timer: number | null = null;

    async function run() {
      if (cancelled) return;
      restoreOriginalTextNodes();
      if (language === "pt-BR") {
        document.documentElement.setAttribute("data-translation-status", "ready");
        return;
      }

      const nodes = collectTranslatableTextNodes(document.body, translatedDictValues);
      const items: { id: string; text: string; entityType: string; entityId: string; fieldName: string }[] = [];
      const nodeById = new Map<string, Text>();

      for (const node of nodes) {
        const original = originalTextNodes.get(node) || node.nodeValue || "";
        originalTextNodes.set(node, original);
        const trimmedOriginal = original.replace(/\s+/g, " ").trim();
        if (!trimmedOriginal) continue;
        const id = hashText(trimmedOriginal);
        const cacheKey = `${DOM_CACHE_PREFIX}:${language}:${id}`;
        const cached = window.localStorage.getItem(cacheKey);
        if (cached) {
          node.nodeValue = original.replace(trimmedOriginal, cached);
          continue;
        }
        if (!nodeById.has(id)) {
          nodeById.set(id, node);
          items.push({ id, text: trimmedOriginal, entityType: "dom", entityId: id, fieldName: "text" });
        }
      }

      if (!items.length) {
        document.documentElement.setAttribute("data-translation-status", "ready");
        return;
      }

      document.documentElement.setAttribute("data-translation-status", "translating");
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLocale: language, items }),
        });
        const data = await res.json().catch(() => null);
        if (!data?.ok || !Array.isArray(data.items)) return;
        for (const item of data.items as { id: string; translated: string }[]) {
          const node = nodeById.get(item.id);
          if (!node || !node.isConnected || !item.translated) continue;
          const original = originalTextNodes.get(node) || node.nodeValue || "";
          const trimmedOriginal = original.replace(/\s+/g, " ").trim();
          window.localStorage.setItem(`${DOM_CACHE_PREFIX}:${language}:${item.id}`, item.translated);
          node.nodeValue = original.replace(trimmedOriginal, item.translated);
        }
      } finally {
        document.documentElement.setAttribute("data-translation-status", "ready");
      }
    }

    function schedule() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(run, 180);
    }

    schedule();
    const observer = new MutationObserver((mutations) => {
      if (language === "pt-BR") return;
      if (mutations.some((m) => m.type === "childList" && m.addedNodes.length > 0)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [language, dict, translatedDictValues]);

  return null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<LanguageCode>(() => readInitial());
  const [dict, setDict] = useState<NestedDict | null>(() => getPreloaded() || ptBR);

  useEffect(() => {
    let cancelled = false;
    loadLocale(language).then((nextDict) => {
      if (!cancelled) setDict(nextDict);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const setLanguage = useCallback((next: LanguageCode) => {
    const normalized = normalizeLocale(next);
    persist(normalized);
    applyHtml(normalized);
    setLanguageState(normalized);
    loadLocale(normalized).then(setDict).catch(() => {});
    persistUserPref(normalized);
    router.refresh();
  }, [router]);

  useEffect(() => {
    const hadStoredAtBoot = readStoredLocale() !== null;
    if (hadStoredAtBoot) persist(language);
    applyHtml(language);
    fetch("/api/user/locale")
      .then((r) => r.json().catch(() => null))
      .then((data: UserLocalePref | null) => {
        if (!data?.locale) return;
        const normalized = normalizeLocale(data.locale);
        const currentStored = readStoredLocale();
        // Se o usuário clicou em outro idioma enquanto essa request estava em voo,
        // mantém o clique dele em vez de sobrescrever com preferência antiga do servidor.
        if (currentStored && currentStored !== normalized) return;
        if (normalized !== language) {
          persist(normalized);
          applyHtml(normalized);
          setLanguageState(normalized);
          loadLocale(normalized).then(setDict).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string => {
      if (!dict) return path;
      const val = resolveKey(dict, path);
      return interpolate(val, vars);
    },
    [dict]
  );

  const value = useMemo<LanguageProviderState>(
    () => ({ language, setLanguage, t, dict }),
    [language, setLanguage, t, dict]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <AutoTranslateDom language={language} dict={dict} />
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useTranslate() {
  const { t } = useLanguage();
  return t;
}
