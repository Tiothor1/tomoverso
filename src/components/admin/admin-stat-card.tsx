import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function AdminStatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-border/50 bg-card/85 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
          {icon ? <div className="rounded-lg bg-primary/10 p-1.5 text-primary">{icon}</div> : null}
        </div>
        <div className="text-2xl font-black tracking-tight">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
