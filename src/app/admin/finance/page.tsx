import { redirect } from "next/navigation";
import Link from "next/link";
import { DollarSign, Users, TrendingUp, Clock, Check, X, WalletCards, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatBRLCents } from "@/lib/marketplace/money";
import { adminConfirmWithdrawalAction } from "@/lib/actions/marketplace-actions";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const db = getDb();

  // Visão geral
  const totalSales = (db.prepare("SELECT COALESCE(SUM(amount_cents),0) as c FROM marketplace_payments WHERE status = 'approved'").get() as any).c;
  const platformFees = (db.prepare("SELECT COALESCE(SUM(platform_fee_cents),0) as c FROM paid_works pw JOIN marketplace_order_items oi ON oi.paid_work_id = pw.id JOIN marketplace_orders o ON o.id = oi.order_id WHERE o.status = 'paid'").get() as any).c;
  const totalAuthorPayouts = (db.prepare("SELECT COALESCE(SUM(amount_cents),0) as c FROM withdrawal_requests WHERE status = 'paid'").get() as any).c;
  const pendingWithdrawals = (db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount_cents),0) as total FROM withdrawal_requests WHERE status = 'pending'").get() as any);
  const totalSellers = (db.prepare("SELECT COUNT(*) as c FROM seller_profiles WHERE status = 'approved'").get() as any).c;

  const yourBalance = totalSales - totalAuthorPayouts;

  // Saques pendentes com info do vendedor
  const withdrawals = db.prepare(`
    SELECT wr.*, sp.public_name, sp.pix_key_type, sp.pix_key, u.display_name, u.email
    FROM withdrawal_requests wr
    JOIN seller_profiles sp ON sp.id = wr.seller_id
    JOIN users u ON u.id = sp.user_id
    WHERE wr.status = 'pending'
    ORDER BY wr.created_at ASC
  `).all() as any[];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Painel de administração financeira</p>
      </div>

      {/* Visão geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total vendido (bruto)</p>
            <p className="text-2xl font-heading font-bold mt-1">{formatBRLCents(Math.floor(totalSales))}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Comissão Tomoverso (10%)</p>
            <p className="text-2xl font-heading font-bold mt-1 text-emerald-400">{formatBRLCents(Math.floor(platformFees))}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pago a autores</p>
            <p className="text-2xl font-heading font-bold mt-1 text-blue-400">{formatBRLCents(Math.floor(totalAuthorPayouts))}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Saldo seu (líquido)</p>
            <p className="text-2xl font-heading font-bold mt-1 text-amber-400">{formatBRLCents(Math.floor(yourBalance))}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-heading font-bold">{totalSellers}</p>
              <p className="text-xs text-muted-foreground">Vendedores ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className={pendingWithdrawals.c > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className={`h-5 w-5 ${pendingWithdrawals.c > 0 ? "text-amber-400" : "text-muted-foreground"}`} />
            <div>
              <p className="text-2xl font-heading font-bold">{pendingWithdrawals.c}</p>
              <p className="text-xs text-muted-foreground">Saques pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-2xl font-heading font-bold">{formatBRLCents(Math.floor(pendingWithdrawals.total))}</p>
              <p className="text-xs text-muted-foreground">Valor pendente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saques pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {pendingWithdrawals.c > 0 && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
            Saques para pagar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum saque pendente.</p>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="rounded-xl border border-border/50 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{w.public_name || w.display_name}</p>
                      <p className="text-xs text-muted-foreground">{w.email}</p>
                    </div>
                    <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                      {formatBRLCents(Math.floor(w.amount_cents))}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-muted-foreground">
                      <span className="block uppercase tracking-wide">PIX</span>
                      <span className="text-foreground">{w.pix_key_type.toUpperCase()}: {w.pix_key}</span>
                    </div>
                    <div className="text-muted-foreground">
                      <span className="block uppercase tracking-wide">Solicitado em</span>
                      <span className="text-foreground">{w.created_at}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Instrução para você:</p>
                    <p className="mt-1">
                      1. Abra seu app do banco/PIX<br />
                      2. Transfira <strong>{formatBRLCents(Math.floor(w.amount_cents))}</strong> via PIX<br />
                      3. Chave: <strong>{w.pix_key_type.toUpperCase()}: {w.pix_key}</strong><br />
                      4. Depois de pagar, clique em <strong>"Confirmar pagamento"</strong>
                    </p>
                  </div>
                  <form action={adminConfirmWithdrawalAction}>
                    <input type="hidden" name="withdrawal_id" value={w.id} />
                    <Button type="submit" size="sm" className="w-full">
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar pagamento (já transferi via PIX)
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de saques pagos */}
      <Card>
        <CardHeader>
          <CardTitle>Saques já pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const paid = db.prepare(`
              SELECT wr.*, sp.public_name, sp.pix_key_type
              FROM withdrawal_requests wr
              JOIN seller_profiles sp ON sp.id = wr.seller_id
              WHERE wr.status = 'paid'
              ORDER BY wr.approved_at DESC LIMIT 20
            `).all() as any[];
            return paid.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum saque pago ainda.</p>
            ) : (
              <div className="space-y-2">
                {paid.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{w.public_name}</p>
                      <p className="text-xs text-muted-foreground">{w.approved_at}</p>
                    </div>
                    <span className="font-mono text-sm text-emerald-400">{formatBRLCents(Math.floor(w.amount_cents))}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
