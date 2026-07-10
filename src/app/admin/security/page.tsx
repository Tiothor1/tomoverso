"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { setup2FAAction, disable2FAAction, verify2FAAction, get2FAStatusAction } from "@/lib/actions/admin-2fa-actions";
import { Shield, Smartphone, KeyRound, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function SecurityPage() {
  const searchParams = useSearchParams();
  const needsVerify = searchParams.get("verify") === "1";
  const [step, setStep] = useState<"loading" | "setup" | "verify" | "active" | "error">("loading");
  const [secret, setSecret] = useState<string>("");
  const [otpauthUrl, setOtpauthUrl] = useState<string>("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [qrReady, setQrReady] = useState(false);

  // Load 2FA status on mount
  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    get2FAStatusAction().then((status) => {
      if (needsVerify && status.enabled) {
        // 2FA is enabled but user needs to verify — go straight to code entry
        setStep("verify");
      } else {
        setStep(status.enabled ? "active" : "setup");
      }
      setLoaded(true);
    }).catch(() => {
      setStep("error");
      setLoaded(true);
    });
  }

  const handleSetup = useCallback(async () => {
    setError("");
    setStep("loading");
    const result = await setup2FAAction();
    if (!result.ok) {
      setError(result.error || "Erro ao configurar 2FA");
      setStep("setup");
      return;
    }
    setSecret(result.secret || "");
    setOtpauthUrl(result.otpauth_url || "");
    setStep("verify");
  }, []);

  const handleVerify = useCallback(async () => {
    if (!token) { setError("Digite o código do app"); return; }
    setError("");
    const fd = new FormData();
    fd.set("token", token);
    const result = await verify2FAAction(fd);
    if (!result.ok) {
      setError(result.error || "Código inválido");
      return;
    }
    setMessage("2FA verificado! ✅");
    if (needsVerify) {
      window.location.href = "/admin";
    } else {
      setStep("active");
    }
  }, [token, needsVerify]);

  const handleDisable = useCallback(async () => {
    if (!confirm("Tem certeza? Desativar o 2FA reduz a segurança do admin.")) return;
    await disable2FAAction();
    setStep("setup");
    setMessage("");
  }, []);

  return (
    <AdminShell
      eyebrow="segurança"
      title="Autenticação de dois fatores (2FA)"
      description="Proteja o painel administrativo com um segundo fator além da senha."
    >
      {/* STEP: Error */}
      {step === "error" && (
        <Card className="rounded-xl border-red-500/30">
          <CardContent className="p-6 text-center">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <p className="font-medium">Não foi possível carregar o status do 2FA.</p>
            <Button className="mt-4 rounded-lg" variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {/* STEP: Loading */}
      {step === "loading" && (
        <Card className="rounded-xl">
          <CardContent className="p-6 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verificando configuração...</p>
          </CardContent>
        </Card>
      )}

      {/* STEP: Setup (2FA not configured) */}
      {step === "setup" && (
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-base">2FA não configurado</CardTitle>
            </div>
            <CardDescription>
              Ative a autenticação de dois fatores para adicionar uma camada extra de segurança.
              Mesmo que alguém descubra sua senha, não conseguirá acessar sem o código do seu celular.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSetup} className="rounded-lg">
              <Shield className="mr-2 h-4 w-4" /> Ativar 2FA
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP: Verify (first time — scan QR + confirm) */}
      {step === "verify" && (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Escaneie o QR code</CardTitle>
              </div>
              <CardDescription>
                Abra seu aplicativo autenticador (Google Authenticator, Authy, etc.) e escaneie o código abaixo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {otpauthUrl && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpauthUrl)}`}
                    className="rounded-xl border bg-white p-3"
                    onLoad={() => setQrReady(true)}
                    alt="QR Code para 2FA"
                  />
                </div>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Não consegue escanear? Código manual</summary>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Use esta chave secreta no seu app:</p>
                  <div className="rounded-lg border bg-muted/50 px-3 py-2.5 font-mono text-xs break-all select-all">{secret}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs"
                    onClick={() => { navigator.clipboard.writeText(secret); setError(""); }}
                  >
                    Copiar chave
                  </Button>
                </div>
              </details>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-base">Confirmar código</CardTitle>
              </div>
              <CardDescription>
                Digite o código de 6 dígitos gerado pelo aplicativo para confirmar que a configuração está funcionando.
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
                <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP: Active (2FA is on) */}
      {step === "active" && (
        <Card className="rounded-xl border-emerald-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {message ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Shield className="h-5 w-5 text-emerald-400" />}
              <CardTitle className="text-base">2FA ativo ✅</CardTitle>
            </div>
            <CardDescription>
              Toda vez que você fizer login no admin, precisará do código do seu app autenticador.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="rounded-lg" onClick={() => { setStep("verify"); setToken(""); }}>
              <Smartphone className="mr-2 h-4 w-4" /> Trocar dispositivo
            </Button>
            <Button variant="ghost" className="rounded-lg text-red-400 hover:text-red-300" onClick={handleDisable}>
              <XCircle className="mr-2 h-4 w-4" /> Desativar 2FA
            </Button>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
