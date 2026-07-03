import Link from "next/link";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActivePlans, getUserActiveSubscription, formatBRL, formatInterval } from "@/lib/subscriptions";
import { Check, Crown, X, Sparkles, ArrowRight } from "lucide-react";
import { PixPaymentButton } from "@/components/payments/pix-payment-button";

export const dynamic = "force-dynamic";

const freeFeatures = [
  "Acesso ao catálogo",
  "1 obra",
  "Anúncios",
];

const proFeatures = [
  "Sem anúncios",
  "Obras ilimitadas",
  "Badges exclusivos",
  "Download de capítulos",
  "Prioridade no suporte",
];

export default async function PlansPage({ searchParams }: { searchParams?: Promise<{ error?: string; mp_failure?: string }> }) {
  const db = getDb();
  const user = await getCurrentUser();
  const plans = getActivePlans();
  const sub = user ? getUserActiveSubscription(db, user.id) : null;
  const params = searchParams ? await searchParams : {};
  const paymentError = params.error || (params.mp_failure ? "mp_failure" : "");

  // Determine the best pro plan to highlight
  const proPlan = plans.length > 0 ? plans[0] : null;

  return (
    <>
    <main className="container mx-auto max-w-7xl px-4 py-10">
      <section className="mx-auto mb-10 max-w-2xl text-center">
        <Crown className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <h1 className="font-heading text-4xl font-black tracking-tight">Planos do Tomo Verso Editora</h1>
        <p className="mt-3 text-muted-foreground">
          {sub
            ? `Você já é assinante do plano ${sub.plan_name}. Gerencie sua assinatura abaixo.`
            : "Escolha entre o plano gratuito ou assine o Pro e desbloqueie todos os recursos."}
        </p>
      </section>

      {paymentError && (
        <section className="mx-auto mb-8 max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <p className="font-bold">Não foi possível iniciar o pagamento.</p>
          <p className="mt-1 text-red-100/80">
            {paymentError === "mp_missing_token"
              ? "O Mercado Pago ainda não está configurado."
              : paymentError === "checkout_failed" || paymentError === "network_error"
              ? "Erro de conexão. Tente novamente em instantes."
              : "Tente novamente. Se continuar, revise as credenciais do Mercado Pago."}
          </p>
        </section>
      )}

      {sub && (
        <section className="mx-auto mb-10 max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-amber-400" />
          <p className="text-lg font-bold">{sub.plan_name}</p>
          <p className="text-sm text-muted-foreground">
            {sub.status === "trialing" ? "Período de teste" : "Assinatura ativa"} · Válido até{" "}
            {new Date(sub.current_period_end + "Z").toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/dashboard/subscription" className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Gerenciar</Link>
          </div>
        </section>
      )}

      {/* ── Comparison Cards ── */}
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {/* Free Plan */}
        <div className="glass-panel flex flex-col rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading text-xl font-bold">Gratuito</h3>
          <p className="mt-1 text-sm text-muted-foreground">Para começar a ler e explorar.</p>
          <div className="my-4">
            <span className="text-3xl font-black">Grátis</span>
          </div>
          <ul className="mb-6 flex-1 space-y-3">
            {freeFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/explore"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 py-3 text-sm font-bold transition-colors hover:bg-accent"
          >
            Explorar catálogo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Pro Plan */}
        <div className="relative flex flex-col rounded-2xl border-2 border-transparent bg-gradient-to-b from-amber-500/10 to-card p-6 shadow-lg shadow-amber-500/5"
          style={{
            backgroundClip: "padding-box",
            boxShadow: "0 0 0 1px rgba(251, 191, 36, 0.3), 0 20px 48px rgba(251, 191, 36, 0.08)",
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.25), rgba(139,92,246,0.15), rgba(251,191,36,0.10))",
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
              padding: "2px",
            }}
          />
          {proPlan && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-1 text-xs font-bold text-amber-950">Recomendado</div>}
          <h3 className="font-heading text-xl font-bold flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            Pro
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">A experiência completa, sem limites.</p>
          <div className="my-4">
            {proPlan ? (
              <>
                <span className="text-3xl font-black">{formatBRL(proPlan.price_cents)}</span>
                <span className="text-muted-foreground">/{formatInterval(proPlan.interval)}</span>
              </>
            ) : (
              <span className="text-xl font-bold text-muted-foreground">Em breve</span>
            )}
          </div>
          <ul className="mb-6 flex-1 space-y-3">
            {proFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {proPlan ? (
            <>
              <form action="/api/payments/checkout" method="POST">
                <input type="hidden" name="plan_id" value={proPlan.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 py-3 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-300"
                >
                  {user ? "Assinar agora" : "Faça login para assinar"}
                </button>
              </form>
              {user ? <PixPaymentButton planId={proPlan.id} /> : null}
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-3">
              Planos em breve
            </p>
          )}
        </div>
      </div>

      {/* ── Feature Comparison Table ── */}
      <section className="mx-auto mt-16 max-w-4xl">
        <h2 className="mb-6 text-center font-heading text-2xl font-bold">Comparação de recursos</h2>
        <div className="glass-panel overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="px-6 py-4 text-left font-heading font-bold">Recurso</th>
                <th className="px-6 py-4 text-center font-heading font-bold">Gratuito</th>
                <th className="px-6 py-4 text-center font-heading font-bold">
                  <span className="flex items-center justify-center gap-1.5">
                    <Crown className="h-4 w-4 text-amber-400" />
                    Pro
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Acesso ao catálogo", free: true, pro: true },
                { label: "Número de obras", free: "1 obra", pro: "Ilimitado" },
                { label: "Anúncios", free: true, pro: false },
                { label: "Badges exclusivos", free: false, pro: true },
                { label: "Download de capítulos", free: false, pro: true },
                { label: "Prioridade no suporte", free: false, pro: true },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/20 last:border-0">
                  <td className="px-6 py-4 font-medium">{row.label}</td>
                  <td className="px-6 py-4 text-center">
                    {typeof row.free === "boolean" ? (
                      row.free ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                      )
                    ) : (
                      <span className="text-muted-foreground">{row.free}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-500" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                      )
                    ) : (
                      <span className="text-muted-foreground">{row.pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Existing Plans from DB ── */}
      {!sub && plans.length > 1 && (
        <section className="mx-auto mt-16">
          <h2 className="mb-6 text-center font-heading text-2xl font-bold">Todos os planos</h2>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const features: string[] = (() => { try { const f = JSON.parse(plan.features as string); return Array.isArray(f) ? f : []; } catch { return []; } })();
              const monthlyPrice = plan.interval === "year" ? Math.round(plan.price_cents / 12) : plan.price_cents;
              const savings = plan.interval === "year" ? (1990 * 12) - plan.price_cents : 0;
              return (
                <div key={plan.id} className={`relative flex flex-col rounded-2xl border p-6 ${plan.id === "pro-yearly" ? "border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-card shadow-lg shadow-amber-500/5" : "border-border/60 bg-card"}`}>
                  {plan.id === "pro-yearly" && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-xs font-bold text-amber-950">Melhor valor</div>}
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="my-4">
                    <span className="text-3xl font-black">{formatBRL(plan.price_cents)}</span>
                    <span className="text-muted-foreground">/{formatInterval(plan.interval)}</span>
                    {plan.interval === "year" && <p className="mt-1 text-xs text-emerald-500">~{formatBRL(monthlyPrice)}/mês · Economia de {formatBRL(savings)}</p>}
                  </div>
                  <ul className="mb-6 flex-1 space-y-2">
                    {features.map((f: string, i: number) => (<li key={i} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{f}</span></li>))}
                  </ul>
                  <form action="/api/payments/checkout" method="POST">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <button type="submit" className={`w-full rounded-xl py-3 text-sm font-bold transition-colors ${plan.id === "pro-yearly" ? "bg-amber-500 text-amber-950 hover:bg-amber-400" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                      {user ? "Assinar agora" : "Faça login para assinar"}
                    </button>
                  </form>
                  {user ? <PixPaymentButton planId={plan.id} /> : null}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mx-auto mt-16 max-w-2xl rounded-2xl border border-border/50 bg-card/50 p-6 text-center">
        <h2 className="font-heading text-xl font-bold">Já é assinante?</h2>
        <p className="mt-2 text-muted-foreground">Acesse o painel para gerenciar sua assinatura.</p>
        <Link href="/dashboard/subscription" className="mt-4 inline-block rounded-xl border border-border/60 px-6 py-2 text-sm font-medium hover:bg-accent">Ir para o painel</Link>
      </section>
    </main>
    </>
  );
}
