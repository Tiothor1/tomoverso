import { BookOpen, Feather, LibraryBig, Search, Sparkles } from "lucide-react";

type SkeletonProps = { className?: string };

function Skeleton({ className = "" }: SkeletonProps) {
  return <div data-slot="skeleton" className={`rounded-2xl ${className}`} />;
}

function LoadingHeader({ label = "Tomo Verso", title = "Abrindo o próximo tomo...", text = "Só um instante enquanto organizamos a estante." }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
        <BookOpen className="h-6 w-6" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-primary/80">{label}</p>
      <h1 className="mt-2 font-heading text-2xl font-black tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">{text}</p>
    </div>
  );
}

function CardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="neon-card overflow-hidden rounded-[1.7rem] border bg-card/80 p-3">
      <Skeleton className={compact ? "aspect-[3/2]" : "aspect-[2/3]"} />
      <div className="space-y-2 pt-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function GlobalRouteLoading() {
  return (
    <section className="aurora-bg min-h-[72vh] px-4 py-14">
      <LoadingHeader />
      <div className="container mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_360px]">
        <div className="glass-panel rounded-[2rem] p-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-5 h-12 w-11/12" />
          <Skeleton className="mt-3 h-12 w-8/12" />
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
        <div className="glass-panel rounded-[2rem] p-4">
          <Skeleton className="h-6 w-40" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-border/45 p-2">
                <Skeleton className="h-16 w-12 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CatalogRouteLoading({ title = "Montando o catálogo...", label = "Catálogo" }: { title?: string; label?: string }) {
  return (
    <section className="min-h-[72vh] px-4 py-10">
      <div className="container mx-auto max-w-7xl">
        <LoadingHeader label={label} title={title} text="Separando obras, capas e capítulos sem puxar a biblioteca inteira de uma vez." />
        <div className="glass-panel mb-6 rounded-[2rem] p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_repeat(3,9rem)]">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => <CardSkeleton key={index} />)}
        </div>
      </div>
    </section>
  );
}

export function FeedRouteLoading() {
  return (
    <section className="min-h-dvh bg-black px-4 py-8 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:grid lg:grid-cols-[260px_minmax(0,1fr)_260px]">
        <aside className="hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 lg:block">
          <Skeleton className="h-6 w-32 bg-white/10" />
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-12 bg-white/10" />)}
          </div>
        </aside>
        <main className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[2.2rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/70">
          <div className="p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-400/10 text-fuchsia-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-36 bg-white/10" />
                <Skeleton className="h-3 w-24 bg-white/10" />
              </div>
            </div>
            <Skeleton className="aspect-[9/16] max-h-[72dvh] w-full bg-white/10" />
          </div>
        </main>
        <aside className="hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 lg:block">
          <Skeleton className="h-6 w-36 bg-white/10" />
          <div className="mt-5 space-y-3">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 bg-white/10" />)}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function WorkDetailRouteLoading({ kind = "obra" }: { kind?: string }) {
  return (
    <section className="aurora-bg min-h-[72vh] px-4 py-10">
      <div className="container mx-auto grid max-w-6xl gap-8 lg:grid-cols-[320px_1fr]">
        <div className="glass-panel rounded-[2rem] p-4">
          <Skeleton className="aspect-[2/3]" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-11 rounded-full" />
            <Skeleton className="h-11 rounded-full" />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary">
              <Feather className="h-3.5 w-3.5" /> carregando {kind}
            </p>
            <Skeleton className="mt-5 h-12 w-4/5" />
            <Skeleton className="mt-3 h-8 w-2/5" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-9/12" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="glass-panel rounded-[2rem] p-5">
            <Skeleton className="h-6 w-44" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-14" />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LibraryRouteLoading() {
  return (
    <section className="min-h-[72vh] px-4 py-10">
      <div className="container mx-auto max-w-6xl">
        <LoadingHeader label="Estante" title="Abrindo sua biblioteca..." text="Separando leituras salvas, progresso e próximos capítulos." />
        <div className="grid gap-5 md:grid-cols-[280px_1fr]">
          <div className="glass-panel rounded-[2rem] p-5">
            <LibraryBig className="mb-4 h-8 w-8 text-primary" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} compact />)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AuthRouteLoading() {
  return (
    <section className="aurora-bg flex min-h-[72vh] items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-md rounded-[2rem] p-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary">
          <Search className="h-6 w-6" />
        </div>
        <Skeleton className="mx-auto mt-5 h-7 w-56" />
        <Skeleton className="mx-auto mt-3 h-4 w-64" />
        <div className="mt-7 space-y-4 text-left">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      </div>
    </section>
  );
}
