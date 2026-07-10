"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  title: string;
  type: string;
  description: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  admin_notes: string;
  created_at: string;
  decided_at: string | null;
  username: string | null;
  display_name: string | null;
}

const TYPE_LABELS: Record<string, string> = { anime: "Anime", novel: "Novel/LN", manga: "Mangá", manhwa: "Manhwa", other: "Outro" };

export function SuggestionsList() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/suggestions?filter=${filter}`)
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => {});
  }, [filter]);

  const filtered = suggestions.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || (s.reason || "").toLowerCase().includes(q);
  });

  const statusColor = (status: string) => {
    if (status === "accepted") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    if (status === "rejected") return "border-red-400/30 bg-red-400/10 text-red-200";
    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar sugestões..." className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40" />
        </label>
        {["all","pending","accepted","rejected"].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full border px-4 py-1.5 text-xs font-bold transition", filter === f ? "border-amber-300/40 bg-amber-300/15 text-amber-100" : "border-white/10 text-slate-400 hover:bg-white/[0.06]")}>
            {f === "all" ? "Todas" : f === "pending" ? "Pendentes" : f === "accepted" ? "Aceitas" : "Recusadas"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-400">Nenhuma sugestão encontrada.</div>}
        {filtered.map(s => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-white">{s.title}</h3>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">{TYPE_LABELS[s.type] || s.type}</span>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold", statusColor(s.status))}>
                    {s.status === "accepted" ? "✅ Aceita" : s.status === "rejected" ? "❌ Recusada" : "⏳ Pendente"}
                  </span>
                </div>
                {s.reason && <p className="mt-2 text-sm text-slate-400">{s.reason}</p>}
                {s.admin_notes && <p className="mt-1.5 text-xs text-amber-200/70">Nota do admin: {s.admin_notes}</p>}
              </div>
              <div className="shrink-0 text-right text-[11px] text-slate-500">
                <p>{new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                {s.decided_at && <p className="mt-0.5">↳ {new Date(s.decided_at).toLocaleDateString("pt-BR")}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
