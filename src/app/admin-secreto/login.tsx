"use client";

import { useState } from "react";
import { Shield, AlertTriangle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSecretoLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

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

    // Seta cookie admin_validated direto pelo client
    document.cookie = "admin_validated=1; path=/; max-age=3600; SameSite=Lax; Secure";
    await new Promise(r => setTimeout(r, 100));
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-950">
      <Card className="w-full max-w-md border-red-900/30 bg-gray-950/90 shadow-2xl shadow-red-900/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-950/50 border border-red-800/30 flex items-center justify-center">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-xl text-red-100">Acesso Restrito</CardTitle>
          <p className="text-xs text-red-400/60 mt-1">Painel Administrativo — Tomo Verso Editora</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800/30 p-3 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-red-200">Email ou username</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required className="bg-gray-900 border-red-900/40 text-red-100" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-red-200">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-gray-900 border-red-900/40 text-red-100" />
            </div>
            <Button type="submit" className="w-full bg-red-900 hover:bg-red-800 text-red-100" disabled={loading}>
              <UserCheck className="h-4 w-4 mr-2" />
              {loading ? "Verificando..." : "Entrar no painel"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-red-500/40">
            Apenas administradores autorizados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
