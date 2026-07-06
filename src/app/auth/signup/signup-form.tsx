"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { signupAction } from "@/lib/actions/auth-actions";
export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await signupAction(formData);
      if (result.redirect) {
        window.location.href = result.redirect;
        return;
      }
      if (!result.ok && result.error) {
        setError(result.error);
      }
    } catch {
      setError("Não consegui criar a conta agora. Aguarde alguns segundos e tente de novo.");
    }

    submittingRef.current = false;
    setLoading(false);
  }

  return (
    <div className="aurora-bg relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-12">
      {/* Background com partículas */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <BookOpen className="neon-icon-pop h-7 w-7 text-primary" />
            <span className="gradient-text font-heading text-2xl font-black">Tomo Verso Editora</span>
          </Link>
          <h1 className="font-heading text-3xl font-black">Cria sua conta</h1>
          <p className="text-muted-foreground text-sm">
            Comece a ler e escrever Light Novels em segundos
          </p>
        </div>

        <Card className="glass-panel">
          <CardContent className="pt-6">
            <form
              action={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="display_name">Como quer ser chamado</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="display_name"
                    name="display_name"
                    placeholder="Seu nome"
                    required
                    minLength={2}
                    maxLength={40}
                    className="pl-9 focus-visible:border-primary/45 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    id="username"
                    name="username"
                    placeholder="seu_username"
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]+"
                    className="pl-9 focus-visible:border-primary/45 focus-visible:ring-primary/20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Letras, números e _ (sem espaços)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    className="pl-9 focus-visible:border-primary/45 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className="pl-9 pr-10 focus-visible:border-primary/45 focus-visible:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-md p-3">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="neon-button w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar conta"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Entrar
          </Link>
        </p>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>O primeiro usuário vira admin automaticamente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
