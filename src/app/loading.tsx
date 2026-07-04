import { BookOpen, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="glass-panel flex max-w-sm flex-col items-center rounded-3xl p-8 text-center">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary">
          <BookOpen className="h-7 w-7" />
          <Loader2 className="absolute -right-1 -top-1 h-5 w-5 animate-spin text-[var(--tomo-gold)]" />
        </div>
        <p className="font-heading text-base font-black">Abrindo o próximo tomo...</p>
        <p className="mt-1 text-sm text-muted-foreground">Só um instante enquanto organizamos a estante.</p>
      </div>
    </div>
  );
}
