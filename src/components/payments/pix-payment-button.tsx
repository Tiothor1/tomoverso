"use client";

import { useState } from "react";
import { Copy, QrCode, Check, X } from "lucide-react";

interface PixPaymentButtonProps {
  planId: string;
}

export function PixPaymentButton({ planId }: PixPaymentButtonProps) {
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
    } catch {}
  }

  if (pixData) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="relative">
          <img
            src={`data:image/png;base64,${pixData.qrCodeBase64}`}
            alt="QR Code PIX"
            className="h-48 w-48 rounded-xl border border-border"
          />
          <button
            type="button"
            onClick={() => setPixData(null)}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
            aria-label="Fechar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={copyPix}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
        >
          {copied ? (
            <><Check className="h-4 w-4" /> Copiado!</>
          ) : (
            <><Copy className="h-4 w-4" /> Copiar código PIX</>
          )}
        </button>
        <p className="text-xs text-muted-foreground">Abra o app do seu banco, escaneie o QR Code ou cole o código.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handlePix}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 py-3 text-sm font-bold text-green-400 transition hover:bg-green-500/20 disabled:opacity-50"
      >
        {loading ? (
          "Gerando PIX..."
        ) : (
          <>
            <QrCode className="h-4 w-4" />
            Pagar via PIX
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
