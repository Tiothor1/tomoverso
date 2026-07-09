"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Headphones,
  ListMusic,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  ThumbsUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TomoMusicPayload, TomoMusicPlaylist, TomoMusicTrack } from "@/lib/tomomusic/types";

type LoopMode = "off" | "track" | "playlist";

type TomoMusicContextValue = {
  tracks: TomoMusicTrack[];
  playlists: TomoMusicPlaylist[];
  currentTrack: TomoMusicTrack | null;
  queue: TomoMusicTrack[];
  isPlaying: boolean;
  activated: boolean;
  volume: number;
  muted: boolean;
  loopMode: LoopMode;
  shuffle: boolean;
  minimized: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: TomoMusicTrack, queue?: TomoMusicTrack[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setLoopMode: (mode: LoopMode) => void;
  setShuffle: (value: boolean) => void;
  setMinimized: (value: boolean) => void;
  seek: (seconds: number) => void;
  refresh: () => Promise<void>;
  likeTrack: (trackId: string) => Promise<void>;
  favoriteTrack: (trackId: string) => Promise<void>;
};

const TomoMusicContext = createContext<TomoMusicContextValue | null>(null);

const STORAGE = {
  volume: "tomomusic.volume",
  track: "tomomusic.current_track",
  time: "tomomusic.current_time",
  loop: "tomomusic.loop",
  shuffle: "tomomusic.shuffle",
  minimized: "tomomusic.minimized",
  session: "tomomusic.session",
};

function getSessionId() {
  if (typeof window === "undefined") return "server";
  let value = localStorage.getItem(STORAGE.session);
  if (!value) {
    value = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE.session, value);
  }
  return value;
}

function isReaderPath(pathname: string) {
  return /^\/(novels|novel|manga|mangas|livros)\/[^/]+\/[^/]+/.test(pathname);
}

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rest = String(s % 60).padStart(2, "0");
  return `${m}:${rest}`;
}

