"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminUploadZone({ redirectTo }: { redirectTo: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function upload(form: HTMLFormElement) {
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData(form);
      const res = await fetch("/api/admin/uploads", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Falha ao enviar arquivo.");
      setMessage({ type: "success", text: `Arquivo enviado para análise${data.title ? `: ${data.title}` : ""}.` });
      window.setTimeout(() => {
        window.location.href = redirectTo;
      }, 900);
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "Erro ao enviar arquivo." });
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        upload(event.currentTarget);
      }}
    >
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            inputRef.current.files = dt.files;
            setFileName(file.name);
          }
        }}
        className={cn(
          "cursor-pointer rounded-3xl border border-dashed p-8 text-center transition",
          dragging
            ? "border-cyan-300/60 bg-cyan-300/10"
            : "border-white/15 bg-white/[0.03] hover:border-cyan-300/30 hover:bg-cyan-300/[0.04]",
        )}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          {fileName ? <FileText className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
        </div>
        <h3 className="text-base font-semibold text-slate-100">
          {fileName || "Arraste o arquivo aqui ou clique para selecionar"}
        </h3>
        <p className="mt-2 text-sm text-slate-400">PDF, TXT, EPUB, DOCX ou MD · até 50MB</p>
        <input
          ref={inputRef}
          type="file"
          name="file"
          required
          accept=".pdf,.txt,.epub,.docx,.md"
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
        />
      </div>

      {message && (
        <div className={cn("flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm", message.type === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-rose-400/20 bg-rose-400/10 text-rose-100")}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando para análise...</> : <><UploadCloud className="h-4 w-4" /> Enviar para análise</>}
      </button>
    </form>
  );
}
