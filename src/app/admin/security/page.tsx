"use client";

import { useState, useCallback } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sendAdminOTPCodeAction, verifyAdminOTPCodeAction, getAdminOTPStatusAction } from "@/lib/actions/admin-2fa-actions";
import { Mail, KeyRound, CheckCircle2, XCircle, Loader2, AlertTriangle, Clock } from "lucide-react";

export default function SecurityPage() {
  const [step, setStep] = useState<"loading" | "idle" | "sent" | "verified" | "error">("loading");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [cooldownMinutes, setCooldownMinutes] = useState(0);

  // Load validation status on mount
  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    getAdminOTPStatusAction().then((status) => {
      setStep(status.validated ? "verified" : "idle");
      setLoaded(true);
    }).catch(() => {
      setStep("error");
      setLoaded(true);
    });
  }

  const handleSendCode = useCallback(async () => {
    setError("");
    setStep("loading");
    const result = await sendAdminOTPCodeAction();
    if (!result.ok) {
      if (result.cooldownMinutes) {
        setCooldownMinutes(result.cooldownMinutes);
      }
      setError(result.error || "Erro ao enviar código");
      setStep("idle");
      return;
    }
    setMessage("Código enviado para tomoversoeditora@gmail.com ✅");
    setStep("sent");
    // Countdown visual de 5 min
    setCountdown(300);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleVerify = useCallback(async () => {
    if (!token || token.length < 6) { setError("Digite o código de 6 dígitos"); return; }
    setError("");
    setStep("loading");
    const result = await verifyAdminOTPCodeAction(token);
    if (!result.ok) {
      setError(result.error || "Código inválido");
      setStep("sent");
      return;
    }
    setMessage("Acesso verificado com sucesso! ✅");
    setStep("verified");
    // Verifica se veio do redirect de verify
    const params = new URLSearchParams(window.location.search);
    if (params.get("verify") === "1") {
      setTimeout(() => { window.location.href = "/admin"; }, 800);
    }
  }, [token]);

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <AdminShell
      eyebrow="segurança"
      title="Autenticação em duas etapas (2FA)"
      description="Proteja o painel administrativo com um código enviado por email além da sua senha."
    >
      {/* STEP: Error */}
      {step === "error" && (
        <Card className="rounded-xl border-red-500/30">
          <CardContent className="p-6 text-center">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <p className="font-medium">Erro ao carregar status.</p>
            <Button className="mt-4 rounded-lg" variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {/* STEP: Loading */}
      {step === "loading" && (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aguarde...</p>
          </CardContent>
        </Card>
      )}

      {/* STEP: Idle — código não enviado ainda */}
      {step === "idle" && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Verificação em duas etapas</CardTitle>
            </div>
            <CardDescription>
              Um código de 6 dígitos será enviado para <strong>tomoversoeditora@gmail.com</strong>.
              Você precisa deste código sempre que fizer login no admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cooldownMinutes > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Limite atingido. Aguarde {cooldownMinutes} minuto(s).</span>
              </div>
            )}
            <Button
              onClick={handleSendCode}
              className="rounded-lg"
              disabled={cooldownMinutes > 0}
            >
              <Mail className="mr-2 h-4 w-4" /> Enviar código por email
            </Button>
            {error && !cooldownMinutes && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP: Sent — código enviado, aguardando digitação */}
      {step === "sent" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-base">Código enviado ✅</CardTitle>
              </div>
              <CardDescription>
                Enviamos um código de 6 dígitos para <strong>tomoversoeditora@gmail.com</strong>.
                Verifique sua caixa de entrada (e spam).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {countdown > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Clock className="h-4 w-4" />
                  <span>Código expira em {formatCountdown(countdown)}</span>
                </div>
              )}
              <Button variant="outline" size="sm" className="rounded-lg" onClick={handleSendCode}>
                Reenviar código
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Digite o código</CardTitle>
              </div>
              <CardDescription>
                Digite os 6 dígitos recebidos por email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                placeholder="000000"
                className="mb-3 w-full rounded-lg border border-border/60 bg-background px-3 py-3 text-center text-2xl font-mono tracking-[0.3em]"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                autoFocus
              />
              {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
              <Button onClick={handleVerify} className="w-full rounded-lg" disabled={token.length < 6}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Verificar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP: Verified — 2FA ativo */}
      {step === "verified" && (
        <Card className="rounded-xl border-emerald-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base">Acesso verificado ✅</CardTitle>
            </div>
            <CardDescription>
              Você já validou o acesso ao admin nesta sessão. O código é solicitado a cada 7 dias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="rounded-lg" onClick={handleSendCode}>
              Testar envio de código
            </Button>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
