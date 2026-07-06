"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CORE_ROUTES = [
  "/",
  "/feed",
  "/catalogo",
  "/explore",
  "/manga",
  "/novels",
  "/library",
  "/auth/login",
  "/auth/signup",
  "/publicar",
  "/loja",
  "/store",
];

const DYNAMIC_LINK_SELECTOR = [
  'a[href^="/novels/"]',
  'a[href^="/novel/"]',
  'a[href^="/manga/"]',
  'a[href^="/mangas/"]',
  'a[href^="/livros/"]',
].join(",");

const MAX_DYNAMIC_PREFETCHES = 10;

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type IdleDeadlineLike = { didTimeout: boolean; timeRemaining: () => number };

type IdleOptionsLike = { timeout?: number };

type WindowWithIdle = Window & {
  requestIdleCallback?: (callback: (deadline: IdleDeadlineLike) => void, options?: IdleOptionsLike) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleIdle(callback: () => void, timeout = 1800) {
  const win = window as WindowWithIdle;
  const requestIdle = win.requestIdleCallback;
  if (typeof requestIdle === "function") {
    const id = requestIdle(() => callback(), { timeout });
    return () => win.cancelIdleCallback?.(id);
  }

  const id = window.setTimeout(callback, 250);
  return () => window.clearTimeout(id);
}

function shouldPrefetch() {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  return true;
}

function normalizeInternalHref(rawHref: string) {
  if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return null;

  try {
    const url = new URL(rawHref, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return rawHref.startsWith("/") ? rawHref : null;
  }
}

function isDetailRoute(pathname: string) {
  const segments = pathname.split("?")[0].split("/").filter(Boolean);
  if (segments.length !== 2) return false;
  return ["novels", "novel", "manga", "mangas", "livros"].includes(segments[0]);
}

export function TomoversoRoutePreloader() {
  const router = useRouter();

  useEffect(() => {
    if (!shouldPrefetch()) return;

    const prefetched = new Set<string>();

    const prefetch = (href: string | null) => {
      if (!href || prefetched.has(href)) return;
      prefetched.add(href);
      try {
        router.prefetch(href);
      } catch {
        // Prefetch is an optimization only. Never break navigation if Next refuses a route.
      }
    };

    let cancelCoreIdle: (() => void) | undefined;
    const coreTimer = window.setTimeout(() => {
      cancelCoreIdle = scheduleIdle(() => {
        CORE_ROUTES.forEach(prefetch);
      });
    }, 900);

    let dynamicCount = 0;
    let observer: IntersectionObserver | null = null;

    const dynamicTimer = window.setTimeout(() => {
      if (!("IntersectionObserver" in window)) return;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || dynamicCount >= MAX_DYNAMIC_PREFETCHES) continue;

            const anchor = entry.target as HTMLAnchorElement;
            const href = normalizeInternalHref(anchor.getAttribute("href") || "");
            if (href && isDetailRoute(href)) {
              dynamicCount += 1;
              prefetch(href);
            }
            observer?.unobserve(anchor);
          }
        },
        { rootMargin: "720px 0px", threshold: 0.01 }
      );

      document.querySelectorAll<HTMLAnchorElement>(DYNAMIC_LINK_SELECTOR).forEach((anchor) => {
        if (dynamicCount >= MAX_DYNAMIC_PREFETCHES) return;
        const href = normalizeInternalHref(anchor.getAttribute("href") || "");
        if (href && isDetailRoute(href)) observer?.observe(anchor);
      });
    }, 1450);

    return () => {
      window.clearTimeout(coreTimer);
      window.clearTimeout(dynamicTimer);
      cancelCoreIdle?.();
      observer?.disconnect();
    };
  }, [router]);

  return null;
}
