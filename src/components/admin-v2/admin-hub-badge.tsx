import { cn } from "@/lib/utils";

const toneClasses = {
  cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200 shadow-cyan-950/40",
  blue: "border-blue-400/25 bg-blue-400/10 text-blue-200 shadow-blue-950/40",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-200 shadow-violet-950/40",
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200 shadow-emerald-950/40",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-200 shadow-amber-950/40",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-200 shadow-rose-950/40",
  slate: "border-slate-500/25 bg-slate-500/10 text-slate-200 shadow-slate-950/40",
} as const;

type Tone = keyof typeof toneClasses;

export function AdminStatusBadge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none shadow-sm backdrop-blur",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
