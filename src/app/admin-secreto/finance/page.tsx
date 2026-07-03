import Link from "next/link";
import { AlertTriangle, Check, DollarSign, Landmark, Receipt, Search, UserRound, WalletCards } from "lucide-react";
import { getDb } from "@/lib/db";
import { confirmWithdrawalV2Action } from "@/lib/admin/admin-v2-actions";
import { getAdminSecretPath, getSecretAdminOrRedirect } from "@/lib/admin/admin-v2-auth";
import { formatBRL, formatInteger, readSearchParams, safeAll, safeCount, safeSum, tableExists } from "@/lib/admin/admin-v2-data";
import { AdminHubShell } from "@/components/admin-v2/admin-hub-shell";
import { AdminStatusBadge } from "@/components/admin-v2/admin-hub-badge";
import { AdminEmptyState, AdminErrorState } from "@/components/admin-v2/admin-hub-empty";
import { AdminHubSection, AdminPanel } from "@/components/admin-v2/admin-hub-section";
import { ConfirmSubmitButton } from "@/components/admin-v2/confirm-submit-button";

export const dynamic = "force-dynamic";

type WithdrawalRow = {
  id: string;
  amount_cents: number;
  pix_key_type?: string;
  pix_key?: string;
  status?: string;
  requested_at?: string;
  created_at?: string;
  public_name?: string;
  legal_name?: string;
  display_name?: string;
  email?: string;
};

type PaymentRow = {
  id: string;
  status?: string;
  payment_method?: string;
  gross_amount_cents?: number;
  net_received_cents?: number;
  created_at?: string;
  buyer_name?: string;
  buyer_email?: string;
};

