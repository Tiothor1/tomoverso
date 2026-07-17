import Link from "next/link";
import { ArrowRight, BadgeCheck, Brain, CalendarDays, Check, Crown, PenTool, ShieldCheck, Sparkles, Wand2, X } from "lucide-react";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActivePlans, getUserActiveSubscription, formatBRL } from "@/lib/subscriptions";
import { authorPlusBenefits, isAuthorPlusSubscription } from "@/lib/author-plus";
import { PixPaymentButton } from "@/components/payments/pix-payment-button";
import { PlanFaq } from "@/components/plans/plan-faq";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Planos — Tomo Verso Autor+",
};

const freeFeatures = [
  "Publicar obras gratuitamente",
  "Publicar capítulos sem pagar",
  "Aparecer no catálogo normal",
  "Receber leitores e comentários",
  "Perfil básico de autor",
  "TomoMusic: 7 músicas (catálogo limitado)",
];

const readerFeatures = [
  "Leitura sem anúncios",
  "Badge em comentários",
  "Download de capítulos",
  "Temas premium de leitura",
  "Suporte prioritário",
  "TomoMusic completo (130+ músicas)",
];

const comparison = [
  { label: "Publicar obras", free: "Livre", pro: "Livre", author: "Livre" },
  { label: "Central de ideias", free: "Preview", pro: "Preview", author: true },
  { label: "Assistente editorial", free: "Preview", pro: "Preview", author: true },
  { label: "Pack de assets", free: false, pro: false, author: true },
  { label: "Trilhas avançadas", free: false, pro: false, author: true },
  { label: "Estatísticas avançadas", free: false, pro: false, author: true },
  { label: "Perfil premium Autor+", free: false, pro: false, author: true },
  { label: "Sem anúncios", free: false, pro: true, author: true },
];

type ActionTone = "primary" | "amber" | "emerald";

function parseFeatures(plan: { features?: unknown }): string[] {
  try {
    const value = typeof plan.features === "string" ? JSON.parse(plan.features) : plan.features;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/35" />;
  }
  return <span className="text-xs font-medium text-muted-foreground">{value}</span>;
}

