"use client";

import { useState } from "react";
import { Copy, QrCode, Check, X } from "lucide-react";

interface PixPaymentButtonProps {
  planId: string;
  className?: string;
}

export function PixPaymentButton({ planId, className = "" }: PixPaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; qrCodeText: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handlePix() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/payments/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const j = await r.json();
      if (j.ok && j.qrCodeBase64) {
        setPixData({ qrCodeBase64: j.qrCodeBase64, qrCodeText: j.qrCodeText });
      } else if (r.status === 401) {
        setError("Entre na sua conta para gerar o PIX.");
      } else {
        setError("Erro ao gerar PIX. Tente novamente.");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPix() {
    if (!pixData) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setError("Não foi possível copiar o código PIX.");
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={handlePix}
        disabled={loading}
        className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-green-500/40 bg-green-500/10 px-2 text-xs font-bold text-green-500 transition hover:bg-green-500/20 disabled:opacity-50 ${className}`}
      >
        {loading ? (
          "Gerando PIX..."
        ) : (
          <>
            <QrCode className="h-4 w-4 shrink-0" />
            <span>Pagar via PIX</span>
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-400" role="status">{error}</p>}

      {pixData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-label="Pagamento via PIX">
          <div className="relative w-full max-w-sm rounded-2xl border border-border/80 bg-card p-5 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setPixData(null)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Fechar pagamento PIX"
            >
              <X className="h-4 w-4" />
            </button>
            <QrCode className="mx-auto mb-2 h-5 w-5 text-green-500" />
            <h2 className="font-heading text-lg font-bold">Pague com PIX</h2>
            <p className="mt-1 text-sm text-muted-foreground">Escaneie o QR Code no app do seu banco ou copie o código.</p>
            {/* Data-URL do Mercado Pago não usa o otimizador remoto do Next.js. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${pixData.qrCodeBase64}`}
              alt="QR Code PIX"
              className="mx-auto my-4 h-48 w-48 rounded-xl border border-border bg-white p-1"
            />
            <button
              type="button"
              onClick={copyPix}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              {copied ? (
                <><Check className="h-4 w-4" /> Copiado!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copiar código PIX</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
