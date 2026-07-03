import { cn } from "@/lib/utils";

export function AdminHubSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">{eyebrow}</p>}
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-50">{title}</h2>
          {description && <p className="mt-1 max-w-3xl text-sm text-slate-400">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function AdminPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5", className)}>
      {children}
    </div>
  );
}
