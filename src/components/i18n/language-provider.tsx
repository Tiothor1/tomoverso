"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { LanguageCode, NestedDict } from "@/lib/i18n/types";
import { LOCALE_HTML_MAP, LOCALE_NAMES, normalizeLocale } from "@/lib/i18n/types";
import { loadLocale, resolveKey, interpolate } from "@/lib/i18n/client";

const LANGUAGE_STORAGE_KEY = "tomoverso-locale";
const LANGUAGE_COOKIE = "novel_lang";

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

function readInitial(): LanguageCode {
  if (typeof window === "undefined") return "pt-BR";
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || getCookie(LANGUAGE_COOKIE);
    if (stored) return normalizeLocale(stored);
    const browser = navigator.language || (navigator as any).userLanguage || "";
    if (browser) return normalizeLocale(browser);
  } catch {}
  return "pt-BR";
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

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState<LanguageCode>(() => readInitial());
  const [dict, setDict] = useState<NestedDict | null>(null);
  const loadedRef = useRef<Set<LanguageCode>>(new Set());

  // Load dictionary
  useEffect(() => {
    if (!loadedRef.current.has(language)) {
      loadedRef.current.add(language);
      loadLocale(language).then(setDict);
    }
  }, [language]);

  const setLanguage = useCallback((next: LanguageCode) => {
    const normalized = normalizeLocale(next);
    persist(normalized);
    applyHtml(normalized);
    setLanguageState(normalized);
    persistUserPref(normalized);
  }, []);

  // Initial persist & user pref sync
  useEffect(() => {
    persist(language);
    applyHtml(language);
    // Try to load user pref
    fetch("/api/user/locale")
      .then((r) => r.json().catch(() => null))
      .then((data: UserLocalePref | null) => {
        if (data?.locale && data.locale !== language) {
          setLanguageState(normalizeLocale(data.locale));
        }
      })
      .catch(() => {});
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string => {
      if (!dict) {
        const fallbackDict = typeof window !== "undefined"
          ? (window as any).__TOMOVERSO_LOCALE_PTBR
          : null;
        if (fallbackDict) {
          const val = resolveKey(fallbackDict, path);
          return interpolate(val, vars);
        }
        return path;
      }
      const val = resolveKey(dict, path);
      return interpolate(val, vars);
    },
    [dict]
  );

  const value = useMemo<LanguageProviderState>(
    () => ({ language, setLanguage, t, dict }),
    [language, setLanguage, t, dict]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
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