export function TomoMusicProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countedRef = useRef<string | null>(null);
  const [payload, setPayload] = useState<TomoMusicPayload>({ tracks: [], playlists: [], moods: [], stats: { totalTracks: 0, totalSeconds: 0, totalBytes: 0, creditsRequired: 0 } });
  const [currentTrack, setCurrentTrack] = useState<TomoMusicTrack | null>(null);
  const [queue, setQueue] = useState<TomoMusicTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activated, setActivated] = useState(false);
  const [volumeState, setVolumeState] = useState(0.72);
  const [muted, setMutedState] = useState(false);
  const [loopMode, setLoopModeState] = useState<LoopMode>("off");
  const [shuffle, setShuffleState] = useState(false);
  const [minimized, setMinimizedState] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const tracks = payload.tracks;
  const playlists = payload.playlists;

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tomomusic/tracks", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as TomoMusicPayload;
    setPayload(data);
    const savedTrackId = localStorage.getItem(STORAGE.track);
    if (!currentTrack && savedTrackId) {
      const saved = data.tracks.find((track) => track.id === savedTrackId);
      if (saved) {
        setCurrentTrack(saved);
        setQueue(data.tracks);
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    try {
      const savedVolume = Number(localStorage.getItem(STORAGE.volume));
      if (!Number.isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 1) setVolumeState(savedVolume);
      const savedLoop = localStorage.getItem(STORAGE.loop) as LoopMode | null;
      if (savedLoop === "off" || savedLoop === "track" || savedLoop === "playlist") setLoopModeState(savedLoop);
      setShuffleState(localStorage.getItem(STORAGE.shuffle) === "true");
      setMinimizedState(isReaderPath(pathname) || localStorage.getItem(STORAGE.minimized) === "true");
    } catch {}
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isReaderPath(pathname)) setMinimizedState(true);
  }, [pathname]);

  useEffect(() => {
    const onFullscreen = () => {
      if (document.fullscreenElement) setMinimizedState(true);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volumeState;
    audio.muted = muted;
  }, [volumeState, muted]);

  useEffect(() => {
    if (!currentTrack) return;
    try { localStorage.setItem(STORAGE.track, currentTrack.id); } catch {}
  }, [currentTrack]);

  useEffect(() => { try { localStorage.setItem(STORAGE.volume, String(volumeState)); } catch {} }, [volumeState]);
  useEffect(() => { try { localStorage.setItem(STORAGE.loop, loopMode); } catch {} }, [loopMode]);
  useEffect(() => { try { localStorage.setItem(STORAGE.shuffle, String(shuffle)); } catch {} }, [shuffle]);
  useEffect(() => { try { localStorage.setItem(STORAGE.minimized, String(minimized)); } catch {} }, [minimized]);

  const startAudio = useCallback(async (track: TomoMusicTrack, startAt?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    setActivated(true);
    countedRef.current = null;
    if (!audio.src || !audio.src.endsWith(track.file_url)) {
      audio.src = track.file_url;
    }
    audio.preload = "metadata";
    if (typeof startAt === "number" && startAt > 0) audio.currentTime = startAt;
    audio.volume = volumeState;
    audio.muted = muted;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setNotice("Clique em Ativar TomoMusic para liberar o áudio no navegador.");
    }
  }, [muted, volumeState]);

  const playTrack = useCallback((track: TomoMusicTrack, nextQueue?: TomoMusicTrack[]) => {
    const q = nextQueue?.length ? nextQueue : tracks;
    setCurrentTrack(track);
    setQueue(q);
    setMinimizedState(false);
    const savedId = localStorage.getItem(STORAGE.track);
    const savedTime = savedId === track.id ? Number(localStorage.getItem(STORAGE.time) || 0) : 0;
    void startAudio(track, savedTime);
  }, [startAudio, tracks]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack) {
      const first = tracks[0];
      if (first) playTrack(first, tracks);
      return;
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    void startAudio(currentTrack, audio.currentTime || Number(localStorage.getItem(STORAGE.time) || 0));
  }, [currentTrack, isPlaying, playTrack, startAudio, tracks]);

  const chooseNext = useCallback((direction: 1 | -1) => {
    if (!currentTrack) return tracks[0] || null;
    const q = queue.length ? queue : tracks;
    if (!q.length) return null;
    if (shuffle && direction === 1) return q[Math.floor(Math.random() * q.length)] || q[0];
    const idx = Math.max(0, q.findIndex((track) => track.id === currentTrack.id));
    const nextIdx = (idx + direction + q.length) % q.length;
    return q[nextIdx] || q[0];
  }, [currentTrack, queue, shuffle, tracks]);

  const next = useCallback(() => {
    const track = chooseNext(1);
    if (track) playTrack(track, queue.length ? queue : tracks);
  }, [chooseNext, playTrack, queue, tracks]);

  const previous = useCallback(() => {
    const track = chooseNext(-1);
    if (track) playTrack(track, queue.length ? queue : tracks);
  }, [chooseNext, playTrack, queue, tracks]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setCurrentTime(audio.currentTime);
  }, []);

  const setVolume = useCallback((value: number) => setVolumeState(Math.max(0, Math.min(1, value))), []);
  const setMuted = useCallback((value: boolean) => setMutedState(value), []);
  const setLoopMode = useCallback((mode: LoopMode) => setLoopModeState(mode), []);
  const setShuffle = useCallback((value: boolean) => setShuffleState(value), []);
  const setMinimized = useCallback((value: boolean) => setMinimizedState(value), []);

  const recordPlayIfNeeded = useCallback((track: TomoMusicTrack, seconds: number) => {
    if (seconds < 30 || countedRef.current === track.id) return;
    countedRef.current = track.id;
    fetch("/api/tomomusic/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: track.id, sessionId: getSessionId(), secondsListened: Math.floor(seconds) }),
    })
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (data?.counted) {
          setPayload((old) => ({
            ...old,
            tracks: old.tracks.map((item) => item.id === track.id ? { ...item, play_count: item.play_count + 1 } : item),
          }));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime || 0);
      try { localStorage.setItem(STORAGE.time, String(Math.floor(audio.currentTime || 0))); } catch {}
      if (currentTrack) recordPlayIfNeeded(currentTrack, audio.currentTime || 0);
    };
    const onLoaded = () => setDuration(audio.duration || currentTrack?.duration_seconds || 0);
    const onEnded = () => {
      setIsPlaying(false);
      if (loopMode === "track" && currentTrack) {
        audio.currentTime = 0;
        void startAudio(currentTrack, 0);
      } else if ((loopMode === "playlist" || shuffle) && (queue.length || tracks.length)) {
        next();
      }
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("play", () => setIsPlaying(true));
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentTrack, loopMode, next, queue.length, recordPlayIfNeeded, shuffle, startAudio, tracks.length]);

  const mutateTrack = useCallback((trackId: string, patch: Partial<TomoMusicTrack>) => {
    setPayload((old) => ({ ...old, tracks: old.tracks.map((track) => track.id === trackId ? { ...track, ...patch } : track) }));
    setCurrentTrack((old) => old?.id === trackId ? { ...old, ...patch } : old);
  }, []);

  const likeTrack = useCallback(async (trackId: string) => {
    const res = await fetch("/api/tomomusic/like", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackId }) });
    if (res.status === 401) { setNotice("Entre na sua conta para curtir músicas."); return; }
    if (!res.ok) return;
    const data = await res.json();
    mutateTrack(trackId, { liked: data.liked, like_count: data.like_count });
  }, [mutateTrack]);

  const favoriteTrack = useCallback(async (trackId: string) => {
    const res = await fetch("/api/tomomusic/favorite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trackId }) });
    if (res.status === 401) { setNotice("Entre na sua conta para favoritar músicas."); return; }
    if (!res.ok) return;
    const data = await res.json();
    mutateTrack(trackId, { favorited: data.favorited });
  }, [mutateTrack]);

  const value = useMemo<TomoMusicContextValue>(() => ({
    tracks, playlists, currentTrack, queue, isPlaying, activated, volume: volumeState, muted, loopMode, shuffle, minimized,
    currentTime, duration: duration || currentTrack?.duration_seconds || 0,
    playTrack, togglePlay, next, previous, setVolume, setMuted, setLoopMode, setShuffle, setMinimized, seek, refresh, likeTrack, favoriteTrack,
  }), [tracks, playlists, currentTrack, queue, isPlaying, activated, volumeState, muted, loopMode, shuffle, minimized, currentTime, duration, playTrack, togglePlay, next, previous, setVolume, setMuted, setLoopMode, setShuffle, setMinimized, seek, refresh, likeTrack, favoriteTrack]);

  return (
    <TomoMusicContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="none" />
      <TomoMusicPlayer notice={notice} onClearNotice={() => setNotice(null)} />
    </TomoMusicContext.Provider>
  );
}

