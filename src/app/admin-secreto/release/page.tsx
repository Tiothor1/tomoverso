"use client";

import { useState, useEffect } from "react";

export default function ReleaseAdminPage() {
  const [released, setReleased] = useState<boolean | null>(null);
  const [targetTime, setTargetTime] = useState("");
  const [username, setUsername] = useState("");
  const [grantDays, setGrantDays] = useState(30);
  const [message, setMessage] = useState("");
  const [grantHistory, setGrantHistory] = useState<{ key: string; value: string; updated_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/release").then((r) => r.json()),
      fetch("/api/admin/grant-plan").then((r) => r.json()),
    ]).then(([release, grants]) => {
      setReleased(release.released);
      setTargetTime(release.targetTime || "");
      setGrantHistory(grants.grants || []);
      setLoading(false);
    });
  }, []);

  async function toggleRelease() {
    const action = released ? "block" : "release";
    setMessage("Alterando...");
    const res = await fetch("/api/admin/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.ok) {
      setReleased(data.released);
      setMessage(data.released ? "✅ Site liberado para o público!" : "🔒 Site bloqueado novamente.");
    } else {
      setMessage("❌ Erro: " + (data.error || "desconhecido"));
    }
  }

  async function grantPlan() {
    if (!username.trim()) { setMessage("Digite um username."); return; }
    setMessage("Concedendo plano...");
    const res = await fetch("/api/admin/grant-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), days: grantDays }),
    });
    const data = await res.json();
    if (data.ok) {
      setMessage(`✅ Plano concedido para @${data.username} — expira em ${data.expiresAt.slice(0, 10)}`);
      setUsername("");
      // Refresh grant history
      const g = await fetch("/api/admin/grant-plan").then((r) => r.json());
      setGrantHistory(g.grants || []);
    } else {
      setMessage("❌ " + (data.error || "Erro desconhecido"));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050806] text-white">
        <p className="text-sm text-slate-400">Carregando...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050806] px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200/60">Admin Secreto</p>
          <h1 className="mt-2 text-3xl font-black">Controle de Lançamento</h1>
        </div>

        {/* Release toggle */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-black">Status do site</h2>
          <div className="mt-4 flex items-center gap-4">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                released ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${released ? "bg-emerald-400" : "bg-red-400"}`} />
              {released ? "Público — site liberado" : "Bloqueado — ninguém acessa"}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500">
              {released
                ? "Usuários podem acessar o site normalmente."
                : "A tela de lançamento está ativa. Ninguém consegue navegar."}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Horário alvo: {targetTime ? new Date(targetTime).toLocaleString("pt-BR") : "—"}
            </p>
          </div>
          <button
            onClick={toggleRelease}
            className={`mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition ${
              released
                ? "border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            }`}
          >
            {released ? "🔒 Bloquear site novamente" : "🚀 Liberar site para o público"}
          </button>
        </section>

        {/* Grant plan */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-black">🎁 Conceder Plano Leitor (30 dias grátis)</h2>
          <p className="mt-2 text-sm text-slate-400">
            Use para premiar usuários que postarem sobre o site no TikTok/Instagram marcando @wonner.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Username do usuário
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: joaosilva"
                className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-amber-300/40"
                onKeyDown={(e) => e.key === "Enter" && grantPlan()}
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Dias
              </label>
              <input
                type="number"
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                min={1}
                max={365}
                className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none focus:border-amber-300/40"
              />
            </div>
            <button
              onClick={grantPlan}
              className="flex h-11 items-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-black text-slate-950 hover:bg-amber-200"
            >
              Conceder 🎁
            </button>
          </div>

          {message ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              {message}
            </div>
          ) : null}

          {/* Grant history */}
          {grantHistory.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Histórico de concessões
              </h3>
              <div className="mt-3 space-y-2">
                {grantHistory.map((g, i) => (
                  <div
                    key={g.key}
                    className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm"
                  >
                    <span className="text-slate-300">{g.value}</span>
                    <span className="ml-3 text-[11px] text-slate-600">
                      {g.updated_at.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
