import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, ImageIcon, Users, Lightbulb, Heart, Globe, Sparkles, Layers, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    n: "01",
    title: "Tenha uma ideia central",
    desc: "Toda LN começa com um conceito que prende. Pode ser: um mundo único, uma mecânica de poder, um protagonista com problema específico, ou um cenário de fantasia com twist.",
    icon: Lightbulb,
    color: "from-yellow-500/20 to-orange-500/20",
    tips: [
      "Não precisa ser original — precisa ser bem executado",
      "Combine 2-3 elementos de genres diferentes",
      "Pense no que diferencia sua história das 10 mil já publicadas",
    ],
  },
  {
    n: "02",
    title: "Crie um protagonista memorável",
    desc: "O protagonista é quem carrega a história. Ele precisa de: objetivo claro, defeito real, e pelo menos 1 coisa que o leitor se identifica.",
    icon: Users,
    color: "from-pink-500/20 to-purple-500/20",
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
    icon: Globe,
    color: "from-blue-500/20 to-cyan-500/20",
    tips: [
      "Crie 1 página de 'regras do mundo' que você consulta antes de cada cap",
      "Defina 3-5 locais principais",
      "Tenha 1 vilão com motivação compreensível (mesmo que errado)",
    ],
  },
  {
    n: "04",
    title: "Planeje o arco do primeiro arco",
    desc: "Antes de escrever, esboce: situação inicial → eventos que mudam tudo → clímax do arco → estado novo. Isso te dá direção.",
    icon: Compass,
    color: "from-emerald-500/20 to-teal-500/20",
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
    color: "from-violet-500/20 to-fuchsia-500/20",
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
    color: "from-rose-500/20 to-red-500/20",
    tips: [
      "Capítulo 1 deve terminar com pergunta ou promessa",
      "Comprimento ideal: 2.000-4.000 palavras",
      "Releia em voz alta — se travar a língua, reescreve",
    ],
  },
];

const features = [
  {
    icon: Layers,
    title: "Editor de capítulos",
    desc: "Editor rich text com auto-save, contagem de palavras, e preview de leitura.",
  },
  {
    icon: Sparkles,
    title: "Capas com IA",
    desc: "Gere capas únicas pro seu estilo com nosso assistente integrado.",
  },
  {
    icon: Heart,
    title: "Comunidade engajada",
    desc: "Comentários, favoritos, follows, e sistema de avaliação por leitores.",
  },
  {
    icon: PenLine,
    title: "Métricas detalhadas",
    desc: "Veja quantas pessoas leram, em que capítulo pararam, e o que comentaram.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border/40 bg-muted/20">
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-3">
            Tutorial completo
          </Badge>
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Como funciona
          </h2>
          <p className="text-muted-foreground mt-3">
            Em seis passos você sai do zero e publica sua primeira LN.
          </p>
        </div>

        <div className="space-y-4 mb-16">
          {steps.map(({ n, title, desc, icon: Icon, color, tips }) => (
            <Card
              key={n}
              className="overflow-hidden hover:border-primary/30 transition-colors"
            >
              <div className="grid md:grid-cols-[80px_1fr]">
                <div
                  className={`bg-gradient-to-br ${color} p-6 flex flex-col items-center justify-center text-center`}
                >
                  <Icon className="h-7 w-7 text-primary mb-2" />
                  <div className="font-heading text-3xl font-bold text-primary/50">
                    {n}
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-heading text-xl font-semibold">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{desc}</p>
                  <div>
                    <div className="text-xs font-semibold mb-1.5 text-primary uppercase tracking-wider">
                      Dicas práticas
                    </div>
                    <ul className="space-y-1">
                      {tips.map((t, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary mt-0.5">▸</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Features do site */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="p-2 rounded-lg bg-primary/10 w-fit mb-2">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
