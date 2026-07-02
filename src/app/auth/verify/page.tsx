"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowRight, Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError("");

    // Auto-advance to next field
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (newDigits.every(d => d) && newDigits.join("").length === 6) {
      submitCode(newDigits.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < text.length; i++) {
      newDigits[i] = text[i];
    }
    setDigits(newDigits);
    if (text.length === 6) {
      submitCode(text);
    }
  }

  async function submitCode(code: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setError(data.error || "Código inválido");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Erro ao verificar. Tente novamente.");
    }
    setLoading(false);
  }

  async function handleResend() {
    if (countdown > 0) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setCountdown(60);
        setError("");
      } else {
        setError(data.error || "Erro ao reenviar");
      }
    } catch {
      setError("Erro ao reenviar código");
    }
    setResending(false);
  }

  if (!email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Email não informado.</p>
            <Button asChild className="mt-4"><Link href="/auth/signup">Criar conta</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Email verificado!</h2>
            <p className="text-muted-foreground mb-4">Redirecionando para o painel...</p>
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <BookOpen className="h-7 w-7 text-primary" />
            <span className="font-heading text-2xl font-bold">Tomo Verso Editora</span>
           </Link>
           <h1 className="font-heading text-3xl font-bold">Verifique seu email</h1>
          <p className="text-muted-foreground text-sm">
            Enviamos um código de 6 dígitos para<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center justify-center gap-2 mb-6" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="h-14 w-12 rounded-xl border-2 border-border bg-card text-center text-2xl font-bold outline-none transition-colors focus:border-primary"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md p-3 mb-4 text-center">
                {error}
              </div>
            )}

            <div className="text-center">
              <Button
                onClick={handleResend}
                variant="link"
                className="text-sm text-muted-foreground"
                disabled={resending || countdown > 0}
              >
                {resending ? "Reenviando..." :
                 countdown > 0 ? `Reenviar em ${countdown}s` :
                 "Reenviar código"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          O código expira em 10 minutos e pode ser usado apenas uma vez.
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}
