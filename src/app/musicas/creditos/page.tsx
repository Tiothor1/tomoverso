import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { getTomomusicPayload } from "@/lib/tomomusic/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Créditos das músicas | TomoMusic",
  description: "Créditos obrigatórios e licenças das músicas Creative Commons usadas no TomoMusic.",
};

export default function MusicCreditsPage() {
  const payload = getTomomusicPayload(getDb(), null);
  const tracks = payload.tracks.filter((track) => track.attribution_required);
  return (
    <main className="min-h-screen bg-[#050a0b] px-4 py-14 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/tomomusic" className="text-sm font-semibold text-amber-200 hover:text-amber-100">← Voltar ao TomoMusic</Link>
        <div className="mt-6 rounded-[2rem] border border-amber-300/20 bg-slate-950/70 p-6 shadow-2xl shadow-black/35 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200/70">Créditos obrigatórios</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Músicas usadas no TomoMusic</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Todas as faixas abaixo foram baixadas de fontes com licença clara permitindo uso em plataforma digital. Não usamos músicas de anime, Spotify, YouTube Music ou artistas protegidos sem licença explícita.
          </p>
          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><b className="text-amber-200">{payload.stats.totalTracks}</b><br />músicas ativas</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><b className="text-cyan-200">{(payload.stats.totalBytes / 1024 / 1024).toFixed(1)} MB</b><br />armazenados</div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><b className="text-emerald-200">CC BY</b><br />licenças usadas</div>
          </div>
        </div>
        <div className="mt-8 space-y-4">
          {tracks.map((track) => (
            <article key={track.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {track.cover_url ? <img src={track.cover_url} alt="" className="h-20 w-20 rounded-2xl object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-white">{track.title}</h2>
                  <p className="text-sm text-slate-400">{track.artist}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{track.attribution_text}</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                <div><dt className="text-slate-500">Fonte</dt><dd className="break-all"><a href={track.source_url} target="_blank" rel="noopener noreferrer" className="text-amber-200 hover:text-amber-100">{track.source_url}</a></dd></div>
                <div><dt className="text-slate-500">Licença</dt><dd className="break-all"><a href={track.license_url} target="_blank" rel="noopener noreferrer" className="text-amber-200 hover:text-amber-100">{track.license_name}</a></dd></div>
                <div><dt className="text-slate-500">Arquivo local</dt><dd className="break-all">{track.local_file}</dd></div>
                <div><dt className="text-slate-500">Data de download</dt><dd>{track.downloaded_at?.slice(0, 10) || "—"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
