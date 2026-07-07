export type LanguageCode = "pt-BR" | "en" | "es" | "fr" | "de" | "it" | "ja" | "ko" | "zh";

export interface LocaleDef {
  label: string;
  short: string;
  flag: string;
}

export const SUPPORTED_LOCALES: Record<LanguageCode, LocaleDef> = {
  "pt-BR": { label: "Português", short: "PT", flag: "BR" },
  "en": { label: "English", short: "EN", flag: "US" },
  "es": { label: "Español", short: "ES", flag: "ES" },
  "fr": { label: "Français", short: "FR", flag: "FR" },
  "de": { label: "Deutsch", short: "DE", flag: "DE" },
  "it": { label: "Italiano", short: "IT", flag: "IT" },
  "ja": { label: "日本語", short: "JA", flag: "JP" },
  "ko": { label: "한국어", short: "KO", flag: "KR" },
  "zh": { label: "中文", short: "ZH", flag: "CN" },
};

export const LOCALE_NAMES = Object.keys(SUPPORTED_LOCALES) as LanguageCode[];

export const LOCALE_HTML_MAP: Record<string, string> = {
  "pt-BR": "pt-BR",
  "en": "en",
  "es": "es",
  "fr": "fr",
  "de": "de",
  "it": "it",
  "ja": "ja",
  "ko": "ko",
  "zh": "zh-CN",
};

export function normalizeLocale(val: unknown): LanguageCode {
  if (LOCALE_NAMES.includes(val as LanguageCode)) return val as LanguageCode;
  const lower = String(val).toLowerCase().replace(/_/g, '-');
  for (const l of LOCALE_NAMES) {
    if (l.toLowerCase() === lower || l.startsWith(lower) || lower.startsWith(l)) return l;
  }
  return "pt-BR";
}

export type NestedDict = Record<string, unknown>;

export interface TranslationCache {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  source_locale: string;
  target_locale: string;
  source_hash: string;
  translated_text: string;
  provider: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TranslateItem {
  text: string;
  id?: string;
}