export default async function AdminSecretoFinancePage(props: { searchParams?: Promise<{ q?: string; status?: string }> | { q?: string; status?: string } }) {
  const secretPath = getAdminSecretPath();
  const user = await getSecretAdminOrRedirect(secretPath);

  try {
    const db = getDb();
    const sp = await readSearchParams(props.searchParams);
    const q = (sp.q || "").trim();
    const status = (sp.status || "pending").trim();

    const hasPayments = tableExists(db, "marketplace_payments");
    const hasWithdrawals = tableExists(db, "withdrawal_requests");

    const totalSales = safeSum(db, "SELECT COALESCE(SUM(gross_amount_cents),0) AS c FROM marketplace_payments WHERE status = 'approved'");
    const netReceived = safeSum(db, "SELECT COALESCE(SUM(net_received_cents),0) AS c FROM marketplace_payments WHERE status = 'approved'");
    const paidToAuthors = safeSum(db, "SELECT COALESCE(SUM(amount_cents),0) AS c FROM withdrawal_requests WHERE status = 'paid'");
    const pendingTotal = safeSum(db, "SELECT COALESCE(SUM(amount_cents),0) AS c FROM withdrawal_requests WHERE status = 'pending'");
    const pendingCount = safeCount(db, "SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status = 'pending'");
    const approvedOrders = safeCount(db, "SELECT COUNT(*) AS c FROM marketplace_payments WHERE status = 'approved'");

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (status && status !== "all") {
      conditions.push("wr.status = ?");
      params.push(status);
    }
    if (q) {
      conditions.push("(sp.public_name LIKE ? OR sp.legal_name LIKE ? OR u.display_name LIKE ? OR u.email LIKE ? OR wr.pix_key LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const withdrawals = safeAll<WithdrawalRow>(db, `
      SELECT wr.*, sp.public_name, sp.legal_name, u.display_name, u.email
      FROM withdrawal_requests wr
      LEFT JOIN seller_profiles sp ON sp.id = wr.seller_id
      LEFT JOIN users u ON u.id = sp.user_id
      ${where}
      ORDER BY CASE wr.status WHEN 'pending' THEN 0 WHEN 'paid' THEN 1 ELSE 2 END, COALESCE(wr.requested_at, wr.created_at, '') DESC
      LIMIT 100
    `, ...params);

    const recentPayments = safeAll<PaymentRow>(db, `
      SELECT mp.id, mp.status, mp.payment_method, mp.gross_amount_cents, mp.net_received_cents, mp.created_at,
             u.display_name as buyer_name, u.email as buyer_email
      FROM marketplace_payments mp
      LEFT JOIN users u ON u.id = mp.buyer_id
      ORDER BY mp.created_at DESC
      LIMIT 8
    `);

    return (
      <AdminHubShell secretPath={secretPath} active="finance" title="Financeiro" subtitle="Receita, pagamentos, saldo do marketplace e saques de autores." user={user}>
        {!hasPayments || !hasWithdrawals ? (
          <AdminPanel className="border-amber-400/20 bg-amber-950/20">
            <div className="flex items-start gap-3 text-amber-100"><AlertTriangle className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Dados financeiros parcialmente indisponíveis neste ambiente.</p><p className="mt-1 text-sm text-amber-100/70">As telas continuam seguras usando consultas resilientes; crie as tabelas de marketplace/saques para preencher os números.</p></div></div>
          </AdminPanel>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Total vendido</p><p className="mt-2 text-3xl font-semibold text-emerald-100">{formatBRL(totalSales)}</p><p className="mt-1 text-sm text-slate-400">{formatInteger(approvedOrders)} pagamentos aprovados</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Recebido líquido</p><p className="mt-2 text-3xl font-semibold text-cyan-100">{formatBRL(netReceived || totalSales)}</p><p className="mt-1 text-sm text-slate-400">após taxas registradas</p></AdminPanel>
          <AdminPanel><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pago a autores</p><p className="mt-2 text-3xl font-semibold text-violet-100">{formatBRL(paidToAuthors)}</p><p className="mt-1 text-sm text-slate-400">saques confirmados</p></AdminPanel>
          <AdminPanel className={pendingCount ? "border-amber-400/20 bg-amber-950/10" : ""}><p className="text-xs uppercase tracking-[0.22em] text-slate-500">Saques pendentes</p><p className="mt-2 text-3xl font-semibold text-amber-100">{formatBRL(pendingTotal)}</p><p className="mt-1 text-sm text-slate-400">{formatInteger(pendingCount)} solicitação(ões)</p></AdminPanel>
        </div>

        <AdminHubSection eyebrow="Saques" title="Pagamentos a autores" description="Confirme apenas depois de transferir via PIX. Ação valida admin no servidor.">
          <AdminPanel>
            <form method="GET" className="mb-5 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input name="q" defaultValue={q} placeholder="Autor, e-mail ou chave PIX..." className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40" />
              </label>
              <select name="status" defaultValue={status} className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/40">
                <option value="pending">Pendentes</option>
                <option value="paid">Pagos</option>
                <option value="rejected">Rejeitados</option>
                <option value="all">Todos</option>
              </select>
              <div className="flex gap-2"><button type="submit" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">Filtrar</button>{(q || status !== "pending") && <Link href={`/${secretPath}/finance`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.07]">Limpar</Link>}</div>
            </form>

            {withdrawals.length === 0 ? (
              <AdminEmptyState icon={WalletCards} title="Nenhum saque neste filtro" description="Quando autores solicitarem saque, as pendências aparecem aqui com instrução PIX." className="border-0 bg-transparent" />
            ) : (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_260px_180px] lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-100">{withdrawal.public_name || withdrawal.display_name || withdrawal.legal_name || "Autor"}</h3><AdminStatusBadge tone={withdrawal.status === "paid" ? "emerald" : withdrawal.status === "pending" ? "amber" : "rose"}>{withdrawal.status || "pendente"}</AdminStatusBadge></div>
                        <p className="mt-1 text-sm text-slate-500"><UserRound className="mr-1 inline h-3.5 w-3.5" /> {withdrawal.email || "sem e-mail"}</p>
                        <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100/85"><Landmark className="mr-1 inline h-4 w-4" /> PIX {withdrawal.pix_key_type?.toUpperCase() || "—"}: <strong>{withdrawal.pix_key || "—"}</strong></p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Valor solicitado</p><p className="mt-2 text-2xl font-semibold text-amber-100">{formatBRL(Number(withdrawal.amount_cents || 0))}</p><p className="mt-1 text-xs text-slate-500">{withdrawal.requested_at || withdrawal.created_at || "data indisponível"}</p></div>
                      <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                        {withdrawal.status === "pending" ? (
                          <form action={confirmWithdrawalV2Action}>
                            <input type="hidden" name="withdrawal_id" value={withdrawal.id} />
                            <ConfirmSubmitButton variant="success" className="w-full" message={`Confirmar que você já transferiu ${formatBRL(Number(withdrawal.amount_cents || 0))} via PIX para ${withdrawal.public_name || withdrawal.email}?`}>
                              <Check className="h-3.5 w-3.5" /> Confirmar pago
                            </ConfirmSubmitButton>
                          </form>
                        ) : <AdminStatusBadge tone="emerald">sem ação pendente</AdminStatusBadge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </AdminHubSection>

        <AdminHubSection eyebrow="Histórico" title="Pagamentos recentes" description="Últimos registros do marketplace para auditoria visual rápida.">
          <AdminPanel>
            {recentPayments.length === 0 ? (
              <AdminEmptyState icon={Receipt} title="Sem pagamentos recentes" description="Dados indisponíveis neste ambiente ou nenhum pagamento registrado." className="border-0 bg-transparent" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-100">{payment.buyer_name || payment.buyer_email || "Comprador"}</p><p className="mt-1 text-xs text-slate-500">{payment.created_at?.slice(0, 16) || "—"} · {payment.payment_method || "método não informado"}</p></div><AdminStatusBadge tone={payment.status === "approved" ? "emerald" : payment.status === "pending" ? "amber" : "slate"}>{payment.status || "—"}</AdminStatusBadge></div>
                    <p className="mt-4 text-xl font-semibold text-emerald-100">{formatBRL(Number(payment.gross_amount_cents || 0))}</p>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </AdminHubSection>
      </AdminHubShell>
    );
  } catch (error) {
    console.error("Finance admin V2 error:", error);
    return <div className="min-h-screen bg-[#070812] p-6 text-slate-100"><AdminErrorState error={error} backHref={`/${secretPath}`} /></div>;
  }
}
