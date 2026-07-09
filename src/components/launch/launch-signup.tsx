"use client";

import { useRef, useState } from "react";
import { launchSignupAction } from "@/lib/actions/launch-signup-action";

export function LaunchSignup() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await launchSignupAction(formData);
      if (result.redirect) {
        setSuccess(true);
        return;
      }
      if (!result.ok && result.error) setError(result.error);
    } catch {
      setError("Erro ao criar conta. Tente novamente.");
    }
    submittingRef.current = false;
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center">
        <div className="text-4xl">✅</div>
        <h3 className="mt-4 text-lg font-black text-white">Conta criada com sucesso!</h3>
        <p className="mt-2 text-sm text-slate-300">
          Você já está conectado. Quando o site for liberado, é só começar a usar!
        </p>
        <p className="mt-4 text-xs text-slate-400">
          Lembre-se de fazer o post no TikTok/Instagram marcando <strong className="text-amber-200">@fb_fandub</strong> com seu @ do site para ganhar 30 dias grátis do Plano Leitor.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3 text-left">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Nome</label>
        <input
          name="display_name"
          required
          minLength={2}
          maxLength={40}
          placeholder="Seu nome"
          className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Username</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">@</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            placeholder="seudaminho"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-8 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-600">Este @ será usado para eu ativar seu Plano Leitor.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="email@exemplo.com"
          className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Senha</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/30 transition hover:bg-amber-200 disabled:opacity-50"
      >
        {loading ? "Criando conta..." : "Criar conta grátis"}
      </button>
    </form>
  );
}
