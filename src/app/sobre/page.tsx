import Link from "next/link";
import { Heart, BookOpen, Users, Sparkles, ArrowRight, Code2, MessageCircle, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sobre — Tomoverso",
  description: "A história por trás do Tomoverso e nossa missão.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-16">
      {/* Hero */}
      <div className="text-center space-y-4">
        <Badge variant="secondary" className="mb-2">Nossa história</Badge>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
          Por que o Tomoverso existe
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Um lugar pra Light Novels brasileiras deixarem de ser só um sonho
          no caderno e virarem histórias que todo mundo lê.
        </p>
      </div>

      {/* Manifesto */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-8 pb-8 space-y-4">
          <Heart className="h-10 w-10 text-primary" />
          <h2 className="font-heading text-2xl md:text-3xl font-bold">O manifesto</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              Você alguma vez já escreveu uma história inteira no caderno da escola
              e nunca mostrou pra ninguém? Já teve uma ideia de fantasia que parecia
              incrível na sua cabeça, mas que morreu porque não tinha onde postar?
            </p>
            <p>
              O <strong className="text-foreground">Tomoverso</strong> nasceu disso.
              Da vontade de criar um espaço onde a história que você escreveu às 3
              da manhã, ou o personagem que você inventou na aula de matemática,
              possa encontrar quem vai amar eles.
            </p>
            <p>
              Aqui não importa se você nunca publicou nada. Não importa se sua
              escrita tem defeito. Importa que você tem uma história pra contar.
              O resto a gente resolve junto.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pilares */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            icon: BookOpen,
            title: "Pra leitores vorazes",
            desc: "Feed personalizado, discovery, gêneros nichados. Você vai achar aquela LN que vai te tomar o sono.",
          },
          {
            icon: Users,
            title: "Pra autores iniciantes",
            desc: "Editor simples, painel fácil, sem enfeite. Você foca em escrever, a gente cuida do resto.",
          },
          {
            icon: Sparkles,
            title: "Pra comunidade BR",
            desc: "Comentários, reviews, follows, notificações. Leitor e autor conversam, trocam, crescem juntos.",
          },
        ].map((p) => (
          <Card key={p.title}>
            <CardContent className="pt-6 space-y-3">
              <div className="p-3 rounded-lg bg-primary/10 w-fit">
                <p.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roadmap */}
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6">
          A estrada pela frente
        </h2>
        <div className="space-y-3">
          {[
            { fase: "1", status: "feito", titulo: "Site no ar", desc: "Landing, catálogo, leitura, painel de autor básico." },
            { fase: "2", status: "agora", titulo: "Autenticação + Supabase", desc: "Login, cadastro, persistência real. Painel completo do autor." },
            { fase: "3", status: "futuro", titulo: "Comunidade e métricas", desc: "Comentarios, follows, ratings, analytics detalhado pra autores." },
            { fase: "4", status: "futuro", titulo: "Monetização pra autores", desc: "Capítulos premium, doações via PIX, split de receita." },
            { fase: "5", status: "sonho", titulo: "App mobile", desc: "iOS e Android com leitor offline, notificações push, e feed nativo." },
          ].map((r) => (
            <div
              key={r.fase}
              className={`flex items-start gap-4 p-4 rounded-lg border ${
                r.status === "agora"
                  ? "border-primary/50 bg-primary/5"
                  : r.status === "feito"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border/40 bg-muted/20"
              }`}
            >
              <div
                className={`font-heading font-bold text-2xl w-10 text-center ${
                  r.status === "agora"
                    ? "text-primary"
                    : r.status === "feito"
                    ? "text-emerald-500"
                    : "text-muted-foreground/40"
                }`}
              >
                {r.fase}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{r.titulo}</h3>
                  {r.status === "agora" && (
                    <Badge variant="default" className="text-[10px]">Em construção</Badge>
                  )}
                  {r.status === "feito" && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-400">
                      ✓ Feito
                    </Badge>
                  )}
                  {r.status === "sonho" && (
                    <Badge variant="outline" className="text-[10px]">Sonho</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contato */}
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <h2 className="font-heading text-2xl font-bold">Bora conversar?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sugestões, bugs, ideias, parceria, ou só um oi. Pode mandar.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Code2 className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href="https://discord.gg" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer">
                <Send className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button size="lg" asChild>
          <Link href="/explore">
            Explorar novels <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
