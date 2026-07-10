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
    <div className="space-y-5">
      {/* Hero header */}
      <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 px-5 py-4 shadow-sm">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
