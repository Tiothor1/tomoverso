"use client";

import { useEffect, useRef } from "react";

function getVisitorId(): string {
  try {
    let vid = localStorage.getItem("tv_vid");
    if (!vid) {
      vid = crypto.randomUUID?.() || Math.random().toString(36).slice(2, 15) + Date.now().toString(36);
      localStorage.setItem("tv_vid", vid);
    }
    return vid;
  } catch {
    return "unknown";
  }
}

function getPageType(): string {
  const path = window.location.pathname;
  if (path === "/" || path === "") return "home";
  if (path.startsWith("/novels/")) {
    const slug = path.replace("/novels/", "");
    if (slug.includes("/")) return "chapter"; // /novels/slug/cap-X
    return "novel";
  }
  if (path.startsWith("/manga/")) return "manga";
  if (path.startsWith("/authors/")) return "author";
  if (path.startsWith("/explore")) return "explore";
  if (path.startsWith("/feed")) return "feed";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/ebooks")) return "book";
  if (path.startsWith("/manga")) return "manga-list";
  if (path.startsWith("/web-novels")) return "novel-list";
  return "other";
}

function getPageId(): string {
  const path = window.location.pathname;
  // /novels/slug or /novels/slug/cap-X => "slug"
  const match = path.match(/^\/(?:novels|manga|ebooks)\/([^/]+)/);
  return match ? match[1] : "";
}

export function PageTracker({ children }: { children: React.ReactNode }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const visitorId = getVisitorId();
    const pageType = getPageType();
    const pageId = getPageId();
    const pageUrl = window.location.href;
    const referrer = document.referrer || "";
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const startTime = Date.now();

    // Fire-and-forget: send view
    fetch("/api/track/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_id: visitorId,
        page_type: pageType,
        page_id: pageId,
        page_url: pageUrl,
        referrer: referrer,
        sw,
        sh,
      }),
      keepalive: true,
    }).catch(() => {});

    // Send time_on_page when leaving
    function sendTime() {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed < 3) return; // ignore bounces < 3s
      navigator.sendBeacon?.("/api/track/view", JSON.stringify({
        visitor_id: visitorId,
        page_type: pageType,
        page_id: pageId,
        page_url: pageUrl,
        time_on_page: elapsed,
      }));
    }

    window.addEventListener("beforeunload", sendTime);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") sendTime();
    });

    return () => {
      window.removeEventListener("beforeunload", sendTime);
      document.removeEventListener("visibilitychange", sendTime);
    };
  }, []);

  return <>{children}</>;
}
