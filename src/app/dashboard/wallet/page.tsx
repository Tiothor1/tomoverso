import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, WalletCards, TrendingUp, Clock, CheckCircle, Ban, DollarSign, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatBRLCents } from "@/lib/marketplace/money";
import { MIN_WITHDRAWAL_CENTS } from "@/lib/marketplace/constants";
import { requestWithdrawalAction } from "@/lib/actions/marketplace-actions";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = getDb();
  const seller = db.prepare("SELECT * FROM seller_profiles WHERE user_id = ? AND status = 'approved'").get(user.id) as any;
  if (!seller) redirect("/dashboard/seller");

  const wallet = db.prepare("SELECT * FROM wallet_balances WHERE seller_id = ?").get(seller.id) as any;
  const pendingCents = wallet?.pending_cents || 0;
  const availableCents = wallet?.available_cents || 0;
  const withdrawnCents = wallet?.withdrawn_cents || 0;

  const transactions = db.prepare("SELECT * FROM wallet_transactions WHERE seller_id = ? ORDER BY created_at DESC LIMIT 20").all(seller.id) as any[];
  const pendingWithdrawals = db.prepare("SELECT * FROM withdrawal_requests WHERE seller_id = ? AND status = 'pending' ORDER BY created_at DESC").all(seller.id) as any[];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Painel
        </Link>
      </Button>

      <div className="flex items-center gap-3">
        <WalletCards className="h-8 w-8 text-primary" />
        <div>
          <h1 className="font-heading text-3xl font-bold">Carteira</h1>
          <p className="text-muted-foreground text-sm">Saldo de vendas das suas obras</p>
        </div>
      </div>

      {/* Saldo cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Pendente (7 dias)
            </div>
            <p className="text-3xl font-heading font-bold mt-1 text-blue-400">{formatBRLCents(Math.floor(pendingCents))}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              Disponível para saque
            </div>
            <p className="text-3xl font-heading font-bold mt-1 text-emerald-400">{formatBRLCents(Math.floor(availableCents))}</p>
          </CardContent>
        </Card>
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Total já sacado
            </div>
            <p className="text-3xl font-heading font-bold mt-1">{formatBRLCents(Math.floor(withdrawnCents))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Saque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Solicitar saque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted/30 p-4 text-sm space-y-1">
            <p><strong>Chave PIX cadastrada:</strong> {seller.pix_key_type.toUpperCase()}: {seller.pix_key}</p>
            <p className="text-muted-foreground">Saque mínimo: {formatBRLCents(MIN_WITHDRAWAL_CENTS)}</p>
            <p className="text-muted-foreground">Disponível agora: {formatBRLCents(Math.floor(availableCents))}</p>
          </div>

          <form action={requestWithdrawalAction} className="flex gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label htmlFor="amount">Valor do saque (R$)</Label>
              <Input
                id="amount"
                name="amount_cents"
                type="number"
                step="0.01"
                min={MIN_WITHDRAWAL_CENTS / 100}
                max={availableCents / 100}
                placeholder="50,00"
              />
            </div>
            <Button type="submit" className="h-10" disabled={availableCents < MIN_WITHDRAWAL_CENTS}>
              Solicitar
            </Button>
          </form>

          {pendingWithdrawals.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium text-amber-400">Saque pendente</p>
              <p className="text-muted-foreground mt-1">
                Você tem {pendingWithdrawals.length} saque(s) de {formatBRLCents(pendingWithdrawals.reduce((a: number, w: any) => a + w.amount_cents, 0))} aguardando confirmação do administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Extrato de transações</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação ainda.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.description || t.type}</p>
                    <p className="text-xs text-muted-foreground">{t.created_at}</p>
                  </div>
                  <span className={`font-mono text-sm ${t.type.includes('sale') || t.type === 'release_available' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type.includes('sale') || t.type === 'release_available' ? '+' : '-'}{formatBRLCents(Math.floor(t.amount_cents))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
