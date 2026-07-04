import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, BookOpen, Boxes, Brain, Crown, PenTool, Sparkles, Wand2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getAuthorPlusStatus } from "@/lib/author-plus";
import { authorPlusAssets, authorPlusBenefits, authorPlusTrails } from "@/lib/author-plus-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tomo Verso Autor+ — ferramentas para autores",
  description: "Central de ideias, assistente editorial, assets, trilhas e estatísticas para autores do Tomo Verso.",
};

const pillars = [
  { icon: Brain, title: "Central de Ideias", text: "Premissas, personagens, vilões, poderes, arcos e ganchos em poucos segundos." },
  { icon: Wand2, title: "Assistente Editorial", text: "Melhora sinopse, título, tags e começo do capítulo para vender melhor a obra." },
  { icon: Boxes, title: "Pack de Assets", text: "Templates de capa, banners, divisórias, fichas e prompts de referência." },
  { icon: BookOpen, title: "Trilhas de Criação", text: "Passo a passo para primeira obra, romance, sistema de poderes e capítulo estilo manhwa." },
  { icon: BarChart3, title: "Estatísticas Avançadas", text: "Entenda leituras, capítulos fortes, queda de leitores e próxima ação editorial." },
  { icon: BadgeCheck, title: "Perfil Premium", text: "Selo Autor+, vitrine melhorada e apresentação mais confiável para leitores." },
];

export default async function AuthorPlusPage() {
  const user = await getCurrentUser().catch(() => null);
  const db = getDb();
  const status = user ? getAuthorPlusStatus(db, user.id) : { active: false };
  const ctaHref = status.active ? "/dashboard/autor-plus" : user ? "/store/plans" : "/auth/signup";
  const ctaLabel = status.active ? "Abrir minha Central Autor+" : user ? "Virar Autor+" : "Criar conta grátis";

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(168,85,247,.24),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(245,158,11,.2),transparent_28%)]" />
        <div className="container relative mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1fr_420px] lg:items-center lg:py-24">
          <div className="space-y-7">
            <Badge className="rounded-full bg-amber-400 text-amber-950 hover:bg-amber-400"><Crown className="mr-1.5 h-3.5 w-3.5" /> Autor+</Badge>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-black tracking-tight md:text-6xl">Publicar é grátis. Evoluir como autor é Autor+.</h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">O Tomo Verso não bloqueia publicação. O Autor+ entrega ferramentas profissionais para transformar ideia solta em obra com cara de editora.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full bg-amber-400 text-amber-950 hover:bg-amber-300"><Link href={ctaHref}>{ctaLabel}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="rounded-full"><Link href="/dashboard/novels/new"><PenTool className="mr-2 h-4 w-4" />Publicar grátis</Link></Button>
            </div>
          </div>
          <Card className="border-amber-500/25 bg-card/80 shadow-2xl shadow-amber-500/10 backdrop-blur">
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-400" /> O que o Autor+ desbloqueia</CardTitle></CardHeader>
            <CardContent className="space-y-3">{authorPlusBenefits.slice(0, 6).map((benefit)=><div key={benefit} className="flex gap-3 rounded-xl bg-muted/35 p-3 text-sm"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{benefit}</span></div>)}</CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 max-w-2xl"><h2 className="font-heading text-3xl font-black">Ferramentas que a pessoa sente vontade de pagar</h2><p className="mt-2 text-muted-foreground">Não é limite artificial. É vantagem real para criar melhor, apresentar melhor e entender os leitores.</p></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pillars.map((item)=><Card key={item.title} className="transition hover:border-primary/40"><CardContent className="p-6"><item.icon className="mb-4 h-7 w-7 text-primary" /><h3 className="font-heading text-xl font-bold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p></CardContent></Card>)}</div>
      </section>

      <section className="border-y border-border/50 bg-muted/20">
        <div className="container mx-auto grid max-w-7xl gap-6 px-4 py-14 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Assets inclusos</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{authorPlusAssets.map((a)=><div key={a.id} className="rounded-xl border border-border/50 p-3"><Badge variant="secondary">{a.type}</Badge><p className="mt-2 font-bold">{a.title}</p><p className="text-xs text-muted-foreground">{a.format}</p></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Trilhas guiadas</CardTitle></CardHeader><CardContent className="space-y-3">{authorPlusTrails.map((t)=><div key={t.id} className="rounded-xl border border-border/50 p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold">{t.title}</p><Badge variant="outline">{t.time}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{t.steps.join(" → ")}</p></div>)}</CardContent></Card>
        </div>
      </section>
    </main>
  );
}
