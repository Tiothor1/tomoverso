"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Heart, Play, Search, Sparkles, ThumbsUp, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TomoMusicPayload, TomoMusicTrack } from "@/lib/tomomusic/types";
import { useTomoMusic } from "@/components/tomomusic/tomomusic-provider";

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function bytes(value: number) {
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function TomoMusicLibrary({ initialPayload }: { initialPayload: TomoMusicPayload }) {
  const music = useTomoMusic();
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState("todos");
  const tracks = music.tracks.length ? music.tracks : initialPayload.tracks;
  const playlists = music.playlists.length ? music.playlists : initialPayload.playlists;
  const moods = useMemo(() => Array.from(new Set(["todos", ...initialPayload.moods, ...tracks.map((t) => t.mood)])), [initialPayload.moods, tracks]);
  const filtered = tracks.filter((track) => {
    const q = query.trim().toLowerCase();
    const okMood = mood === "todos" || track.mood === mood;
    if (!okMood) return false;
    if (!q) return true;
    return `${track.title} ${track.artist} ${track.genre} ${track.mood}`.toLowerCase().includes(q);
  });
  const popular = [...tracks].sort((a, b) => b.play_count - a.play_count).slice(0, 6);
  const recent = [...tracks].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  const favorites = tracks.filter((track) => track.favorited).slice(0, 6);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050a0b] text-slate-100">
      <section className="relative border-b border-white/10 px-4 py-16 sm:px-6 lg:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(219,172,85,.18),transparent_36%),radial-gradient(circle_at_80%_5%,rgba(14,116,144,.22),transparent_38%),linear-gradient(180deg,rgba(8,13,18,.2),#050a0b)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-amber-100">
              <Sparkles className="h-3.5 w-3.5" /> Sistema oficial de música ambiente
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              TomoMusic para ler com clima, foco e segurança jurídica.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Músicas Creative Commons baixadas, catalogadas e servidas dentro do Tomoverso — sem anime protegido, sem Spotify, sem autoplay invasivo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <span className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"><b className="text-amber-200">{initialPayload.stats.totalTracks}</b> músicas ativas</span>
              <span className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"><b className="text-emerald-200">{bytes(initialPayload.stats.totalBytes)}</b> baixados</span>
              <span className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"><b className="text-cyan-200">CC BY</b> com créditos</span>
            </div>
          </div>
          <div className="rounded-[2rem] border border-amber-300/20 bg-slate-950/60 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-amber-200/70">Player grande</p>
                <h2 className="text-2xl font-black text-white">Ativar TomoMusic</h2>
              </div>
              <Volume2 className="h-7 w-7 text-amber-200" />
            </div>
            <FeaturedTrack track={tracks[0]} queue={tracks} />
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              O navegador só toca com clique do usuário. Depois disso, o player global continua entre páginas e minimiza automaticamente no leitor.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por música, artista, clima ou gênero..." className="h-14 w-full rounded-3xl border border-white/10 bg-white/[0.04] pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/40" />
          </label>
          <div className="flex flex-wrap gap-2">
            {moods.map((item) => (
              <button key={item} type="button" onClick={() => setMood(item)} className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition", mood === item ? "border-amber-300/40 bg-amber-300/15 text-amber-100" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]")}>{item === "todos" ? "Todos" : item}</button>
            ))}
          </div>
        </div>

        <Shelf title="Playlists prontas" subtitle="Selecionadas automaticamente por clima para leitura.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {playlists.map((playlist) => {
              const queue = playlist.track_ids.map((id) => tracks.find((track) => track.id === id)).filter(Boolean) as TomoMusicTrack[];
              return (
                <button key={playlist.id} type="button" onClick={() => queue[0] && music.playTrack(queue[0], queue)} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:-translate-y-1 hover:border-amber-300/25 hover:bg-white/[0.06]">
                  <div className="mb-4 flex -space-x-4">
                    {queue.slice(0, 4).map((track) => <img key={track.id} src={track.cover_url || ""} alt="" className="h-14 w-14 rounded-2xl border border-slate-950 object-cover" />)}
                  </div>
                  <h3 className="font-black text-white">{playlist.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{playlist.description}</p>
                  <p className="mt-4 text-xs text-amber-200">{queue.length} faixas · tocar playlist</p>
                </button>
              );
            })}
          </div>
        </Shelf>

        <Shelf title="Músicas" subtitle={`${filtered.length} faixas encontradas com licença clara.`}>
          <TrackGrid tracks={filtered} queue={filtered} />
        </Shelf>

        <div className="grid gap-8 xl:grid-cols-3">
          <Shelf title="Populares" subtitle="Mais tocadas no Tomoverso."><MiniList tracks={popular} /></Shelf>
          <Shelf title="Recentes" subtitle="Últimas adicionadas ao catálogo."><MiniList tracks={recent} /></Shelf>
          <Shelf title="Favoritas" subtitle="Suas músicas salvas.">{favorites.length ? <MiniList tracks={favorites} /> : <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">Entre e favorite músicas para elas aparecerem aqui.</div>}</Shelf>
        </div>
      </section>
    </main>
  );
}

