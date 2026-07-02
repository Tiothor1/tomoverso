"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContestRegistrationFormProps {
  contestId: string;
  workType: "novel" | "manga";
}

export default function ContestRegistrationForm({
  contestId,
  workType,
}: ContestRegistrationFormProps) {
  const [workId, setWorkId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!workId.trim()) {
        setError("Selecione ou informe o ID da obra.");
        return;
      }

      startTransition(async () => {
        try {
          const res = await fetch("/api/contest/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contest_id: contestId,
              work_type: workType,
              work_id: workId.trim(),
              notes: notes.trim() || undefined,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            setError(data.error || "Erro ao enviar inscrição.");
            return;
          }

          setSuccess(true);
          router.refresh();
        } catch {
          setError("Erro de conexão. Tente novamente.");
        }
      });
    },
    [contestId, workType, workId, notes, router],
  );

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-400">
        Inscrição realizada com sucesso! Boa sorte no concurso.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-medium">Inscrever obra neste concurso</p>

      <div>
        <label
          htmlFor="work-id"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          ID da {workType === "manga" ? "mangá" : "light novel"}
        </label>
        <input
          id="work-id"
          type="text"
          value={workId}
          onChange={(e) => setWorkId(e.target.value)}
          placeholder="Ex: o-que-eu-desenhei-existe"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          O slug da obra (o mesmo que aparece na URL).
        </p>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Observações (opcional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Alguma nota para os organizadores..."
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? (
          <>
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="mr-1 h-3.5 w-3.5" />
            Inscrever obra
          </>
        )}
      </Button>
    </form>
  );
}
