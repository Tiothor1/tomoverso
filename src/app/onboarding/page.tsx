import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ArrowRight, CheckCircle, PenLine, Share2, UserPlus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Primeiros passos — Tomo Verso Editora",
};

const steps = [
  {
    number: 1,
    title: "Crie sua conta",
    description: "Cadastre-se gratuitamente e tenha acesso a todas as ferramentas da plataforma.",
    icon: UserPlus,
    href: "/auth/signup",
    buttonLabel: "Criar conta",
  },
  {
    number: 2,
    title: "Publique sua primeira obra",
    description: "Registre sua novel ou mangá e configure capa, sinopse e gêneros.",
    icon: BookOpen,
    href: "/dashboard/novels/new",
    buttonLabel: "Publicar obra",
  },
  {
    number: 3,
    title: "Escreva o primeiro capítulo",
    description: "Escreva e publique o primeiro capítulo da sua história.",
    icon: PenLine,
    href: "/dashboard",
    buttonLabel: "Escrever capítulo",
  },
  {
    number: 4,
    title: "Compartilhe com amigos",
    description: "Divulgue sua obra nas redes sociais e conquiste seus primeiros leitores.",
    icon: Share2,
    href: "/explore",
    buttonLabel: "Explorar obras",
  },
];

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signup");

  return (
    <main className="aurora-bg container mx-auto max-w-5xl space-y-10 px-4 py-12">
      {/* Header */}
      <section className="mx-auto max-w-2xl text-center">
        <div className="neon-badge mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-primary">
          <CheckCircle className="h-4 w-4" />
          Bem-vindo ao Tomo Verso
        </div>
        <h1 className="gradient-text font-heading text-4xl font-black tracking-tight md:text-5xl">
          Primeiros passos
        </h1>
        <p className="mt-3 text-muted-foreground">
          Em poucos minutos você começa a publicar suas histórias. Siga o passo a passo abaixo.
        </p>
      </section>

      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => (
          <Card key={step.number} className="neon-card">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:gap-6">
              {/* Step Number */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="font-heading text-2xl font-black text-primary">{step.number}</span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex md:flex-col md:items-center md:self-stretch">
                  <div className="h-full w-px bg-gradient-to-b from-primary/40 to-primary/5" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <step.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-heading text-lg font-bold">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>

              {/* Action */}
              <Button asChild className="neon-button shrink-0">
                <Link href={step.href}>
                  {step.buttonLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tip */}
      <section className="glass-panel mx-auto max-w-2xl rounded-2xl p-6 text-center">
        <h2 className="font-heading text-lg font-bold">Dica</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Você pode acessar esse guia a qualquer momento pelo menu da plataforma. Boas histórias!
        </p>
      </section>
    </main>
  );
}
