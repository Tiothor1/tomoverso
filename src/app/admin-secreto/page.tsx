import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { 
  Shield, Activity, DollarSign, Users, BookOpen, 
  Settings, AlertTriangle, KeyRound, Store, MessageCircle, 
  TrendingUp, BarChart3, Globe, Boxes, ShoppingCart,
  WalletCards, Eye, PenLine
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureAdminAuthTable, is2FAEnabled, getAdminCPF } from "@/lib/admin/admin-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminSecretoLogin from "./login";

export const dynamic = "force-dynamic";
const SECRET = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

export default async function AdminSecretoPage() {
  try {
    ensureAdminAuthTable();
    const cookieStore = await cookies();
    const adminValidated = cookieStore.get("admin_validated");
    if (!adminValidated || adminValidated.value !== "1") return <AdminSecretoLogin />;
    const user = await getCurrentUser().catch(() => null);
    if (!user || user.role !== "admin") return <AdminSecretoLogin />;
    const db = getDb();
    const has2FA = is2FAEnabled(user.id);
    const cpf = getAdminCPF(user.id);
    const needsSetup = !has2FA || !cpf;

  const stats = {
    users: (db.prepare("SELECT COUNT(*) c FROM users").get() as any).c,
    novels: (db.prepare("SELECT COUNT(*) c FROM novels").get() as any).c,
    mangas: (db.prepare("SELECT COUNT(*) c FROM mangas").get() as any).c,
    chapters: (db.prepare("SELECT COUNT(*) c FROM chapters").get() as any).c,
    mangaChapters: (db.prepare("SELECT COUNT(*) c FROM manga_chapters").get() as any).c,
    comments: (db.prepare("SELECT COUNT(*) c FROM comments").get() as any).c,
    sessions: (db.prepare("SELECT COUNT(*) c FROM sessions").get() as any).c,
    sellers: (db.prepare("SELECT COUNT(*) c FROM seller_profiles WHERE status='approved'").get() as any).c,
    totalSales: (db.prepare("SELECT COALESCE(SUM(amount_cents),0) FROM marketplace_payments WHERE status='approved'").get() as any)["COALESCE(SUM(amount_cents),0)"],
    pendingWithdrawals: (db.prepare("SELECT COUNT(*) c, COALESCE(SUM(amount_cents),0) total FROM withdrawal_requests WHERE status='pending'").get() as any),
    totalViews: (db.prepare("SELECT COALESCE(SUM(views),0) FROM novels").get() as any)["COALESCE(SUM(views),0)"],
  };

  return (
    <div className="min-h-screen bg-gray-950 selection:bg-red-900/30">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-red-900/30 bg-gray-950/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-950/50 border border-red-800/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <span className="font-mono text-sm text-red-300 uppercase tracking-[0.15em]">Painel de Controle</span>
              <p className="text-[10px] text-red-500/50">Tomoverso — Administração</p>
            </div>
            <Badge variant="outline" className="text-[10px] border-red-800/40 text-red-500 ml-2">RESTRITO</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400/50 hidden md:inline">{user.username}</span>
            {!needsSetup && (
              <Link href={`/${SECRET}/finance`}>
                <Button size="sm" variant="outline" className="border-red-800/30 text-red-400 text-xs h-7">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Saques
                </Button>
              </Link>
            )}
            <form action={async () => {
              "use server";
              const c = await cookies();
              c.set("admin_validated", "", { maxAge: 0, path: "/" });
              redirect(`/${SECRET}`);
            }}>
              <Button type="submit" size="sm" variant="ghost" className="text-red-400/50 hover:text-red-300 text-xs h-7">Sair</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Setup warning */}
        {needsSetup && (
          <Card className="border-amber-800/40 bg-amber-950/30">
            <CardContent className="pt-6 flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-300">Configuração de segurança obrigatória</h3>
                <p className="text-sm text-amber-200/70 mt-1">
                  {!has2FA && !cpf && "2FA e CPF não configurados."}
                  {!has2FA && cpf && "2FA não configurado."}
                  {has2FA && !cpf && "CPF não registrado."}
                  {' '}Complete o setup para acessar todas as funções.
                </p>
                <Button asChild size="sm" className="mt-3 bg-amber-700 hover:bg-amber-600">
                  <Link href={`/${SECRET}/setup`}>
                    <KeyRound className="h-3 w-3 mr-1" /> Configurar agora
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="border-red-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <Users className="h-4 w-4 text-red-400 mb-1" />
            <p className="text-xl font-bold text-red-100">{stats.users}</p>
            <p className="text-[10px] text-red-400/50 uppercase tracking-wide">Usuários</p>
          </CardContent></Card>
          <Card className="border-red-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <BookOpen className="h-4 w-4 text-blue-400 mb-1" />
            <p className="text-xl font-bold text-red-100">{stats.novels}</p>
            <p className="text-[10px] text-red-400/50 uppercase tracking-wide">Novels</p>
          </CardContent></Card>
          <Card className="border-red-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <Activity className="h-4 w-4 text-purple-400 mb-1" />
            <p className="text-xl font-bold text-red-100">{stats.mangas}</p>
            <p className="text-[10px] text-red-400/50 uppercase tracking-wide">Mangás</p>
          </CardContent></Card>
          <Card className="border-red-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <PenLine className="h-4 w-4 text-emerald-400 mb-1" />
            <p className="text-xl font-bold text-red-100">{(stats.chapters + stats.mangaChapters).toLocaleString()}</p>
            <p className="text-[10px] text-red-400/50 uppercase tracking-wide">Capítulos</p>
          </CardContent></Card>
          <Card className="border-red-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <Eye className="h-4 w-4 text-cyan-400 mb-1" />
            <p className="text-xl font-bold text-red-100">{stats.totalViews.toLocaleString()}</p>
            <p className="text-[10px] text-red-400/50 uppercase tracking-wide">Leituras</p>
          </CardContent></Card>
          <Card className="border-red-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <MessageCircle className="h-4 w-4 text-pink-400 mb-1" />
            <p className="text-xl font-bold text-red-100">{stats.comments.toLocaleString()}</p>
            <p className="text-[10px] text-red-400/50 uppercase tracking-wide">Comentários</p>
          </CardContent></Card>
        </div>

        {/* Finance cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-emerald-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <p className="text-[10px] text-green-400/60 uppercase tracking-wide">Total vendido</p>
            <p className="text-xl font-bold text-green-400">R$ {(stats.totalSales / 100).toLocaleString("pt-BR", {minimumFractionDigits:2})}</p>
          </CardContent></Card>
          <Card className="border-amber-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <p className="text-[10px] text-amber-400/60 uppercase tracking-wide">Pendente (saques)</p>
            <p className="text-xl font-bold text-amber-300">
              {stats.pendingWithdrawals.c}
              <span className="text-sm text-amber-400/60 ml-1 font-normal">saques</span>
            </p>
            <p className="text-xs text-amber-400/40">R$ {(stats.pendingWithdrawals.total / 100).toLocaleString("pt-BR", {minimumFractionDigits:2})}</p>
          </CardContent></Card>
          <Card className="border-blue-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <p className="text-[10px] text-blue-400/60 uppercase tracking-wide">Vendedores</p>
            <p className="text-xl font-bold text-blue-400">{stats.sellers}</p>
          </CardContent></Card>
          <Card className="border-purple-900/20 bg-gray-900/50"><CardContent className="pt-4 pb-4">
            <p className="text-[10px] text-purple-400/60 uppercase tracking-wide">Sessões ativas</p>
            <p className="text-xl font-bold text-purple-400">{stats.sessions}</p>
          </CardContent></Card>
        </div>

        {/* Quick actions */}
        <Card className="border-red-900/20 bg-gray-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-200 text-base flex items-center gap-2">
              <Boxes className="h-4 w-4" /> Acesso rápido
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button asChild variant="outline" className="border-red-800/20 text-red-300 hover:bg-red-950/40 justify-start h-10 text-xs">
              <Link href={`/${SECRET}/finance`}><DollarSign className="h-3.5 w-3.5 mr-2" /> Financeiro</Link>
            </Button>
            <Button asChild variant="outline" className="border-red-800/20 text-red-300 hover:bg-red-950/40 justify-start h-10 text-xs">
              <Link href={`/${SECRET}/setup`}><KeyRound className="h-3.5 w-3.5 mr-2" /> Segurança</Link>
            </Button>
            <Button asChild variant="outline" className="border-red-800/20 text-red-300 hover:bg-red-950/40 justify-start h-10 text-xs">
              <Link href={`/${SECRET}`}><Activity className="h-3.5 w-3.5 mr-2" /> Dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        {/* System info */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-200 text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-red-400/60">
              <div className="flex justify-between"><span>Ambiente</span><span className="text-red-200">{process.env.VERCEL ? "Vercel" : "Local"}</span></div>
              <div className="flex justify-between"><span>Admin path</span><span className="text-red-200 font-mono text-[10px]">{SECRET}</span></div>
              <div className="flex justify-between"><span>2FA</span><span className={has2FA ? "text-green-400" : "text-amber-400"}>{has2FA ? "✅ Ativo" : "⚠️ Pendente"}</span></div>
              <div className="flex justify-between"><span>CPF</span><span className={cpf ? "text-green-400" : "text-amber-400"}>{cpf ? `${cpf.slice(0,3)}.***.***-**` : "⚠️ Pendente"}</span></div>
            </CardContent>
          </Card>

          <Card className="border-red-900/20 bg-gray-900/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-200 text-sm flex items-center gap-2">
                <WalletCards className="h-4 w-4" /> Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-red-400/60">
              <div className="flex justify-between"><span>Total vendido (bruto)</span><span className="text-green-400">R$ {(stats.totalSales / 100).toLocaleString("pt-BR", {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between"><span>Saques pendentes</span><span className="text-amber-300">{stats.pendingWithdrawals.c} ({stats.pendingWithdrawals.c > 0 ? `R$ ${(stats.pendingWithdrawals.total / 100).toLocaleString("pt-BR", {minimumFractionDigits:2})}` : "—"})</span></div>
              <div className="flex justify-between"><span>Vendedores ativos</span><span className="text-blue-400">{stats.sellers}</span></div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
  } catch (e: any) {
    console.error("Admin crash:", e);
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <Shield className="h-12 w-12 text-red-400 mx-auto" />
          <h1 className="text-xl text-red-200 font-bold">Erro no painel</h1>
          <p className="text-sm text-red-400/60">Ocorreu um erro ao carregar o painel administrativo.</p>
          <p className="text-xs text-red-500/40 font-mono">{String(e).slice(0, 200)}</p>
          <a href={`/${SECRET}`} className="text-sm text-red-400 underline">Tentar novamente</a>
        </div>
      </div>
    );
  }
}
