import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminPromoteBanner } from "@/components/admin/admin-promote-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Acesso admin — Tomo Verso Editora",
};

export default async function AdminPromotePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const isAdmin = user.role === "admin";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 space-y-6">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold">Acesso administrativo</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? "Painel de administração" : "Você precisa ser administrador para acessar esta área."}
        </p>
      </div>

      {!isAdmin && (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem acessar esta página.
            </p>
            <Button asChild className="w-full">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <>
          <AdminPromoteBanner />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Credenciais do admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Credenciais do seed automático. Mantenha em segredo.
              </p>
              <div className="bg-muted/30 rounded-md p-3 font-mono text-xs space-y-1">
                <div><strong>CPF:</strong> 06364605761</div>
                <div><strong>Email:</strong> fabio@tomoverso.com</div>
                <div><strong>Senha:</strong> @Tiothor1</div>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/login">Ir pra página de login</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
