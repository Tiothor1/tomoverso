"use client";

import { useEffect } from "react";

export function SubscriberCookieSync({ active }: { active: boolean }) {
  useEffect(() => {
    if (active) {
      document.cookie = "tomoverso-subscriber=1; path=/; max-age=2592000; samesite=lax";
    } else {
      document.cookie = "tomoverso-subscriber=; path=/; max-age=0; samesite=lax";
    }
  }, [active]);

  return null;
}