function Shelf({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section><div className="mb-4"><h2 className="text-2xl font-black text-white">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}</div>{children}</section>;
}

function FeaturedTrack({ track, queue }: { track?: TomoMusicTrack; queue: TomoMusicTrack[] }) {
  const music = useTomoMusic();
  if (!track) return null;
  return (
    <button type="button" onClick={() => music.playTrack(track, queue)} className="group flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07]">
      <img src={track.cover_url || ""} alt="" className="h-24 w-24 rounded-2xl object-cover shadow-xl" />
      <span className="min-w-0 flex-1"><span className="block text-xl font-black text-white">{track.title}</span><span className="mt-1 block text-sm text-slate-400">{track.artist}</span><span className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-slate-950"><Play className="h-4 w-4" /> Tocar agora</span></span>
    </button>
  );
}

function TrackGrid({ tracks, queue }: { tracks: TomoMusicTrack[]; queue: TomoMusicTrack[] }) {
  if (!tracks.length) return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">Nenhuma música encontrada.</div>;
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tracks.map((track) => <TrackCard key={track.id} track={track} queue={queue} />)}</div>;
}

function TrackCard({ track, queue }: { track: TomoMusicTrack; queue: TomoMusicTrack[] }) {
  const music = useTomoMusic();
  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] transition hover:-translate-y-1 hover:border-amber-300/25 hover:bg-white/[0.06]">
      <button type="button" onClick={() => music.playTrack(track, queue)} className="relative block w-full overflow-hidden text-left">
        <img src={track.cover_url || ""} alt="" className="aspect-[16/10] w-full object-cover transition group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute bottom-4 left-4 rounded-full bg-amber-300 p-3 text-slate-950 shadow-lg"><Play className="h-5 w-5" /></span>
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="truncate font-black text-white">{track.title}</h3><p className="truncate text-sm text-slate-400">{track.artist}</p></div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-300">{fmt(track.duration_seconds)}</span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">{track.description}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>{track.mood} · {track.genre}</span>
          <span>{track.play_count} plays</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => music.likeTrack(track.id)} className={cn("rounded-xl border px-3 py-2 text-xs font-bold", track.liked ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.03] text-slate-300")}><ThumbsUp className="mr-1 inline h-3.5 w-3.5" /> {track.like_count}</button>
          <button type="button" onClick={() => music.favoriteTrack(track.id)} className={cn("rounded-xl border px-3 py-2 text-xs font-bold", track.favorited ? "border-rose-300/30 bg-rose-300/10 text-rose-100" : "border-white/10 bg-white/[0.03] text-slate-300")}><Heart className={cn("mr-1 inline h-3.5 w-3.5", track.favorited && "fill-current")} /> Favoritar</button>
        </div>
      </div>
    </article>
  );
}

function MiniList({ tracks }: { tracks: TomoMusicTrack[] }) {
  const music = useTomoMusic();
  return <div className="space-y-2">{tracks.map((track) => <button key={track.id} type="button" onClick={() => music.playTrack(track, tracks)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-left transition hover:bg-white/[0.06]"><img src={track.cover_url || ""} alt="" className="h-12 w-12 rounded-xl object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-100">{track.title}</span><span className="block truncate text-xs text-slate-500">{track.artist}</span></span><Play className="h-4 w-4 text-amber-200" /></button>)}</div>;
}
