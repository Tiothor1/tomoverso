"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockNovels, mockChapters } from "@/lib/data/mock-novels";

interface ContinueReading {
  novelSlug: string;
  novelTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  coverColor: string;
  progress: number;
  savedAt: string;
}

export function ContinueReadingBanner() {
  const [data, setData] = useState<ContinueReading | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("tomoverso-continue-reading");
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {}
    }
  }, []);

  if (!data || dismissed) return null;

  return (
    <div className="continue-reading-banner border-b border-border/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        <div className="p-2 rounded-md bg-primary/20 flex-shrink-0">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">Continue de onde parou</div>
          <div className="font-medium truncate">
            {data.novelTitle} · Cap {data.chapterNumber}: {data.chapterTitle}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${data.progress}%` }}
            />
          </div>
          <span>{data.progress}%</span>
        </div>
        <Button asChild size="sm" className="flex-shrink-0">
          <Link href={`/novels/${data.novelSlug}/${data.chapterNumber}`}>
            Continuar
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="h-8 w-8 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
