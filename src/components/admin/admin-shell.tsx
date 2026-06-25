import type { ReactNode } from "react";

export function AdminShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-2xl shadow-primary/5">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">{eyebrow}</p>
        ) : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
            {description ? <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
