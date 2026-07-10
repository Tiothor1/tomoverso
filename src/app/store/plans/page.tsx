import Link from "next/link";
import { ArrowRight, BadgeCheck, Brain, CalendarDays, Check, Crown, Download, PenTool, ShieldCheck, Sparkles, Wand2, X } from "lucide-react";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActivePlans, getUserActiveSubscription, formatBRL, formatInterval } from "@/lib/subscriptions";
import { authorPlusBenefits, isAuthorPlusSubscription } from "@/lib/author-plus";
import { PixPaymentButton } from "@/components/payments/pix-payment-button";
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

function parseFeatures(plan: any): string[] {
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

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70">
          <CardHeader><CardTitle>Gratuito</CardTitle><p className="text-sm text-muted-foreground">Para todo autor começar sem barreira.</p></CardHeader>
          <CardContent className="flex h-full flex-col">
            <div className="mb-5 text-3xl font-black">R$ 0</div>
            <ul className="mb-6 flex-1 space-y-3">{freeFeatures.map((f)=><li key={f} className="flex gap-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{f}</li>)}</ul>
            <Button asChild variant="outline" className="rounded-xl"><Link href={user ? "/dashboard/novels/new" : "/auth/signup"}><PenTool className="mr-2 h-4 w-4" />Publicar grátis</Link></Button>
          </CardContent>
        </Card>

        <Card className="border-primary/25">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Pro Leitor</CardTitle><p className="text-sm text-muted-foreground">Experiência premium para ler melhor.</p></CardHeader>
          <CardContent>
            <div className="mb-5">{proPlan ? <><span className="text-3xl font-black">{formatBRL(proPlan.price_cents)}</span><span className="text-muted-foreground">/{formatInterval(proPlan.interval)}</span></> : <span className="text-xl font-bold text-muted-foreground">Em breve</span>}</div>
            <ul className="mb-6 space-y-3">{(proPlan ? parseFeatures(proPlan) : readerFeatures).slice(0, 7).map((f)=><li key={f} className="flex gap-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{f}</li>)}</ul>
            {proPlan ? <><form action="/api/payments/checkout" method="POST"><input type="hidden" name="plan_id" value={proPlan.id} /><Button type="submit" className="w-full rounded-xl">{user ? "Assinar Pro" : "Entrar para assinar"}</Button></form><div className="mt-2 flex gap-2">{user ? <><PixPaymentButton planId={proPlan.id} /><form action="/api/payments/preapproval" method="POST"><input type="hidden" name="plan_id" value={proPlan.id} /><Button type="submit" size="sm" variant="outline" className="flex-1 rounded-xl text-xs">Recorrente (cartão)</Button></form></> : null}</div></> : null}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-card shadow-2xl shadow-amber-500/10">
          <div className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">Para autores</div>
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-amber-400" /> Autor+</CardTitle><p className="text-sm text-muted-foreground">Ferramentas reais para transformar ideia em obra publicável.</p></CardHeader>
          <CardContent>
            <div className="mb-5">{authorPlan ? <><span className="text-3xl font-black">{formatBRL(authorPlan.price_cents)}</span><span className="text-muted-foreground">/{formatInterval(authorPlan.interval)}</span></> : <span className="text-xl font-bold text-muted-foreground">Em breve</span>}</div>
            <ul className="mb-6 space-y-3">{authorPlusBenefits.slice(0, 6).map((f)=><li key={f} className="flex gap-3 text-sm"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />{f}</li>)}</ul>
            {authorPlan ? <><form action="/api/payments/checkout" method="POST"><input type="hidden" name="plan_id" value={authorPlan.id} /><Button type="submit" className="w-full rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300">{user ? "Virar Autor+" : "Entrar para virar Autor+"}<ArrowRight className="ml-2 h-4 w-4" /></Button></form><div className="mt-2 flex gap-2">{user ? <><PixPaymentButton planId={authorPlan.id} /><form action="/api/payments/preapproval" method="POST"><input type="hidden" name="plan_id" value={authorPlan.id} /><Button type="submit" size="sm" variant="outline" className="flex-1 rounded-xl text-xs">Recorrente (cartão)</Button></form></> : null}</div></> : null}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-card shadow-2xl shadow-emerald-500/10">
          <div className="absolute right-4 top-4 rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-emerald-950">3 meses grátis</div>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-400" /> Autor+ Anual</CardTitle><p className="text-sm text-muted-foreground">Paga uma vez e usa 12 meses. Melhor custo-benefício para autor sério.</p></CardHeader>
          <CardContent>
            <div className="mb-1">{authorYearlyPlan ? <><span className="text-3xl font-black">{formatBRL(authorYearlyPlan.price_cents)}</span><span className="text-muted-foreground">/{formatInterval(authorYearlyPlan.interval)}</span></> : <span className="text-xl font-bold text-muted-foreground">Em breve</span>}</div>
            <p className="mb-5 text-xs font-semibold text-emerald-400">equivale a R$ 14,93/mês · pague 9 e leve 12</p>
            <ul className="mb-6 space-y-3">{(authorYearlyPlan ? parseFeatures(authorYearlyPlan) : ["Todos os benefícios do Autor+", "3 meses grátis", "12 meses completos de acesso"]).map((f)=><li key={f} className="flex gap-3 text-sm"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{f}</li>)}</ul>
            {authorYearlyPlan ? <><form action="/api/payments/checkout" method="POST"><input type="hidden" name="plan_id" value={authorYearlyPlan.id} /><Button type="submit" className="w-full rounded-xl bg-emerald-400 text-emerald-950 hover:bg-emerald-300">{user ? "Assinar anual" : "Entrar para assinar"}<ArrowRight className="ml-2 h-4 w-4" /></Button></form><div className="mt-2 flex gap-2">{user ? <><PixPaymentButton planId={authorYearlyPlan.id} /><form action="/api/payments/preapproval" method="POST"><input type="hidden" name="plan_id" value={authorYearlyPlan.id} /><Button type="submit" size="sm" variant="outline" className="flex-1 rounded-xl text-xs">Recorrente (cartão)</Button></form></> : null}</div></> : null}
          </CardContent>
        </Card>
      </div>

      <section className="mt-14 overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/50 p-5"><h2 className="font-heading text-2xl font-bold">Comparação honesta</h2><p className="text-sm text-muted-foreground">Ninguém paga para ter permissão de publicar. Paga para ter ferramentas melhores.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border/40"><th className="p-4 text-left">Recurso</th><th className="p-4 text-center">Grátis</th><th className="p-4 text-center">Pro</th><th className="p-4 text-center">Autor+</th></tr></thead><tbody>{comparison.map((row)=><tr key={row.label} className="border-b border-border/20 last:border-0"><td className="p-4 font-medium">{row.label}</td><td className="p-4 text-center"><Cell value={row.free} /></td><td className="p-4 text-center"><Cell value={row.pro} /></td><td className="p-4 text-center"><Cell value={row.author} /></td></tr>)}</tbody></table></div>
      </section>

      <section className="mt-12 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-6 text-center">
        <Wand2 className="mx-auto mb-3 h-7 w-7 text-amber-400" />
        <h2 className="font-heading text-2xl font-bold">Quer ver antes de pagar?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Entre na Central Autor+ em modo preview. Você testa ideias e assistente editorial com limites; assets e trilhas avançadas ficam bloqueados até assinar.</p>
        <Button asChild variant="outline" className="mt-4 rounded-xl"><Link href={user ? "/dashboard/autor-plus" : "/auth/signup"}>Testar preview Autor+ <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
      </section>

      <section className="mt-8 rounded-xl border border-muted/30 bg-muted/10 p-5 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">ℹ️ Sobre renovação</p>
        <p className="mt-1 max-w-xl mx-auto">
          No momento, as assinaturas funcionam com pagamento manual. Cada ciclo (mês/ano) exige um novo pagamento.
          A renovação automática está em desenvolvimento e será ativada em breve.
        </p>
      </section>
    </main>
  );
}
