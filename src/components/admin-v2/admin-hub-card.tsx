import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const toneMap = {
  cyan: "from-cyan-400/20 to-blue-500/10 text-cyan-200 ring-cyan-300/15",
  blue: "from-blue-400/20 to-indigo-500/10 text-blue-200 ring-blue-300/15",
  violet: "from-violet-400/20 to-fuchsia-500/10 text-violet-200 ring-violet-300/15",
  emerald: "from-emerald-400/20 to-teal-500/10 text-emerald-200 ring-emerald-300/15",
  amber: "from-amber-400/20 to-orange-500/10 text-amber-200 ring-amber-300/15",
  rose: "from-rose-400/20 to-red-500/10 text-rose-200 ring-rose-300/15",
  slate: "from-slate-400/10 to-slate-500/5 text-slate-200 ring-slate-300/15",
} as const;

type Tone = keyof typeof toneMap;

export function AdminStatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "cyan",
  href,
  meta,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  meta?: React.ReactNode;
}) {
  const body = (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]">
      <div className={cn("absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl", toneMap[tone])} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">{value}</p>
        </div>
        <div className={cn("rounded-2xl bg-gradient-to-br p-3 ring-1", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {description && <p className="relative mt-4 text-sm text-slate-400">{description}</p>}
      {meta && <div className="relative mt-4">{meta}</div>}
    </div>
  );

  if (!href) return body;
  return <Link href={href}>{body}</Link>;
}

export function AdminActionCard({
  title,
  description,
  href,
  icon: Icon,
  tone = "cyan",
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone?: Tone;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div className={cn("absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl transition group-hover:opacity-90", toneMap[tone])} />
      <div className="relative flex items-start justify-between gap-4">
        <div className={cn("rounded-2xl bg-gradient-to-br p-3 ring-1", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:text-slate-200" />
      </div>
      <div className="relative mt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          {badge}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
      </div>
    </Link>
  );
}

export function MetricPill({ label, value, tone = "slate" }: { label: string; value: React.ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", toneMap[tone].split(" ")[2])}>{value}</p>
    </div>
  );
}
