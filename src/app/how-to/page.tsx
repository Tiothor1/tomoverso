import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, ImageIcon, Users, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "Como criar uma Light Novel — Tomoverso",
  description: "Tutorial completo pra você criar e publicar sua primeira LN.",
};

const steps = [
  {
    n: "01",
    title: "Tenha uma ideia central",
    desc: "Toda LN começa com um conceito que prende. Pode ser: um mundo único, uma mecânica de poder, um protagonista com problema específico, ou um cenário de fantasia com twist.",
    icon: Lightbulb,
    tips: [
      "Não precisa ser original — precisa ser bem executado",
      "Combine 2-3 elementos de genres diferentes (ex: isekai + culinária + mistério)",
      "Pense no que diferencia sua história das 10 mil já publicadas",
    ],
  },
  {
    n: "02",
    title: "Crie um protagonista que o leitor quer acompanhar",
    desc: "O protagonista é quem carrega a história. Ele precisa de: objetivo claro, defeito real, e pelo menos 1 coisa que o leitor se identifica.",
    icon: Users,
    tips: [
      "Evite protagonista perfeito. Deixa ele falhar, hesitar, errar",
      "O objetivo dele deve criar conflito (não pode ser alcançado fácil)",
      "Defeito de personalidade > defeito de habilidade",
    ],
  },
  {
    n: "03",
    title: "Mapeie o mundo e as regras",
    desc: "Antes de escrever, defina: como a magia/sistema funciona, quem são os vilões, qual o arco principal. Não precisa detalhar tudo — só o suficiente pra não se contradizer.",
    icon: BookOpen,
    tips: [
      "Crie 1 página de 'regras do mundo' que você consulta antes de cada cap",
      "Defina 3-5 locais principais",
      "Tenha 1 vilão com motivação compreensível (mesmo que errado)",
    ],
  },
  {
    n: "04",
    title: "Planeje o arco do primeiro arco (5-10 caps)",
    desc: "Antes de escrever, esboce: situação inicial → eventos que mudam tudo → clímax do arco → estado novo. Isso te dá direção.",
    icon: PenLine,
    tips: [
      "1 capítulo = 1 cena, 1 objetivo, 1 conflito",
      "Final de capítulo precisa de gancho (o leitor tem que clicar no próximo)",
      "Cada 3-4 caps: 1 momento de descanso + 1 reviravolta",
    ],
  },
  {
    n: "05",
    title: "Crie a capa",
    desc: "A capa é a primeira impressão. Use ferramentas de IA (Midjourney, Leonardo, ComfyUI) pra gerar. Estilo anime/mangá vende mais no nicho.",
    icon: ImageIcon,
    tips: [
      "Personagem central com expressão clara",
      "Fundo que dá ideia do cenário",
      "Título legível mesmo em thumbnail pequeno",
    ],
  },
  {
    n: "06",
    title: "Publique o primeiro capítulo",
    desc: "Crie sua conta no Tomoverso, cadastre sua novel, e poste o capítulo 1. Não espere ficar perfeito — publique e melhore com feedback.",
    icon: BookOpen,
    tips: [
      "Capítulo 1 deve terminar com pergunta ou promessa",
      "Comprimento ideal: 2.000-4.000 palavras",
      "Releia em voz alta — se travar a língua, reescreve",
    ],
  },
];

export default function HowToPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <Badge variant="secondary">Tutorial completo</Badge>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
          Como criar uma Light Novel
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Um guia direto ao ponto pra você sair do zero e publicar sua primeira
          LN neste fim de semana.
        </p>
      </div>

      {/* Intro */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6 space-y-2">
          <p className="text-lg">
            Light Novel não é sobre escrever bem — é sobre <strong>contar uma
            história que faz o leitor virar a página</strong>. A maioria das LNs
            famosas não tem a prosa mais bonita do mundo; tem ritmo, gancho, e
            personagens que importam.
          </p>
          <p>
            Esse tutorial te leva do zero até o capítulo 1 publicado. Se você
            seguir passo a passo, em 1 semana tem uma LN no ar.
          </p>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-6">
        {steps.map(({ n, title, desc, icon: Icon, tips }) => (
          <Card key={n}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="text-5xl font-heading font-bold text-primary/20">
                  {n}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-2xl">{title}</CardTitle>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">{desc}</p>
              <div>
                <div className="text-sm font-semibold mb-2 text-primary">Dicas práticas:</div>
                <ul className="space-y-1.5">
                  {tips.map((t, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary mt-0.5">▸</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* CTA */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <h2 className="font-heading text-2xl md:text-3xl font-bold">
            Bora publicar?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Você tem o tutorial. Agora falta só começar. Cria sua conta, posta o
            capítulo 1, e deixa o mundo ler.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              Criar conta grátis <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
