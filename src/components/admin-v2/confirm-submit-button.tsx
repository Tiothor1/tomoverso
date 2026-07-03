"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  default: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15",
  danger: "border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
  success: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15",
  warning: "border-amber-300/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15",
  ghost: "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]",
} as const;

export function ConfirmSubmitButton({
  children,
  message,
  pendingLabel = "Processando...",
  variant = "default",
  className,
  title,
}: {
  children: React.ReactNode;
  message: string;
  pendingLabel?: string;
  variant?: keyof typeof variants;
  className?: string;
  title?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60",
        variants[variant],
        className,
      )}
    >
      {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {pendingLabel}</> : children}
    </button>
  );
}
