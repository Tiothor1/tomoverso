"use client";

import { useRef, useState } from "react";
import { launchLoginAction } from "@/lib/actions/launch-login-action";

export default function LaunchLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await launchLoginAction(formData);
      if (result.redirect) {
        window.location.href = result.redirect;
        return;
      }
      if (!result.ok && result.error) setError(result.error);
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    }
    submittingRef.current = false;
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050806] text-white">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-400">Acesso restrito — use suas credenciais de admin</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Email ou username</label>
            <input
              name="login"
              required
              placeholder="seu@email.com ou @username"
              defaultValue="tomoversoeditora@gmail.com"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Senha</label>
            <input
              name="password"
              type="password"
              required
              placeholder="Sua senha"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-200 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar no admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