function PaidPlanActions({
  planId,
  signedIn,
  signedInLabel,
  signedOutLabel,
  tone = "primary",
}: {
  planId?: string;
  signedIn: boolean;
  signedInLabel: string;
  signedOutLabel: string;
  tone?: ActionTone;
}) {
  const primaryClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    amber: "bg-amber-400 text-amber-950 hover:bg-amber-300",
    emerald: "bg-emerald-400 text-emerald-950 hover:bg-emerald-300",
  }[tone];

  if (!planId) {
    return (
      <div className="plan-actions mt-auto pt-6">
        <Button disabled className="h-10 w-full rounded-xl">Em breve</Button>
      </div>
    );
  }

  return (
    <div className="plan-actions mt-auto pt-6">
      <form action="/api/payments/checkout" method="POST">
        <input type="hidden" name="plan_id" value={planId} />
        <Button type="submit" className={`h-10 w-full rounded-xl ${primaryClasses}`}>
          {signedIn ? signedInLabel : signedOutLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      {signedIn && (
        <div className="mt-2 grid grid-cols-2 gap-2 max-[520px]:grid-cols-1">
          <PixPaymentButton planId={planId} />
          <form action="/api/payments/preapproval" method="POST" className="min-w-0">
            <input type="hidden" name="plan_id" value={planId} />
            <Button type="submit" variant="outline" className="h-10 w-full rounded-xl px-2 text-xs">
              Recorrente no cartão
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function PlansPage({ searchParams }: { searchParams?: Promise<{ error?: string; mp_failure?: string }> }) {
  const db = getDb();
  const user = await getCurrentUser().catch(() => null);
  const plans = getActivePlans();
  const sub = user ? getUserActiveSubscription(db, user.id) : null;
  const isAuthorPlus = isAuthorPlusSubscription(sub);
  const params = searchParams ? await searchParams : {};
  const paymentError = params.error || (params.mp_failure ? "mp_failure" : "");
  const proPlan = plans.find((plan) => plan.id === "pro-monthly") || plans.find((plan) => String(plan.name).toLowerCase().includes("pro"));
  const authorPlan = plans.find((plan) => plan.id === "author-monthly") || plans.find((plan) => String(plan.role_granted).toLowerCase() === "author" && plan.interval === "month");
  const authorYearlyPlan = plans.find((plan) => plan.id === "author-yearly") || plans.find((plan) => String(plan.role_granted).toLowerCase() === "author" && plan.interval === "year");
  const annualMonthlyEquivalent = authorYearlyPlan ? Math.round(Number(authorYearlyPlan.price_cents) / 12) : null;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-10">
      <section className="mx-auto mb-10 max-w-3xl text-center">
        <Badge className="mb-4 rounded-full bg-amber-400 text-amber-950 hover:bg-amber-400"><Crown className="mr-1.5 h-3.5 w-3.5" /> Tomo Verso Autor+</Badge>
        <h1 className="font-heading text-4xl font-black tracking-tight md:text-5xl">Publicar é grátis. Autor+ é para criar melhor.</h1>
        <p className="mt-4 text-muted-foreground md:text-lg">
          {sub ? `Você está no plano ${sub.plan_name}.` : "A gente não cobra para o autor postar. Os planos pagos desbloqueiam ferramentas, assets e inteligência editorial."}
        </p>
      </section>

      {paymentError && (
        <section className="mx-auto mb-8 max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <p className="font-bold">Não foi possível iniciar o pagamento.</p>
          <p className="mt-1 text-red-100/80">{paymentError === "mp_missing_token" ? "O Mercado Pago ainda não está configurado." : "Tente novamente em instantes."}</p>
        </section>
      )}

      {isAuthorPlus && (
        <section className="mx-auto mb-8 max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-amber-400" />
          <p className="font-bold">Autor+ ativo</p>
          <p className="text-sm text-muted-foreground">Sua Central de Ideias, Assets e Estatísticas já está liberada.</p>
          <Button asChild className="mt-4 rounded-xl"><Link href="/dashboard/autor-plus">Abrir Central Autor+</Link></Button>
        </section>
      )}

      <div className="grid auto-rows-fr items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card className="plan-card h-full min-w-0 border-border/70">
          <CardHeader className="min-h-[9.5rem]">
            <CardTitle>Gratuito</CardTitle>
            <p className="text-sm text-muted-foreground">Para todo autor começar sem barreira.</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="mb-5 min-h-[5.25rem]">
              <span className="text-3xl font-black">R$ 0</span>
              <p className="mt-1 text-sm text-muted-foreground">Para publicar sem custo.</p>
            </div>
            <ul className="plan-benefits mb-6 flex-1 space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{feature}</li>
              ))}
            </ul>
            <div className="plan-actions mt-auto pt-6">
              <Button asChild variant="outline" className="h-10 w-full rounded-xl">
                <Link href={user ? "/dashboard/novels/new" : "/auth/signup"}><PenTool className="mr-2 h-4 w-4" />Publicar grátis</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="plan-card h-full min-w-0 border-primary/25">
          <CardHeader className="min-h-[9.5rem]">
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Pro Leitor</CardTitle>
            <p className="text-sm text-muted-foreground">Experiência premium para ler melhor.</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="mb-5 min-h-[5.25rem]">
              {proPlan ? <><span className="text-3xl font-black">{formatBRL(proPlan.price_cents)}</span><p className="mt-1 text-sm text-muted-foreground">por mês</p></> : <span className="text-xl font-bold text-muted-foreground">Em breve</span>}
            </div>
            <ul className="plan-benefits mb-6 flex-1 space-y-3">
              {(proPlan ? parseFeatures(proPlan) : readerFeatures).slice(0, 7).map((feature) => (
                <li key={feature} className="flex gap-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{feature}</li>
              ))}
            </ul>
            <PaidPlanActions planId={proPlan?.id} signedIn={Boolean(user)} signedInLabel="Assinar Pro" signedOutLabel="Entrar para assinar" />
          </CardContent>
        </Card>

        <Card className="plan-card relative h-full min-w-0 overflow-hidden border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-card shadow-xl shadow-amber-500/10">
          <div className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">Para autores</div>
          <CardHeader className="min-h-[9.5rem] pr-28">
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-amber-400" /> Autor+</CardTitle>
            <p className="text-sm text-muted-foreground">Ferramentas reais para transformar ideia em obra publicável.</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="mb-5 min-h-[5.25rem]">
              {authorPlan ? <><span className="text-3xl font-black">{formatBRL(authorPlan.price_cents)}</span><p className="mt-1 text-sm text-muted-foreground">por mês</p></> : <span className="text-xl font-bold text-muted-foreground">Em breve</span>}
            </div>
            <ul className="plan-benefits mb-6 flex-1 space-y-3">
              {authorPlusBenefits.slice(0, 6).map((feature) => (
                <li key={feature} className="flex gap-3 text-sm"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />{feature}</li>
              ))}
            </ul>
            <PaidPlanActions planId={authorPlan?.id} signedIn={Boolean(user)} signedInLabel="Virar Autor+" signedOutLabel="Entrar para virar Autor+" tone="amber" />
          </CardContent>
        </Card>

        <Card className="plan-card relative h-full min-w-0 overflow-hidden border-emerald-500/35 bg-gradient-to-b from-emerald-500/10 to-card shadow-xl shadow-emerald-500/[0.09] ring-1 ring-emerald-400/10">
          <div className="absolute right-4 top-4 rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-emerald-950">3 meses grátis</div>
          <CardHeader className="min-h-[9.5rem] pr-28">
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-400" /> Autor+ Anual</CardTitle>
            <p className="text-sm text-muted-foreground">12 meses de ferramentas para quem quer manter o ritmo de criação.</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="mb-5 min-h-[5.25rem]">
              {authorYearlyPlan && annualMonthlyEquivalent ? <>
                <span className="text-3xl font-black text-emerald-400">{formatBRL(annualMonthlyEquivalent)}</span>
                <p className="mt-1 text-sm font-semibold text-emerald-400">por mês</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatBRL(authorYearlyPlan.price_cents)} cobrados anualmente</p>
              </> : <span className="text-xl font-bold text-muted-foreground">Em breve</span>}
            </div>
            <ul className="plan-benefits mb-6 flex-1 space-y-3">
              {(authorYearlyPlan ? parseFeatures(authorYearlyPlan) : ["Todos os benefícios do Autor+", "3 meses grátis", "12 meses completos de acesso"]).map((feature) => (
                <li key={feature} className="flex gap-3 text-sm"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{feature}</li>
              ))}
            </ul>
            <PaidPlanActions planId={authorYearlyPlan?.id} signedIn={Boolean(user)} signedInLabel="Assinar anual" signedOutLabel="Entrar para assinar" tone="emerald" />
          </CardContent>
        </Card>
      </div>

      <PlanFaq />

      <section className="mt-14 overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/50 p-5"><h2 className="font-heading text-2xl font-bold">Comparação honesta</h2><p className="text-sm text-muted-foreground">Ninguém paga para ter permissão de publicar. Paga para ter ferramentas melhores.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border/40"><th className="p-4 text-left">Recurso</th><th className="p-4 text-center">Grátis</th><th className="p-4 text-center">Pro</th><th className="p-4 text-center">Autor+</th></tr></thead><tbody>{comparison.map((row) => <tr key={row.label} className="border-b border-border/20 last:border-0"><td className="p-4 font-medium">{row.label}</td><td className="p-4 text-center"><Cell value={row.free} /></td><td className="p-4 text-center"><Cell value={row.pro} /></td><td className="p-4 text-center"><Cell value={row.author} /></td></tr>)}</tbody></table></div>
      </section>

      <section className="mt-12 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-6 text-center">
        <Wand2 className="mx-auto mb-3 h-7 w-7 text-amber-400" />
        <h2 className="font-heading text-2xl font-bold">Quer ver antes de pagar?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Entre na Central Autor+ em modo preview. Você testa ideias e assistente editorial com limites; assets e trilhas avançadas ficam bloqueados até assinar.</p>
        <Button asChild variant="outline" className="mt-4 rounded-xl"><Link href={user ? "/dashboard/autor-plus" : "/auth/signup"}>Testar preview Autor+ <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </section>
    </main>
  );
}
