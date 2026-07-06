"use client";

import { useEffect, useRef, useState } from "react";

const INTRO_KEY = "tomoverso_intro_seen";
const MINIMUM_VISIBLE_MS = 1600;
const REDUCED_MOTION_MIN_MS = 800;
const LEAVE_MS = 320;

const LOADING_STAGES = [
  "Organizando a estante para a sua próxima leitura.",
  "Buscando os melhores títulos do catálogo.",
  "Ajeitando as capas e preparando os capítulos.",
  "Quase tudo pronto — separando seu lugar na estante.",
  "Só mais um instante, já vai.",
];

type SplashState = "visible" | "leaving" | "hidden";

export function TomoversoIntroSplash() {
  const [state, setState] = useState<SplashState>("visible");
  const [stageIndex, setStageIndex] = useState(0);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
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

    startedAtRef.current = Date.now();

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const minVisible = prefersReducedMotion ? REDUCED_MOTION_MIN_MS : MINIMUM_VISIBLE_MS;

    // Stage rotation
    let idx = 0;
    setStageIndex(0);
    stageTimerRef.current = setInterval(() => {
      idx = (idx + 1) % LOADING_STAGES.length;
      setStageIndex(idx);
    }, 680);

    function tryDismiss() {
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = minVisible - elapsed;

      if (remaining > 0) {
        // Page loaded before minimum time → wait then dismiss
        setTimeout(() => {
          setState("leaving");
          setTimeout(() => {
            if (stageTimerRef.current) clearInterval(stageTimerRef.current);
            document.documentElement.setAttribute("data-intro-seen", "true");
            setState("hidden");
          }, LEAVE_MS);
        }, remaining);
      } else {
        // Minimum time already passed → dismiss now
        setState("leaving");
        setTimeout(() => {
          if (stageTimerRef.current) clearInterval(stageTimerRef.current);
          document.documentElement.setAttribute("data-intro-seen", "true");
          setState("hidden");
        }, LEAVE_MS);
      }
    }

    if (document.readyState === "complete") {
      // Page already fully loaded (e.g. bfcache restore)
      tryDismiss();
    } else {
      window.addEventListener("load", tryDismiss, { once: true });
    }

    return () => {
      if (stageTimerRef.current) clearInterval(stageTimerRef.current);
      window.removeEventListener("load", tryDismiss);
    };
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
          <p className="tomo-intro-sub" key={stageIndex}>{LOADING_STAGES[stageIndex]}</p>
        </div>

        <div className="tomo-intro-progress" aria-hidden="true" />
      </div>
    </div>
  );
}
