import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getUserActiveSubscription, getUserTransactions, formatBRL } from "@/lib/subscriptions";
import { CreditCard, Crown, FileText, Receipt, XCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ativa", color: "text-emerald-500" },
  trialing: { label: "Teste", color: "text-blue-500" },
  past_due: { label: "Pagamento pendente", color: "text-amber-500" },
  canceled: { label: "Cancelada", color: "text-muted-foreground" },
  expired: { label: "Expirada", color: "text-red-500" },
};

export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const db = getDb();
  const sub = getUserActiveSubscription(db, user.id);
  const transactions = getUserTransactions(user.id, 20);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Voltar ao painel
        </Link>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-amber-400" />
          <h1 className="font-heading text-3xl font-black">Minha Assinatura</h1>
        </div>
        <p className="mt-2 text-muted-foreground">Gerencie sua assinatura do Tomoverso.</p>
      </section>

      {sub ? (
        <section className="mb-10 rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-sm font-bold ${STATUS_LABELS[sub.status]?.color || "text-muted-foreground"}`}>
                {(STATUS_LABELS[sub.status]?.label || sub.status)}
              </span>
              <h2 className="mt-1 text-2xl font-bold">{sub.plan_name}</h2>
              {sub.badge_label && (
                <span className="mt-1 inline-block rounded-full bg-amber-500/10 px-3 py-0.5 text-xs font-medium text-amber-400">
                  Badge: {sub.badge_label}
                </span>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Válido até</p>
              <p className="font-medium text-foreground">
                {new Date(sub.current_period_end + "Z").toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          {sub.cancel_at_period_end === 0 && (
            <form action="/api/payments/cancel" method="POST" className="mt-6">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                <XCircle className="h-4 w-4" />
                Cancelar assinatura
              </button>
              <p className="mt-1 text-xs text-muted-foreground">
                O acesso continua até o fim do período atual.
              </p>
            </form>
          )}

          {sub.cancel_at_period_end === 1 && (
            <div className="mt-6 rounded-xl bg-amber-500/10 p-4 text-sm">
              <p className="font-medium text-amber-400">Assinatura cancelada</p>
              <p className="mt-1 text-muted-foreground">
                Você tem acesso até {new Date(sub.current_period_end + "Z").toLocaleDateString("pt-BR")}.
                Depois disso, sua conta volta ao plano gratuito.
              </p>
              <form action="/api/payments/reactivate" method="POST" className="mt-3">
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Reativar assinatura
                </button>
              </form>
            </div>
          )}
        </section>
      ) : (
        <section className="mb-10 rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center">
          <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-xl font-bold">Você não tem uma assinatura ativa</h2>
          <p className="mt-2 text-muted-foreground">Assine o Tomoverso e tenha acesso a benefícios exclusivos.</p>
          <Link
            href="/store/plans"
            className="mt-4 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Ver planos
          </Link>
        </section>
      )}

      {/* Histórico de transações */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold">Histórico de pagamentos</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Plano</th>
                  <th className="px-4 py-3 text-left font-medium">Valor</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-b border-border/30 last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(tx.created_at + "Z").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 font-medium">{tx.plan_name || tx.plan_id}</td>
                    <td className="px-4 py-3">{formatBRL(tx.amount_cents)}</td>
                    <td className="px-4 py-3">
                      <span className={
                        tx.status === "approved" ? "text-emerald-500" :
                        tx.status === "pending" ? "text-amber-500" :
                        "text-red-500"
                      }>
                        {tx.status === "approved" ? "Aprovado" :
                         tx.status === "pending" ? "Pendente" :
                         tx.status === "rejected" ? "Rejeitado" :
                         tx.status === "refunded" ? "Reembolsado" :
                         tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tx.payment_method === "pix" ? "PIX" :
                       tx.payment_method === "credit_card" ? "Cartão" :
                       tx.payment_method === "boleto" ? "Boleto" :
                       tx.payment_method || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Informações sobre anúncios */}
      <section className="mt-12 rounded-2xl border border-border/50 bg-card/50 p-6">
        <FileText className="mb-2 h-6 w-6 text-muted-foreground" />
        <h2 className="text-lg font-bold">Sobre anúncios</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O Tomoverso exibe anúncios para usuários não-assinantes como forma de manter a plataforma gratuita.
          Ao assinar o Pro, você remove todos os anúncios do site.
        </p>
      </section>
    </main>
  );
}
