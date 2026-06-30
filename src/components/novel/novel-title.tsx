'use client';

import { useEffect, useState } from 'react';

type Lang = 'pt' | 'en' | 'es';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1] || null;
}

function getLang(): Lang {
  const stored = getCookie('novel_lang');
  if (stored && ['pt', 'en', 'es'].includes(stored)) return stored as Lang;
  return 'pt';
}

interface NovelData {
  title?: string | null;
  title_en?: string | null;
  title_jp?: string | null;
}

/**
 * Hook que retorna o título correto e força re-render quando o idioma muda.
 */
export function useNovelTitle(novel: NovelData): string {
  const [lang, setLang] = useState<Lang>('pt');

  useEffect(() => {
    setLang(getLang());
    const handler = () => setLang(getLang());
    window.addEventListener('novel-lang-change', handler);
    return () => window.removeEventListener('novel-lang-change', handler);
  }, []);

  if (lang === 'en' && novel.title_en) return novel.title_en;
  return novel.title || novel.title_en || novel.title_jp || '';
}

export function useNovelLang(): Lang {
  const [lang, setLang] = useState<Lang>('pt');
  useEffect(() => {
    setLang(getLang());
    const handler = () => setLang(getLang());
    window.addEventListener('novel-lang-change', handler);
    return () => window.removeEventListener('novel-lang-change', handler);
  }, []);
  return lang;
}

/**
 * Componente que renderiza o título no idioma selecionado.
 * Uso: <NovelTitle novel={novel} className="text-lg" />
 */
export function NovelTitle({ novel, className, as: Tag = 'span' }: {
  novel: NovelData;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p';
}) {
  const title = useNovelTitle(novel);
  return <Tag className={className}>{title}</Tag>;
}
