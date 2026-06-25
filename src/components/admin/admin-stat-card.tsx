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
    <Card className="overflow-hidden rounded-3xl border-border/50 bg-card/85 shadow-lg shadow-black/5">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          {icon ? <div className="rounded-2xl bg-primary/10 p-2 text-primary">{icon}</div> : null}
        </div>
        <div className="text-3xl font-black tracking-tight">{value}</div>
        {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
