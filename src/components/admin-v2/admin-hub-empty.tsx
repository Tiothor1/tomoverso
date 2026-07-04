import { AlertTriangle, Loader2, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminEmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("admin-hub-empty rounded-3xl p-10 text-center", className)}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{description}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/15"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function AdminErrorState({ error, backHref }: { error?: unknown; backHref: string }) {
  return (
    <div className="rounded-3xl border border-rose-500/20 bg-rose-950/20 p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-200">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-100">Erro ao carregar esta área</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-rose-200/65">
        A tela foi protegida contra quebra total. Revise os dados/tabelas deste ambiente e tente novamente.
      </p>
      {error ? <p className="mx-auto mt-4 max-w-2xl truncate rounded-xl border border-rose-500/10 bg-black/20 px-3 py-2 font-mono text-xs text-rose-200/45">{String(error).slice(0, 220)}</p> : null}
      <Link href={backHref} className="mt-5 inline-flex rounded-full border border-rose-300/20 bg-rose-300/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-300/15">
        Voltar ao hub
      </Link>
    </div>
  );
}

export function AdminLoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-300">
      <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-cyan-300" />
      {label}
    </div>
  );
}
