"use client";

import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ShareButtonProps {
  title: string;
  url: string;
  description?: string;
}

export function ShareButton({ title, url, description }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = `https://tomoverso.studio${url}`;
  const text = `${title} — Leia na Tomo Verso Editora`;

  const shareData = {
    title: text,
    text: description ? `${text}\n\n${description}` : text,
    url: fullUrl,
  };

  const handleShare = async () => {
    // Try native share (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or native share failed
      }
    }

    // Fallback: copy link
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Final fallback
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${fullUrl}`)}`, "_blank");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-2 border-zinc-700 hover:bg-zinc-800"
    >
      {copied ? (
        <><Check className="h-4 w-4 text-emerald-400" /> Link copiado!</>
      ) : (
        <><Share2 className="h-4 w-4" /> Compartilhar</>
      )}
    </Button>
  );
}
