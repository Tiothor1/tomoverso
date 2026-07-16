"use client";

import { useEffect, useState, useRef } from "react";

type StudyTarget = {
  id: string;
  title: string;
  type: string;
  status: string;
  chapters: number;
  genres: string;
  author: string;
  style: string;
  writing: string;
  panels: string;
  notes: string;
};

const TARGET_MINUTES = 120;

export function StudyTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [target, setTarget] = useState<StudyTarget | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 172 });
  const [phase, setPhase] = useState<"preparing" | "studying" | "done">("preparing");
  const [log, setLog] = useState<string[]>([]);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    // Restore timer from sessionStorage
    const saved = sessionStorage.getItem("tv_study_start");
    if (saved) {
      startRef.current = parseInt(saved);
      setElapsed(Math.floor((Date.now() - parseInt(saved)) / 1000));
      setPhase("studying");
    }
  }, []);

  useEffect(() => {
    if (phase !== "studying" || !startRef.current) return;
    const interval = setInterval(() => {
      const now = Math.floor((Date.now() - startRef.current!) / 1000);
      setElapsed(now);
      if (now >= TARGET_MINUTES * 60) {
        setPhase("done");
        sessionStorage.removeItem("tv_study_start");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Listen for study events from parent
  useEffect(() => {
    function handler(e: CustomEvent) {
      if (e.detail?.type === "study-target") {
        setTarget(e.detail.target);
        setProgress(e.detail.progress);
      }
      if (e.detail?.type === "study-log") {
        setLog(prev => [e.detail.message, ...prev].slice(0, 50));
      }
    }
    window.addEventListener("study-update" as any, handler as any);
    return () => window.removeEventListener("study-update" as any, handler as any);
  }, []);

  const remaining = Math.max(0, TARGET_MINUTES * 60 - elapsed);
  const pct = Math.min(100, Math.round((elapsed / (TARGET_MINUTES * 60)) * 100));
  const pctWorks = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  function startStudy() {
    const now = Date.now();
    startRef.current = now;
    sessionStorage.setItem("tv_study_start", String(now));
    setElapsed(0);
    setPhase("studying");
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#050806]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${phase === "studying" ? "animate-pulse bg-emerald-400" : phase === "done" ? "bg-cyan-400" : "bg-amber-500"}`} />
            <span className="text-sm font-semibold text-slate-100">Maratona de Estudo</span>
          </div>
          <span className="text-xs text-slate-500">{TARGET_MINUTES} min · {progress.done}/{progress.total} obras</span>
        </div>
        {phase === "preparing" && (
          <button onClick={startStudy} className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400">
            INICIAR
          </button>
        )}
      </div>

      {/* Main timer */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        {phase === "studying" && (
          <>
            {/* Big timer */}
            <div className="text-center">
              <div className="text-7xl font-bold tracking-tighter text-slate-50 tabular-nums">
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
              </div>
              <p className="mt-2 text-sm text-slate-500">restantes de {TARGET_MINUTES} min</p>
            </div>

            {/* Progress ring */}
            <div className="flex gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-cyan-300">{pct}%</div>
                <p className="text-xs text-slate-500">tempo</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-violet-300">{pctWorks}%</div>
                <p className="text-xs text-slate-500">obras</p>
              </div>
            </div>

            {/* Current study target */}
            {target && (
              <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{target.type} · {target.status} · {target.chapters} cap.</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-100 truncate">{target.title}</h3>
                    <p className="text-xs text-slate-500">{target.author} · {target.genres}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <p><span className="text-slate-400">🎨 Estilo:</span> <span className="text-slate-300">{target.style}</span></p>
                  <p><span className="text-slate-400">✍️ Escrita:</span> <span className="text-slate-300">{target.writing}</span></p>
                  <p><span className="text-slate-400">🖼️ Painéis:</span> <span className="text-slate-300">{target.panels}</span></p>
                  {target.notes && <p><span className="text-slate-400">📝 Anotações:</span> <span className="text-slate-300">{target.notes}</span></p>}
                </div>
              </div>
            )}

            {/* Log */}
            {log.length > 0 && (
              <div className="w-full max-w-lg max-h-32 overflow-y-auto space-y-1">
                {log.map((msg, i) => (
                  <p key={i} className="text-xs text-slate-600 truncate">{msg}</p>
                ))}
              </div>
            )}
          </>
        )}

        {phase === "done" && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-slate-100">Estudo Concluído!</h2>
            <p className="mt-2 text-slate-400">{progress.done} obras estudadas em {TARGET_MINUTES} minutos</p>
          </div>
        )}
      </div>
    </div>
  );
}
