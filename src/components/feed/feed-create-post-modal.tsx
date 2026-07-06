"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Loader2, PenLine, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FeedWorkOption, FeedWorkType } from "@/lib/feed/types";

type Props = {
  open: boolean;
  isLoggedIn: boolean;
  workOptions: FeedWorkOption[];
  onClose: () => void;
  onCreate: (input: { title?: string; body: string; workType?: FeedWorkType | ""; workId?: string; type?: string }) => Promise<boolean>;
};

export function FeedCreatePostModal({ open, isLoggedIn, workOptions, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("post");
  const [workValue, setWorkValue] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedWork = useMemo(() => {
    if (!workValue) return { workType: "" as const, workId: "" };
    const [workType, ...rest] = workValue.split(":");
    return { workType: workType as FeedWorkType, workId: rest.join(":") };
  }, [workValue]);

  if (!open) return null;

  function submit() {
    setError("");
    startTransition(async () => {
      const ok = await onCreate({ title, body, type, workType: selectedWork.workType, workId: selectedWork.workId });
      if (ok) {
        setTitle("");
        setBody("");
        setWorkValue("");
        setType("post");
        onClose();
      } else {
        setError("Não consegui publicar. Confere se você está logado e escreveu algo.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[140] bg-black/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar criar post" className="absolute inset-0" onClick={onClose} />
      <section className="relative mx-auto mt-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/80">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-4 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

        <header className="relative flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-fuchsia-300">
              <PenLine className="h-4 w-4" /> criar postagem
            </p>
            <h2 className="mt-2 font-heading text-2xl font-black">Publica no Tomo Verso Editora</h2>
            <p className="mt-1 text-sm text-white/55">Post curto, review, teaser ou chamada para a sua própria novel/mangá/manhwa.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="relative space-y-4 p-5">
          <div className="rounded-3xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-4 text-sm text-fuchsia-50">
            <p className="font-bold">Sua obra também pode aparecer aqui.</p>
            <p className="mt-1 text-white/65">Publique capítulos pelo painel e use posts para chamar leitores para suas páginas, cenas, reviews e novidades.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" className="rounded-full bg-white text-black hover:bg-fuchsia-100">
                <Link href="/dashboard/novels/new">Criar minha novel</Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="rounded-full bg-white/10 text-white hover:bg-white/15">
                <Link href="/dashboard">Meu painel</Link>
              </Button>
            </div>
          </div>

          {!isLoggedIn ? (
            <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-50">
              Você precisa entrar para criar postagem.
              <Button asChild className="mt-4 w-full rounded-2xl bg-white text-black hover:bg-amber-100">
                <Link href="/auth/login?redirect=/feed">Entrar</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título curto (opcional)"
                  maxLength={120}
                  className="border-white/10 bg-white/[0.06] text-white placeholder:text-white/35"
                />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-10 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-fuchsia-400"
                >
                  <option className="bg-zinc-950" value="post">Post</option>
                  <option className="bg-zinc-950" value="review">Review curta</option>
                </select>
              </div>

              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ex: Publiquei uma cena nova / Essa página ficou insana / Se você curte fantasia sombria, começa por aqui..."
                maxLength={1200}
                className="min-h-40 resize-none border-white/10 bg-white/[0.06] text-white placeholder:text-white/35"
              />

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/50">Obra relacionada</label>
                <select
                  value={workValue}
                  onChange={(e) => setWorkValue(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-fuchsia-400"
                >
                  <option className="bg-zinc-950" value="">Sem obra específica</option>
                  {workOptions.map((work) => (
                    <option key={`${work.type}:${work.id}`} className="bg-zinc-950" value={`${work.type}:${work.id}`}>
                      {work.label}
                    </option>
                  ))}
                </select>
              </div>

              {error ? <p className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={onClose} className="rounded-2xl bg-white/10 text-white hover:bg-white/15">
                  Cancelar
                </Button>
                <Button type="button" onClick={submit} disabled={isPending || body.trim().length < 3} className="rounded-2xl bg-white px-5 font-black text-black hover:bg-fuchsia-100">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Publicar
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
