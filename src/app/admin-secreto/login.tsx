"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, UserCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSecretoLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "cpf" | "twofa">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [twofa, setTwofa] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Step 1: normal login
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: username, password }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || "Credenciais inválidas");
      setLoading(false);
      return;
    }
    // Step 2: ask for CPF + 2FA
    sessionStorage.setItem("admin_user_id", data.userId);
    setStep("cpf");
    setLoading(false);
  }

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const userId = sessionStorage.getItem("admin_user_id");
    if (!userId) {
      setError("Sessão expirada. Faça login novamente.");
      setStep("login");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, cpf, twofaToken: twofa }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || "Validação falhou");
      setLoading(false);
      return;
    }

    // Store admin session token
    document.cookie = `admin_validated=1; path=/; max-age=3600; SameSite=Lax`;
    sessionStorage.removeItem("admin_user_id");
    // Pequeno delay pra garantir que o cookie foi salvo
    await new Promise(r => setTimeout(r, 100));
    window.location.href = window.location.href;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-950">
      <Card className="w-full max-w-md border-red-900/30 bg-gray-950/90 shadow-2xl shadow-red-900/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-950/50 border border-red-800/30 flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-xl text-red-100">
            {step === "login" && "Acesso Restrito"}
            {step === "cpf" && "Verificação de CPF"}
            {step === "twofa" && "Autenticação 2FA"}
          </CardTitle>
          <p className="text-xs text-red-400/60 mt-1">
            {step === "login" && "Área administrativa — autenticação obrigatória"}
            {step === "cpf" && "Informe seu CPF cadastrado"}
            {step === "twofa" && "Código do Google Authenticator"}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800/30 p-3 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-red-200">Email ou username</Label>
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required className="bg-gray-900 border-red-900/40 text-red-100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-red-200">Senha</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-gray-900 border-red-900/40 text-red-100" />
              </div>
              <Button type="submit" className="w-full bg-red-900 hover:bg-red-800 text-red-100" disabled={loading}>
                <UserCheck className="h-4 w-4 mr-2" />
                {loading ? "Verificando..." : "Autenticar"}
              </Button>
            </form>
          )}

          {step === "cpf" && (
            <form onSubmit={e => { e.preventDefault(); setStep("twofa"); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-red-200">CPF (somente números)</Label>
                <Input id="cpf" value={cpf} onChange={e => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="00000000000" maxLength={11} required className="bg-gray-900 border-red-900/40 text-red-100 font-mono text-lg tracking-widest" />
              </div>
              <Button type="submit" className="w-full bg-red-900 hover:bg-red-800 text-red-100">
                <KeyRound className="h-4 w-4 mr-2" />
                Avançar
              </Button>
            </form>
          )}

          {step === "twofa" && (
            <form onSubmit={handleValidate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twofa" className="text-red-200">Código 2FA (6 dígitos)</Label>
                <Input id="twofa" value={twofa} onChange={e => setTwofa(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} required className="bg-gray-900 border-red-900/40 text-red-100 font-mono text-2xl tracking-[0.4em] text-center" />
              </div>
              <Button type="submit" className="w-full bg-red-900 hover:bg-red-800 text-red-100" disabled={loading}>
                <Shield className="h-4 w-4 mr-2" />
                {loading ? "Validando..." : "Acessar painel"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
