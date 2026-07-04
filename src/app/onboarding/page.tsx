import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ArrowRight, BookOpen, Compass, Library, PenLine, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Primeiros passos — Tomo Verso Editora",
};

const steps = [
  {
    number: 1,
    title: "Comece lendo algo agora",
    description: "Abra o catálogo e escolha uma obra pra sentir o ritmo da plataforma antes de publicar.",
    icon: Compass,
    href: "/explore",
    buttonLabel: "Ver catálogo",
  },
  {
    number: 2,
    title: "Veja mangás e manhwas em alta",
    description: "Se quiser leitura rápida no celular, comece pelas séries com mais capítulos.",
    icon: BookOpen,
    href: "/manga",
    buttonLabel: "Ler mangás",
  },
  {
    number: 3,
    title: "Publique sua primeira obra",
    description: "Cadastre título, sinopse, gêneros e capa da sua história no painel do autor.",
    icon: PenLine,
    href: "/dashboard/novels/new",
    buttonLabel: "Publicar obra",
  },
  {
    number: 4,
    title: "Organize sua estante",
    description: "Salve leituras, acompanhe progresso e volte depois de onde parou.",
    icon: Library,
    href: "/library",
    buttonLabel: "Minha estante",
  },
];

export default async function OnboardingPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/auth/signup");

  return (
    <main className="aurora-bg container mx-auto max-w-5xl space-y-10 px-4 py-12">
      <section className="mx-auto max-w-2xl text-center">
        <div className="neon-badge mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" />
          Conta criada. Agora escolha seu caminho.
        </div>
        <h1 className="gradient-text font-heading text-4xl font-black tracking-tight md:text-5xl">
          Primeiros passos
        </h1>
        <p className="mt-3 text-muted-foreground">
          Você já está dentro do Tomo Verso. Dá pra ler, explorar mangás ou publicar sua primeira obra — sem criar conta de novo.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="rounded-full">
            <Link href="/dashboard/novels/new">
              <PenLine className="h-4 w-4" /> Publicar primeira obra
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard">
              <X className="h-4 w-4" /> Pular por agora
            </Link>
          </Button>
        </div>
      </section>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <Card key={step.number} className="neon-card">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:gap-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="font-heading text-2xl font-black text-primary">{step.number}</span>
              </div>

              {index < steps.length - 1 ? (
                <div className="hidden md:flex md:flex-col md:items-center md:self-stretch">
                  <div className="h-full w-px bg-gradient-to-b from-primary/40 to-primary/5" />
                </div>
              ) : null}

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <step.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-heading text-lg font-bold">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>

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

      <section className="glass-panel mx-auto max-w-2xl rounded-2xl p-6 text-center">
        <h2 className="font-heading text-lg font-bold">Sem pressão</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Se não quiser configurar nada agora, pule para o painel e volte quando quiser.
        </p>
        <Button asChild variant="ghost" className="mt-3 rounded-full">
          <Link href="/dashboard">Sair dos primeiros passos</Link>
        </Button>
      </section>
    </main>
  );
}
