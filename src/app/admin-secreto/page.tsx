import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { Shield, Activity, DollarSign, Users, BookOpen, Settings, AlertTriangle, KeyRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureAdminAuthTable, is2FAEnabled, getAdminCPF } from "@/lib/admin/admin-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminSecretoLogin from "./login";

export const dynamic = "force-dynamic";

export default async function AdminSecretoPage() {
  // Garante tabela
  ensureAdminAuthTable();

  // Verifica se tem cookie de validação admin
  const cookieStore = await cookies();
  const adminValidated = cookieStore.get("admin_validated");

  // Se não validou, mostra login
  if (!adminValidated || adminValidated.value !== "1") {
    return <AdminSecretoLogin />;
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") {
    return <AdminSecretoLogin />;
  }

  const db = getDb();
  const has2FA = is2FAEnabled(user.id);
  const cpf = getAdminCPF(user.id);
  const needsSetup = !has2FA || !cpf;

  const stats = {
    users: (db.prepare("SELECT COUNT(*) c FROM users").get() as any).c,
    novels: (db.prepare("SELECT COUNT(*) c FROM novels").get() as any).c,
    mangas: (db.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c,
    chapters: (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c,
    comments: (db.prepare("SELECT COUNT(*) c FROM comments").get() as any).c,
    totalSales: (db.prepare("SELECT COALESCE(SUM(amount_cents),0) FROM marketplace_payments WHERE status = 'approved'").get() as any)["COALESCE(SUM(amount_cents),0)"],
    pendingWithdrawals: (db.prepare("SELECT COUNT(*) c FROM withdrawal_requests WHERE status = 'pending'").get() as any).c,
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-red-900/30 bg-gray-950/90 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-red-400" />
            <span className="font-mono text-sm text-red-300">PAINEL DE CONTROLE</span>
            <Badge variant="outline" className="text-[10px] border-red-800/40 text-red-400">SECRETO</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-400/60">{user.username}</span>
            <form action={async () => {
              "use server";
              const c = await cookies();
              c.set("admin_validated", "", { maxAge: 0, path: "/" });
              redirect(`/${process.env.ADMIN_SECRET_PATH || "adm1n-t0m0v3rs0"}`);
            }}>
              <Button type="submit" size="sm" variant="outline" className="border-red-800/30 text-red-400 text-xs">Sair</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {needsSetup && (
          <Card className="border-amber-800/40 bg-amber-950/30">
            <CardContent className="pt-6 flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-300">Configuração obrigatória necessária</h3>
                <p className="text-sm text-amber-200/70 mt-1">
                  {!has2FA && !cpf && "2FA e CPF não configurados."}
                  {!has2FA && cpf && "2FA não configurado."}
                  {has2FA && !cpf && "CPF não registrado."}
                </p>
                <Button asChild size="sm" className="mt-3 bg-amber-700 hover:bg-amber-600">
                  <Link href={`/${process.env.ADMIN_SECRET_PATH || "adm1n-t0m0v3rs0"}/setup`}>
                    <KeyRound className="h-3 w-3 mr-1" /> Configurar agora
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardContent className="pt-6">
              <Users className="h-5 w-5 text-red-400 mb-2" />
              <p className="text-2xl font-bold text-red-100">{stats.users}</p>
              <p className="text-xs text-red-400/60">Usuários</p>
            </CardContent>
          </Card>
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardContent className="pt-6">
              <BookOpen className="h-5 w-5 text-red-400 mb-2" />
              <p className="text-2xl font-bold text-red-100">{stats.novels}</p>
              <p className="text-xs text-red-400/60">Novels</p>
            </CardContent>
          </Card>
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardContent className="pt-6">
              <Activity className="h-5 w-5 text-red-400 mb-2" />
              <p className="text-2xl font-bold text-red-100">{stats.mangas}</p>
              <p className="text-xs text-red-400/60">Mangás</p>
            </CardContent>
          </Card>
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardContent className="pt-6">
              <DollarSign className="h-5 w-5 text-red-400 mb-2" />
              <p className="text-2xl font-bold text-red-100">R$ {(stats.totalSales / 100).toFixed(0)}</p>
              <p className="text-xs text-red-400/60">Vendas totais</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-red-200 text-lg">Acesso rápido</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="border-red-800/30 text-red-300 hover:bg-red-950/50"><Link href={`/${process.env.ADMIN_SECRET_PATH || "adm1n-t0m0v3rs0"}/finance`}>Financeiro</Link></Button>
              <Button asChild variant="outline" className="border-red-800/30 text-red-300 hover:bg-red-950/50"><Link href={`/${process.env.ADMIN_SECRET_PATH || "adm1n-t0m0v3rs0"}/setup`}>Configurar 2FA/CPF</Link></Button>
              <Button asChild variant="outline" className="border-red-800/30 text-red-300 hover:bg-red-950/50"><Link href="/admin/site">Configurar site</Link></Button>
              <Button asChild variant="outline" className="border-red-800/30 text-red-300 hover:bg-red-950/50"><Link href="/admin/users">Usuários</Link></Button>
            </CardContent>
          </Card>

          <Card className="border-red-900/20 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-red-200 text-lg">Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-red-300/70">
              <p>Saques pendentes: <strong className="text-red-200">{stats.pendingWithdrawals}</strong></p>
              <p>Capítulos: <strong className="text-red-200">{stats.chapters.toLocaleString()}</strong></p>
              <p>Comentários: <strong className="text-red-200">{stats.comments.toLocaleString()}</strong></p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
