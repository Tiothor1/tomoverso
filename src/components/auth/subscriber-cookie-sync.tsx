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
        const freeColors = ["sepia", "blue", "purple"];
        const nextColor = freeColors.includes(parsed.color) ? parsed.color : "sepia";
        window.localStorage.setItem(key, JSON.stringify({ ...parsed, color: nextColor }));
        document.documentElement.setAttribute("data-color", nextColor);
        document.cookie = `tomoverso-ui-color=${nextColor}; path=/; max-age=31536000; samesite=lax`;
      } catch {}
    }
  }, [active]);

  return null;
}
