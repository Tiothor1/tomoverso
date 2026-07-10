"use client";

import { useState } from "react";

const TYPES = [
  { value: "anime", label: "Anime" },
  { value: "novel", label: "Novel / Light Novel" },
  { value: "manga", label: "Mangá" },
  { value: "manhwa", label: "Manhwa / Webtoon" },
  { value: "other", label: "Outro" },
];

export function SuggestionForm() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("manga");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), type, description: description.trim(), reason: reason.trim() }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatus("sent");
      setMsg("Sugestão enviada! Nossa equipe analisa em até 7 dias.");
      setTitle(""); setDescription(""); setReason("");
    } else {
      setStatus("error");
      setMsg(data.error || "Erro ao enviar");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center">
        <div className="text-4xl">✅</div>
        <h3 className="mt-4 text-lg font-black text-white">Sugestão enviada!</h3>
        <p className="mt-2 text-sm text-slate-300">{msg}</p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-4 rounded-xl border border-white/10 px-5 py-2 text-sm text-slate-300 hover:bg-white/10">
          Enviar outra
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Título da obra</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex: One Piece, Solo Leveling, Mushoku Tensei..." className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Tipo</label>
          <select value={type} onChange={e => setType(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#0a0f0e] px-4 text-sm text-white outline-none focus:border-amber-300/40">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Por que você quer ver aqui? (opcional)</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Conte pra gente por que essa obra seria incrível no Tomoverso..." className="h-20 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40 resize-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Descrição / informações extras (opcional)</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Autor, gêneros, quantos volumes/capítulos tem..." className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40" />
      </div>

      {status === "error" && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{msg}</div>}

      <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 text-sm font-black text-slate-950 transition hover:bg-amber-200">
        Enviar sugestão
      </button>
    </form>
  );
}
