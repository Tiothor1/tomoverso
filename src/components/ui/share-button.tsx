"use client";

import { Share2, Check, MessageCircle, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

interface ShareButtonProps {
  title: string;
  url: string;
  description?: string;
}

export function ShareButton({ title, url, description }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fullUrl = `https://tomoverso.studio${url}`;
  const text = `${title} — Leia na Tomo Verso Editora`;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${fullUrl}`)}`, "_blank");
    }
    setOpen(false);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${fullUrl}`)}`, "_blank");
    setOpen(false);
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(text)}`, "_blank");
    setOpen(false);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`, "_blank");
    setOpen(false);
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, text: description ? `${text}\n\n${description}` : text, url: fullUrl });
      } catch { /* user cancelled */ }
    }
    setOpen(false);
  };

  if (copied) {
    return (
      <Button variant="outline" size="sm" className="gap-2 border-zinc-700 bg-zinc-800/50">
        <Check className="h-4 w-4 text-emerald-400" /> Link copiado!
      </Button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-2 border-zinc-700 hover:bg-zinc-800"
      >
        <Share2 className="h-4 w-4" /> Compartilhar <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50 py-1">
          <button onClick={shareWhatsApp} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors">
            <MessageCircle className="h-4 w-4 text-emerald-400" /> WhatsApp
          </button>
          <button onClick={shareTelegram} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors">
            <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.127.087.654.087.654s.275 2.624.416 4.143c.05.544-.11.774-.313.819-.394.09-.67-.155-.67-.155s-1.248-.994-2.664-1.773c-.29-.16-.467-.018-.502.006a1.16 1.16 0 00-.364.722c-.064.465-.52 1.694-.52 1.694s-.042.122-.14.202c-.1.083-.25.063-.25.063l-.023.004c-.332-.085-1.523-.52-2.319-.991-1.01-.582-1.795-1.37-1.7-1.487.094-.118.285-.137.417-.137.124-.005.476.01.476.01s1.052.01 1.876.612c.39.286.669.672.769.927.169.387.356.459.607.384.203-.06.33-.222.393-.348.114-.224.366-.73.566-1.177.095-.212.2-.428.319-.613.378-.587.772-1.047.772-1.175s-.058-.172-.164-.15c-.106.022-1.54.535-1.54.535s-.248.085-.572.037c-.05-.009-.106-.024-.163-.045-.456-.155-2.635-.912-2.73-.963-.09-.047-.248-.14-.258-.287-.01-.155.13-.248.13-.248s.194-.098.462-.176c.117-.036.758-.237 2.174-.566 1.328-.31 2.345-.506 2.737-.547.45-.048.882.024.882.024z"/></svg>
            Telegram
          </button>
          <button onClick={shareTwitter} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors">
            <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Twitter / X
          </button>
          <div className="border-t border-zinc-700/50 my-1" />
          <button onClick={copyLink} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors">
            <Copy className="h-4 w-4 text-zinc-400" /> Copiar link
          </button>
          {typeof navigator !== "undefined" && navigator.share && (
            <button onClick={shareNative} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors">
              <Share2 className="h-4 w-4 text-zinc-400" /> Mais opções
            </button>
          )}
        </div>
      )}
    </div>
  );
}
