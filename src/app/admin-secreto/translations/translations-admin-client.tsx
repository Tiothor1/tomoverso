"use client";

import { useState } from "react";

interface TranslationRow {
  id: string;
  entity_type: string;
  entity_id: string;
  field_name: string;
  target_locale: string;
  translated_text: string;
  source_hash: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function TranslationsAdminClient({ translations, stats }: { translations: TranslationRow[]; stats: any[] }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = translations.filter((t) => {
    if (filter !== "all" && t.target_locale !== filter) return false;
    if (search && !t.translated_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const locales = [...new Set(translations.map((t) => t.target_locale))];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white"
        >
          <option value="all">Todos os idiomas</option>
          {locales.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no texto traduzido..."
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/35"
        />
      </div>

      {stats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.map((s: any) => (
            <span key={s.target_locale + s.status} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
              {s.target_locale}: {s.count} ({s.status})
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.04]">
            <tr>
              <th className="p-3 font-bold text-white/60">Tipo</th>
              <th className="p-3 font-bold text-white/60">Campo</th>
              <th className="p-3 font-bold text-white/60">Idioma</th>
              <th className="p-3 font-bold text-white/60">Texto traduzido</th>
              <th className="p-3 font-bold text-white/60">Status</th>
              <th className="p-3 font-bold text-white/60">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3 text-white/80">{t.entity_type}</td>
                <td className="p-3 text-white/80">{t.field_name}</td>
                <td className="p-3"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t.target_locale}</span></td>
                <td className="max-w-xs truncate p-3 text-white/60">{t.translated_text}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${t.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{t.status}</span></td>
                <td className="p-3 text-xs text-white/40">{t.updated_at}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-white/40">Nenhuma tradução encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
