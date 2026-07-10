"use client";

import { useEffect, useState } from "react";

interface Suggestion {
  id: string;
  title: string;
  type: string;
  description: string;
  reason: string;
  status: string;
  admin_notes: string;
  created_at: string;
  username: string | null;
  display_name: string | null;
}

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState("pending");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, [filter]);
  function load() {
    fetch(`/api/suggestions?filter=${filter}`)
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []));
  }

  async function decide(id: string, action: "accept" | "reject") {
    setMessage("Processando...");
    const res = await fetch("/api/admin/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId: id, action, notes: note }),
    });
    const data = await res.json();
    if (data.ok) {
      setMessage(`✅ Sugestão ${action === "accept" ? "aceita" : "recusada"}!`);
      setNote("");
      load();
    } else {
      setMessage("❌ " + (data.error || "Erro"));
    }
  }

  const TYPE_LABELS: Record<string, string> = { anime: "Anime", novel: "Novel/LN", manga: "Mangá", manhwa: "Manhwa", other: "Outro" };

  return (
    <main className="min-h-screen bg-[#050806] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200/60">Admin Secreto</p>
          <h1 className="mt-2 text-3xl font-black">💡 Sugestões da comunidade</h1>
        </div>

        <div className="flex gap-2">
          {["pending","accepted","rejected","all"].map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${filter === f ? "border-amber-300/40 bg-amber-300/15 text-amber-100" : "border-white/10 text-slate-400 hover:bg-white/[0.06]"}`}>
              {f === "all" ? "Todas" : f === "pending" ? "Pendentes" : f === "accepted" ? "Aceitas" : "Recusadas"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {suggestions.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">Nenhuma sugestão {filter === "pending" ? "pendente" : filter === "accepted" ? "aceita" : filter === "rejected" ? "recusada" : ""}.</div>}
          {suggestions.map(s => (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white">{s.title}</h3>
                  <p className="text-xs text-slate-400">{TYPE_LABELS[s.type] || s.type}{s.username ? ` · por @${s.username} (${s.display_name})` : " · anônimo"}</p>
                  {s.reason && <p className="mt-2 text-sm text-slate-300">{s.reason}</p>}
                  {s.description && <p className="mt-1 text-xs text-slate-500">{s.description}</p>}
                  <p className="mt-1 text-[10px] text-slate-600">{new Date(s.created_at).toLocaleString("pt-BR")}</p>
                  {s.admin_notes && <p className="mt-1 text-xs text-amber-200/70">Nota: {s.admin_notes}</p>}
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                  s.status === "accepted" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" :
                  s.status === "rejected" ? "border-red-400/30 bg-red-400/10 text-red-200" :
                  "border-amber-300/30 bg-amber-300/10 text-amber-200"
                }`}>
                  {s.status === "accepted" ? "✅ Aceita" : s.status === "rejected" ? "❌ Recusada" : "⏳ Pendente"}
                </span>
              </div>
              {s.status === "pending" && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                  <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nota do admin (opcional)..." className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-amber-300/40 min-w-[200px]" />
                  <button type="button" onClick={() => decide(s.id, "accept")} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-400">Aceitar ✅</button>
                  <button type="button" onClick={() => decide(s.id, "reject")} className="rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-2.5 text-sm font-bold text-red-200 hover:bg-red-400/20">Recusar ❌</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {message && <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">{message}</div>}
      </div>
    </main>
  );
}