export function useTomoMusic() {
  const ctx = useContext(TomoMusicContext);
  if (!ctx) throw new Error("useTomoMusic precisa estar dentro de TomoMusicProvider");
  return ctx;
}

function TomoMusicPlayer({ notice, onClearNotice }: { notice: string | null; onClearNotice: () => void }) {
  const music = useTomoMusic();
  const [openList, setOpenList] = useState(false);
  const [query, setQuery] = useState("");
  const current = music.currentTrack;
  const visibleTracks = music.tracks.filter((track) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${track.title} ${track.artist} ${track.mood} ${track.genre}`.toLowerCase().includes(needle);
  }).slice(0, 10);

  if (music.minimized) {
    return (
      <div className="fixed bottom-3 right-3 z-[70] print:hidden sm:bottom-4 sm:right-4">
        <button
          type="button"
          aria-label="Expandir TomoMusic"
          onClick={() => music.setMinimized(false)}
          className="flex h-11 items-center gap-2 rounded-full border border-black/60 bg-black/88 px-3 text-xs font-black text-amber-100 shadow-xl shadow-black/35 backdrop-blur-md transition hover:bg-black"
        >
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-full bg-amber-300/15 text-amber-200", music.isPlaying && "animate-pulse")}>
            <Headphones className="h-4 w-4" />
          </span>
          <span className="inline sm:hidden">♪</span>
          <span className="hidden sm:inline">TomoMusic</span>
          <ChevronUp className="h-3.5 w-3.5 opacity-70" />
        </button>
      </div>
    );
  }

  return (
    <section className="fixed bottom-2 left-2 right-2 z-[70] mx-auto max-w-[360px] print:hidden sm:bottom-4 sm:left-auto sm:right-4 sm:mx-0" aria-label="TomoMusic player global">
      <div className="overflow-hidden rounded-2xl border border-amber-300/18 bg-[#07100d]/96 text-slate-100 shadow-xl shadow-black/45 backdrop-blur-xl">
        <div className="relative p-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={music.togglePlay}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-300 text-slate-950 shadow-lg shadow-amber-950/25 hover:bg-amber-200"
              title={music.isPlaying ? "Pausar" : "Tocar"}
            >
              {music.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">TomoMusic</span>
                {!music.activated ? <span className="text-[10px] text-slate-500">clique p/ ativar</span> : null}
              </div>
              <h3 className="truncate text-xs font-black text-white">{current?.title || "Música ambiente"}</h3>
              <p className="truncate text-[11px] text-slate-500">{current?.artist || "Escolha uma faixa sem sair da leitura"}</p>
            </div>
            <button type="button" onClick={() => setOpenList((v) => !v)} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white" title="Lista"><ListMusic className="h-4 w-4" /></button>
            <button type="button" onClick={() => music.setMinimized(true)} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white" title="Minimizar"><Minimize2 className="h-4 w-4" /></button>
          </div>

          <div className="mt-2">
            <input
              type="range"
              min={0}
              max={Math.max(1, music.duration)}
              value={Math.min(music.currentTime, Math.max(1, music.duration))}
              onChange={(e) => music.seek(Number(e.target.value))}
              className="h-1 w-full accent-amber-300"
              aria-label="Progresso"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-600"><span>{fmt(music.currentTime)}</span><span>{fmt(music.duration)}</span></div>
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={music.previous} className="rounded-full p-1.5 text-slate-300 hover:bg-white/10" title="Anterior"><SkipBack className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={music.next} className="rounded-full p-1.5 text-slate-300 hover:bg-white/10" title="Próxima"><SkipForward className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => music.setShuffle(!music.shuffle)} className={cn("rounded-full p-1.5 hover:bg-white/10", music.shuffle ? "text-amber-200" : "text-slate-500")} title="Embaralhar"><Shuffle className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => music.setLoopMode(music.loopMode === "off" ? "track" : music.loopMode === "track" ? "playlist" : "off")} className={cn("rounded-full p-1.5 hover:bg-white/10", music.loopMode !== "off" ? "text-amber-200" : "text-slate-500")} title="Loop">
                {music.loopMode === "track" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => current && music.likeTrack(current.id)} className={cn("rounded-full p-1.5 hover:bg-white/10", current?.liked ? "text-amber-200" : "text-slate-500")} title="Curtir"><ThumbsUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => current && music.favoriteTrack(current.id)} className={cn("rounded-full p-1.5 hover:bg-white/10", current?.favorited ? "text-rose-300" : "text-slate-500")} title="Favoritar"><Heart className={cn("h-3.5 w-3.5", current?.favorited && "fill-current")} /></button>
              <button type="button" onClick={() => music.setMuted(!music.muted)} className="rounded-full p-1.5 text-slate-500 hover:bg-white/10 hover:text-white" title="Mutar">{music.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</button>
              <input type="range" min={0} max={1} step={0.01} value={music.volume} onInput={(e) => music.setVolume(Number((e.target as HTMLInputElement).value))} onChange={(e) => music.setVolume(Number(e.target.value))} className="w-14 accent-amber-300 sm:w-20" aria-label="Volume" />
            </div>
          </div>
        </div>

        {notice ? (
          <div className="flex items-center justify-between border-t border-amber-300/15 bg-amber-300/10 px-3 py-2 text-[11px] text-amber-50">
            <span>{notice}</span>
            <button type="button" onClick={onClearNotice} className="rounded p-1 hover:bg-white/10"><X className="h-3 w-3" /></button>
          </div>
        ) : null}

        {openList ? (
          <div className="border-t border-white/10 bg-slate-950/88 p-2.5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar música..." className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-xs outline-none focus:border-amber-300/40" />
            </label>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
              {visibleTracks.map((track) => (
                <button key={track.id} type="button" onClick={() => music.playTrack(track, music.tracks)} className={cn("flex w-full items-center gap-2 rounded-xl border p-2 text-left transition hover:bg-white/[0.06]", current?.id === track.id ? "border-amber-300/25 bg-amber-300/10" : "border-white/10 bg-white/[0.03]")}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-amber-200"><Play className="h-3 w-3" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-100">{track.title}</span><span className="block truncate text-[11px] text-slate-500">{track.artist} · {track.mood}</span></span>
                  <span className="text-[10px] text-slate-600">{fmt(track.duration_seconds)}</span>
                </button>
              ))}
            </div>
            <Link href="/tomomusic" className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] font-bold text-amber-100 hover:bg-amber-300/15">
              Abrir catálogo
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
