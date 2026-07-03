import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Check, DollarSign, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatBRLCents } from "@/lib/marketplace/money";
import { adminConfirmWithdrawalAction } from "@/lib/actions/marketplace-actions";

export const dynamic = "force-dynamic";
const SP = process.env.ADMIN_SECRET_PATH || "adm1n-c0ntr0l-40d9bd082a1266429a6f341f";

function safeSum(db: any, sql: string): number {
  try {
    const row = db.prepare(sql).get() as any;
    const keys = Object.keys(row);
    return Math.floor(Number(row[keys[0]]) || 0);
  } catch {
    return 0;
  }
}

export default async function AdminSecretoFinancePage() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_validated")?.value !== "1") redirect(`/${SP}`);
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") redirect(`/${SP}`);

  try {

  const db = getDb();

  const totalSales = safeSum(db, "SELECT COALESCE(SUM(gross_amount_cents),0) FROM marketplace_payments WHERE status = 'approved'");
  const totalAuthorPayouts = safeSum(db, "SELECT COALESCE(SUM(amount_cents),0) FROM withdrawal_requests WHERE status = 'paid'");
  const pendingTotal = safeSum(db, "SELECT COALESCE(SUM(amount_cents),0) FROM withdrawal_requests WHERE status = 'pending'");

  let withdrawals: any[] = [];
  try {
    withdrawals = db.prepare(`
      SELECT wr.*, sp.public_name, sp.pix_key_type, sp.pix_key, u.display_name, u.email
      FROM withdrawal_requests wr
      JOIN seller_profiles sp ON sp.id = wr.seller_id
      JOIN users u ON u.id = sp.user_id
      WHERE wr.status = 'pending'
      ORDER BY wr.created_at ASC
    `).all() as any[];
  } catch {}

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-red-900/30 bg-gray-950/90 px-4 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <a href={`/${SP}`} className="text-red-400 hover:text-red-300">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <DollarSign className="h-5 w-5 text-red-400" />
          <span className="font-mono text-sm text-red-300">FINANCEIRO</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardContent className="pt-6">
              <p className="text-xs text-red-400/60">Total vendido</p>
              <p className="text-xl font-bold text-red-100">{formatBRLCents(totalSales)}</p>
            </CardContent>
          </Card>
          <Card className="border-red-900/20 bg-gray-900/50">
            <CardContent className="pt-6">
              <p className="text-xs text-red-400/60">Pago a autores</p>
              <p className="text-xl font-bold text-red-100">{formatBRLCents(totalAuthorPayouts)}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-900/20 bg-gray-900/50">
            <CardContent className="pt-6">
              <p className="text-xs text-amber-400/60">Pendente p/ autores</p>
              <p className="text-xl font-bold text-amber-300">{formatBRLCents(pendingTotal)}</p>
            </CardContent>
          </Card>
          <Card className="border-green-900/20 bg-gray-900/50">
            <CardContent className="pt-6">
              <p className="text-xs text-green-400/60">Seu saldo</p>
              <p className="text-xl font-bold text-green-400">{formatBRLCents(totalSales - totalAuthorPayouts)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-red-900/20 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-red-200 text-lg">Saques para pagar ({withdrawals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="text-sm text-red-400/60 text-center py-4">Nenhum saque pendente.</p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w: any) => (
                  <div key={w.id} className="rounded-xl border border-red-900/20 bg-gray-950/50 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-red-200">{w.public_name}</p>
                        <p className="text-xs text-red-400/60">{w.email}</p>
                      </div>
                      <Badge variant="outline" className="text-amber-400 border-amber-800/30">
                        {formatBRLCents(Math.floor(w.amount_cents))}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-red-400/60">
                        <span className="block uppercase tracking-wide">PIX</span>
                        <span className="text-red-200">{w.pix_key_type.toUpperCase()}: {w.pix_key}</span>
                      </div>
                      <div className="text-red-400/60">
                        <span className="block uppercase tracking-wide">Solicitado em</span>
                        <span className="text-red-200">{w.created_at}</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-red-950/30 border border-red-900/20 p-3 text-xs text-red-300">
                      <p className="font-medium text-red-200">Instrução:</p>
                      <p className="mt-1">1. Abra seu app do banco/PIX<br/>2. Transfira <strong>{formatBRLCents(Math.floor(w.amount_cents))}</strong> via PIX<br/>3. Chave: <strong>{w.pix_key_type.toUpperCase()}: {w.pix_key}</strong><br/>4. Depois de pagar, clique em "Confirmar"</p>
                    </div>
                    <form action={adminConfirmWithdrawalAction}>
                      <input type="hidden" name="withdrawal_id" value={w.id} />
                      <Button type="submit" size="sm" className="w-full bg-red-900 hover:bg-red-800 text-red-100">
                        <Check className="h-4 w-4 mr-2" />
                        Confirmar pagamento (já transferi)
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
  } catch (e) {
    console.error("Finance admin error:", e);
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-sm">Erro ao carregar financeiro. <a href={`/${SP}`} className="underline ml-2">Voltar</a></div>;
  }
}
