"use client";

import type { ElementType, ReactNode } from "react";
import { useTranslate } from "./language-provider";

type TranslateProps = {
  id: string;
  vars?: Record<string, string | number>;
  fallback?: ReactNode;
  as?: ElementType;
  className?: string;
};

export function Translate({ id, vars, fallback, as: Component, className }: TranslateProps) {
  const t = useTranslate();
  const text = t(id, vars);
  const content = text === id && fallback ? fallback : text;
  if (Component) return <Component className={className}>{content}</Component>;
  return <>{content}</>;
}
