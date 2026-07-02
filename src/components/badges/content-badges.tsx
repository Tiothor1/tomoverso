"use client";

import { BadgeCheck, Flag, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OriginalBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

export function OriginalBadge({ size = "sm", className, showTooltip = true }: OriginalBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold uppercase tracking-wider",
        "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        "shadow-[0_0_10px_rgba(52,211,153,0.15)]",
        sizeClasses[size],
        className
      )}
      title={showTooltip ? "Obra original publicada diretamente no Tomo Verso Editora" : undefined}
    >
      <BadgeCheck className={cn(size === "sm" ? "h-2.5 w-2.5" : size === "md" ? "h-3 w-3" : "h-4 w-4")} />
      Original
    </span>
  );
}

interface CurationBadgeProps {
  label: "em_alta" | "novidade_br" | "autor_revelacao";
  size?: "sm" | "md";
  className?: string;
}

const curationConfig = {
  em_alta: {
    text: "Em alta",
    icon: "🔥",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.15)]",
  },
  novidade_br: {
    text: "Novidade BR",
    icon: "✨",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.15)]",
  },
  autor_revelacao: {
    text: "Autor Revelação",
    icon: "⭐",
    className: "border-violet-500/30 bg-violet-500/10 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.15)]",
  },
};

export function CurationBadge({ label, size = "sm", className }: CurationBadgeProps) {
  const config = curationConfig[label];
  const sizeClasses = {
    sm: "text-[9px] px-2 py-0.5 gap-1",
    md: "text-xs px-3 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-black uppercase tracking-[0.14em] backdrop-blur",
        sizeClasses[size],
        config.className,
        className
      )}
    >
      <span className="text-[1.1em]">{config.icon}</span>
      {config.text}
    </span>
  );
}

export function ReportCopyrightButton({ workType, workId }: { workType: "novel" | "manga"; workId: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const subject = encodeURIComponent(`[Tomo Verso Editora] Denúncia de plágio - ${workType}:${workId}`);
        window.open(`mailto:${window.location.hostname.includes("localhost") ? "suporte@tomoverso.com.br" : "suporte@tomoverso.com.br"}?subject=${subject}`, "_blank");
      }}
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-red-400 transition-colors"
      title="Denunciar obra copiada"
    >
      <Flag className="h-2.5 w-2.5" />
      Denunciar plágio
    </button>
  );
}
