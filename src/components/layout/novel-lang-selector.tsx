'use client';

import { useCallback, useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Lang = 'pt' | 'en' | 'jp';

const LANG_LABELS: Record<Lang, string> = { pt: 'Português', en: 'English', jp: '日本語' };
const LANG_FLAGS: Record<Lang, string> = { pt: '🇧🇷', en: '🇺🇸', jp: '🇯🇵' };

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1] || null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=31536000;SameSite=Lax`;
}

export function getStoredLang(): Lang {
  if (typeof window === 'undefined') return 'pt';
  const stored = getCookie('novel_lang');
  if (stored && ['pt', 'en', 'jp'].includes(stored)) return stored as Lang;
  return 'pt';
}

export function getNovelTitle(
  novel: { title?: string | null; title_en?: string | null; title_jp?: string | null },
  lang?: Lang
): string {
  const l = lang || getStoredLang();
  if (l === 'jp' && novel.title_jp) return novel.title_jp;
  if (l === 'en' && novel.title_en) return novel.title_en;
  return novel.title || novel.title_en || novel.title_jp || '';
}

export function getNovelSubtitle(
  novel: { title?: string | null; title_en?: string | null; title_jp?: string | null },
  lang?: Lang
): string {
  const l = lang || getStoredLang();
  const current = getNovelTitle(novel, l);
  const alternatives: string[] = [];
  if (l !== 'jp' && novel.title_jp) alternatives.push(novel.title_jp);
  if (l !== 'en' && novel.title_en && novel.title_en !== novel.title) alternatives.push(novel.title_en);
  if (l !== 'pt' && novel.title && novel.title !== (l === 'en' ? novel.title_en : novel.title_jp)) alternatives.push(novel.title);
  return alternatives.length ? alternatives[0] : '';
}

export function LangSelector() {
  const [lang, setLangState] = useState<Lang>('pt');

  useEffect(() => {
    setLangState(getStoredLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setCookie('novel_lang', l);
    // Force re-render of all novel titles on the page
    window.dispatchEvent(new Event('novel-lang-change'));
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Languages className="h-3.5 w-3.5" />
          <span>{LANG_FLAGS[lang]}</span>
          <span className="hidden sm:inline">{LANG_LABELS[lang].split(' ')[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLang('pt')} className="cursor-pointer gap-2">
          🇧🇷 Português
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang('en')} className="cursor-pointer gap-2">
          🇺🇸 English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang('jp')} className="cursor-pointer gap-2">
          🇯🇵 日本語
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
