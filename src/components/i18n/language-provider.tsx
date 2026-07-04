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

const htmlLang: Record<LanguageCode, string> = {
  pt: "pt-BR", en: "en", es: "es", fr: "fr", de: "de", it: "it", ja: "ja", ko: "ko", "zh-CN": "zh-CN",
};

const validLanguages: LanguageCode[] = ["pt", "en", "es", "fr", "de", "it", "ja", "ko", "zh-CN"];

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

export function LanguageProvider({ children }: LanguageProviderProps) {
  const pathname = usePathname();
  const [language, setLanguageState] = useState<LanguageCode>(() => readInitialLanguage());
  const [isTranslating] = useState(false);

  const persistLanguage = useCallback((next: LanguageCode) => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      setCookie(LANGUAGE_COOKIE, next);
    } catch {}
  }, []);

  const applyHtmlLanguage = useCallback((next: LanguageCode) => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = htmlLang[next] || "pt-BR";
    document.documentElement.setAttribute("data-locale", next);
    document.documentElement.setAttribute("data-translation-status", "ready");
  }, []);

  // Language change: only update HTML attributes, NO DOM translation
  useEffect(() => {
    persistLanguage(language);
    applyHtmlLanguage(language);
  }, [language, persistLanguage, applyHtmlLanguage]);

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
