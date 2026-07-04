"use client";

import { useEffect } from "react";

export function SubscriberCookieSync({ active }: { active: boolean }) {
  useEffect(() => {
    if (active) {
      document.cookie = "tomoverso-subscriber=1; path=/; max-age=2592000; samesite=lax";
    } else {
      document.cookie = "tomoverso-subscriber=; path=/; max-age=0; samesite=lax";
      try {
        const key = "tomoverso-ui-theme";
        const stored = window.localStorage.getItem(key);
        const parsed = stored ? JSON.parse(stored) : {};
        window.localStorage.setItem(key, JSON.stringify({ ...parsed, color: "purple" }));
        window.localStorage.setItem("tomoverso-locale", "pt");
        document.documentElement.setAttribute("data-color", "purple");
        document.documentElement.setAttribute("data-locale", "pt");
        document.documentElement.lang = "pt-BR";
        document.cookie = "novel_lang=pt; path=/; max-age=31536000; samesite=lax";
        document.cookie = "tomoverso-ui-color=purple; path=/; max-age=31536000; samesite=lax";
      } catch {}
    }
  }, [active]);

  return null;
}
