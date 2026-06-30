'use client';

import { useCallback, useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Lang = 'pt' | 'en' | 'es';

const LANG_LABELS: Record<Lang, string> = { pt: 'Português BR', en: 'English', es: 'Español' };
const LANG_FLAGS: Record<Lang, string> = { pt: '🇧🇷', en: '🇺🇸', es: '🇪🇸' };

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1] || null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=31536000;SameSite=Lax`;
}

function normalizeLang(value: string | null | undefined): Lang {
  if (value === 'pt' || value === 'en' || value === 'es') return value;
  return 'pt';
}

export function getStoredLang(): Lang {
  if (typeof window === 'undefined') return 'pt';
  return normalizeLang(getCookie('novel_lang') || window.localStorage.getItem('tomoverso-locale'));
}

export function getNovelTitle(
  novel: { title?: string | null; title_en?: string | null; title_jp?: string | null },
  lang?: Lang
): string {
  const l = lang || getStoredLang();
  if (l === 'en' && novel.title_en) return novel.title_en;
  return novel.title || novel.title_en || novel.title_jp || '';
}

export function getNovelSubtitle(
  novel: { title?: string | null; title_en?: string | null; title_jp?: string | null },
  lang?: Lang
): string {
  const l = lang || getStoredLang();
  const alternatives: string[] = [];
  if (l !== 'en' && novel.title_en && novel.title_en !== novel.title) alternatives.push(novel.title_en);
  if (novel.title_jp) alternatives.push(novel.title_jp);
  return alternatives[0] || '';
}

export function LangSelector() {
  const [lang, setLangState] = useState<Lang>('pt');

  useEffect(() => {
    setLangState(getStoredLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setCookie('novel_lang', l);
    window.localStorage.setItem('tomoverso-locale', l);
    window.dispatchEvent(new Event('novel-lang-change'));
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 rounded-full text-xs" aria-label="Escolher idioma">
          <Languages className="h-3.5 w-3.5" />
          <span>{LANG_FLAGS[lang]}</span>
          <span className="hidden sm:inline">{LANG_LABELS[lang].split(' ')[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Idioma</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLang(l)} className="cursor-pointer gap-2">
            <span>{LANG_FLAGS[l]}</span>
            <span className="flex-1">{LANG_LABELS[l]}</span>
            {lang === l ? <span className="text-primary">✓</span> : null}
          </DropdownMenuItem>
        ))}
        <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
          Preferência salva. Tradução completa da interface está em preparação.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
