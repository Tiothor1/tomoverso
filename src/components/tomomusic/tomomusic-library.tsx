"use client";

import { useMemo, useState } from "react";
import { Heart, Headphones, ListMusic, Play, Search, Shuffle, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TomoMusicPayload, TomoMusicTrack } from "@/lib/tomomusic/types";
import { useTomoMusic } from "@/components/tomomusic/tomomusic-provider";

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function moodLabel(value: string) {
  const labels: Record<string, string> = {
    lofi: "Lofi",
    ambient: "Ambiente",
    reading: "Leitura",
    sleep: "Noite",
    rain: "Chuva",
    chill: "Calmo",
    fantasy: "Fantasia",
    "jazz lofi": "Jazz lofi",
  };
  return labels[value] || value;
}

export function TomoMusicLibrary({ initialPayload }: { initialPayload: TomoMusicPayload }) {
  const music = useTomoMusic();
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState("todos");
  const tracks = music.tracks.length ? music.tracks : initialPayload.tracks;
  const playlists = music.playlists.length ? music.playlists : initialPayload.playlists;
  const moods = useMemo(() => Array.from(new Set(["todos", ...tracks.map((t) => t.mood).filter(Boolean)])), [tracks]);
  const filtered = tracks.filter((track) => {
    const q = query.trim().toLowerCase();
    if (mood !== "todos" && track.mood !== mood) return false;
    if (!q) return true;
    return `${track.title} ${track.artist} ${track.genre} ${track.mood}`.toLowerCase().includes(q);
  });
  const lofi = tracks.filter((track) => `${track.mood} ${track.genre} ${track.title}`.toLowerCase().includes("lofi")).slice(0, 18);
  const recent = [...tracks].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);
  const favorites = tracks.filter((track) => track.favorited).slice(0, 12);

  return (
    <main className="min-h-screen bg-[#050806] pb-28 text-slate-100">
      <section className="border-b border-white/10 bg-[linear-gradient(180deg,#07100d,#050806)] px-4 py-10 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-amber-100">
              <Headphones className="h-3.5 w-3.5" /> TomoMusic
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Música de fundo para ler sem roubar a cena.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Escolha uma faixa lofi, ambiente, chuva, jazz ou fantasia tranquila. Nada toca sozinho: você dá play quando quiser.
            </p>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar lofi, chuva, piano, artista..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/40"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const pool = filtered.length ? filtered : tracks;
                const first = pool[Math.floor(Math.random() * pool.length)] || pool[0];
                if (first) music.playTrack(first, pool);
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 text-sm font-black text-slate-950 hover:bg-amber-200"
            >
              <Shuffle className="h-4 w-4" /> Tocar algo
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {moods.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMood(item)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition",
                  mood === item ? "border-amber-300/40 bg-amber-300/15 text-amber-100" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                )}
              >
                {item === "todos" ? "Tudo" : moodLabel(item)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription upsell banner */}
      {!initialPayload.subscription?.hasSubscription && initialPayload.subscription && initialPayload.subscription.totalTracks > initialPayload.subscription.freeLimit ? (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-300/[0.06] to-transparent px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="text-sm font-bold text-white">
                🎵 Você está vendo {initialPayload.subscription.freeLimit} de {initialPayload.subscription.totalTracks} músicas
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Assine o <strong className="text-amber-200">Plano Leitor</strong> para escutar o catálogo completo sem limite.
              </p>
            </div>
            <a
              href="/store/plans"
              className="mt-3 inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-200 sm:mt-0"
            >
              Ver planos
            </a>
          </div>
        </div>
      ) : null}

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Shelf title="Catálogo" subtitle="Lista leve, sem capas pesadas. Clique e escute.">
            <TrackList tracks={filtered} queue={filtered} />
          </Shelf>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Shelf title="Playlists" subtitle="Atalhos por clima.">
            <div className="space-y-2">
              {playlists.map((playlist) => {
                const queue = playlist.track_ids.map((id) => tracks.find((track) => track.id === id)).filter(Boolean) as TomoMusicTrack[];
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => queue[0] && music.playTrack(queue[0], queue)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-amber-300/25 hover:bg-white/[0.06]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200"><ListMusic className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white">{playlist.title}</span><span className="block truncate text-xs text-slate-500">{queue.length} faixas</span></span>
                    <Play className="h-4 w-4 text-slate-500 group-hover:text-amber-200" />
                  </button>
                );
              })}
            </div>
          </Shelf>

          <Shelf title="Mais lofi" subtitle="Faixas com clima de estudo.">
            <MiniList tracks={lofi} />
          </Shelf>

          <Shelf title="Recentes" subtitle="Últimas adicionadas.">
            <MiniList tracks={recent} />
          </Shelf>

          <Shelf title="Favoritas" subtitle="Suas salvas.">
            {favorites.length ? <MiniList tracks={favorites} /> : <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">Favorite uma música para ela aparecer aqui.</div>}
          </Shelf>
        </aside>
      </section>
    </main>
  );
}

function Shelf({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function TrackList({ tracks, queue }: { tracks: TomoMusicTrack[]; queue: TomoMusicTrack[] }) {
  if (!tracks.length) return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">Nenhuma música encontrada.</div>;
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
      {tracks.map((track, index) => <TrackRow key={track.id} track={track} queue={queue} index={index} />)}
    </div>
  );
}

function TrackRow({ track, queue, index }: { track: TomoMusicTrack; queue: TomoMusicTrack[]; index: number }) {
  const music = useTomoMusic();
  const active = music.currentTrack?.id === track.id;
  return (
    <div className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 px-3 py-3 last:border-b-0 sm:px-4", active && "bg-amber-300/8")}>
      <button
        type="button"
        onClick={() => music.playTrack(track, queue)}
        className={cn("flex h-10 w-10 items-center justify-center rounded-full border transition", active ? "border-amber-300/40 bg-amber-300 text-slate-950" : "border-white/10 bg-white/[0.04] text-amber-100 hover:bg-amber-300 hover:text-slate-950")}
        title={`Tocar ${track.title}`}
      >
        <Play className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="hidden w-8 shrink-0 text-right font-mono text-[11px] text-slate-600 sm:inline">{String(index + 1).padStart(2, "0")}</span>
          <h3 className="truncate text-sm font-black text-white">{track.title}</h3>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{track.artist} · {moodLabel(track.mood)} · {track.genre}</p>
      </div>
      <div className="flex items-center gap-1">
        <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-500 sm:inline">{fmt(track.duration_seconds)}</span>
        <button type="button" onClick={() => music.likeTrack(track.id)} className={cn("rounded-full p-2 text-slate-500 hover:bg-white/10 hover:text-amber-200", track.liked && "text-amber-200")} title="Curtir"><ThumbsUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => music.favoriteTrack(track.id)} className={cn("rounded-full p-2 text-slate-500 hover:bg-white/10 hover:text-rose-300", track.favorited && "text-rose-300")} title="Favoritar"><Heart className={cn("h-4 w-4", track.favorited && "fill-current")} /></button>
      </div>
    </div>
  );
}

function MiniList({ tracks }: { tracks: TomoMusicTrack[] }) {
  const music = useTomoMusic();
  return (
    <div className="space-y-2">
      {tracks.slice(0, 10).map((track) => (
        <button key={track.id} type="button" onClick={() => music.playTrack(track, tracks)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-amber-200"><Play className="h-3.5 w-3.5" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-100">{track.title}</span><span className="block truncate text-xs text-slate-500">{track.artist}</span></span>
          <span className="text-[11px] text-slate-600">{fmt(track.duration_seconds)}</span>
        </button>
      ))}
    </div>
  );
}
