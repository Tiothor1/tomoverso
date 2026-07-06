"use client";

import { useEffect, useState } from "react";

const INTRO_KEY = "tomoverso_intro_seen";
const DEFAULT_DURATION_MS = 1050;
const REDUCED_MOTION_DURATION_MS = 650;

type SplashState = "visible" | "leaving" | "hidden";

export function TomoversoIntroSplash() {
  const [state, setState] = useState<SplashState>("visible");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    try {
      if (window.sessionStorage.getItem(INTRO_KEY) === "true") {
        document.documentElement.setAttribute("data-intro-seen", "true");
        setState("hidden");
        return;
      }
      window.sessionStorage.setItem(INTRO_KEY, "true");
      document.documentElement.setAttribute("data-intro-seen", "false");
    } catch {
      document.documentElement.setAttribute("data-intro-seen", "false");
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = prefersReducedMotion ? REDUCED_MOTION_DURATION_MS : DEFAULT_DURATION_MS;
    const leaveAt = Math.max(120, duration - 260);

    timers.push(setTimeout(() => setState("leaving"), leaveAt));
    timers.push(
      setTimeout(() => {
        document.documentElement.setAttribute("data-intro-seen", "true");
        setState("hidden");
      }, duration)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  if (state === "hidden") return null;

  return (
    <div
      className={`tomoverso-intro-splash${state === "leaving" ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Carregando Tomo Verso Editora"
    >
      <div className="tomo-intro-panel">
        <div className="tomo-intro-mark" aria-hidden="true">
          <img src="/logo-tomoverso-mark-192.png" alt="" width={72} height={72} />
        </div>

        <div className="tomo-intro-book" aria-hidden="true">
          <span className="tomo-intro-cover tomo-intro-cover-left" />
          <span className="tomo-intro-page tomo-intro-page-one" />
          <span className="tomo-intro-page tomo-intro-page-two" />
          <span className="tomo-intro-cover tomo-intro-cover-right" />
          <span className="tomo-intro-spine" />
        </div>

        <div className="tomo-intro-copy">
          <p className="tomo-intro-kicker">Tomo Verso Editora</p>
          <h2>Abrindo um novo capítulo...</h2>
          <p>Organizando a estante para a sua próxima leitura.</p>
        </div>

        <div className="tomo-intro-progress" aria-hidden="true" />
      </div>
    </div>
  );
}
