import Link from "next/link";
import { BookOpen, Heart, Sparkles, ArrowRight, Mail, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sobre — Tomo Verso Editora",
  description: "Conheça a Tomo Verso Editora, uma editora digital dedicada a transformar histórias em experiências marcantes.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-16">
      {/* Hero */}
      <div className="text-center space-y-4">
        <Badge variant="secondary" className="mb-2">Quem somos</Badge>
        <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight">
          Tomo Verso Editora
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Uma editora digital brasileira dedicada a conectar leitores e autores através de
          histórias que marcam.
        </p>
      </div>

      {/* Missão */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-8 pb-8 space-y-4">
          <Heart className="h-10 w-10 text-primary" />
          <h2 className="font-heading text-2xl md:text-3xl font-bold">Nossa missão</h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              A Tomo Verso Editora nasceu com um propósito claro: transformar histórias em
              experiências marcantes. Somos uma editora digital que acredita no poder da
              imaginação, na força de narrativas originais e no talento dos autores brasileiros.
            </p>
            <p>
              Nosso catálogo reúne novels, light novels, mangás, manhwas e livros em um só
              universo — porque histórias boas não cabem em um rótulo só.
            </p>
            <p>
              Mais do que publicar, queremos ser o ponto de encontro entre quem escreve e
              quem lê. Um espaço onde autores encontram público, leitores encontram histórias
              que combinam com eles, e a comunidade cresce junto.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pilares */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            icon: BookOpen,
            title: "Catálogo diverso",
            desc: "Light novels, mangás, manhwas, livros e originais brasileiros. Curadoria que valoriza qualidade e originalidade acima de tudo.",
          },
          {
            icon: Users,
            title: "Autores em primeiro lugar",
            desc: "Ferramentas pra publicar, métricas pra acompanhar, e um público real lendo. Sem burocracia, sem barreiras.",
          },
          {
            icon: Sparkles,
            title: "Comunidade viva",
            desc: "Feed, comentários e interação direta entre leitores e autores. Cada história cria sua própria tribo.",
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

      {/* O que já temos */}
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6">
          O que oferecemos
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Catálogo com centenas de obras entre novels e mangás",
            "Leitor de páginas com tema escuro e claro",
            "Painel do autor pra publicar capítulos",
            "Busca inteligente por obra, autor, gênero ou tag",
            "Feed personalizado de descoberta",
            "Sistema de assinatura sem anúncios",
            "Publicação de obras originais BR",
            "Suporte a múltiplos idiomas na interface",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <span className="text-emerald-400 font-bold shrink-0">✓</span>
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contato */}
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <h2 className="font-heading text-2xl font-bold">Quer falar com a gente?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sugestões, parcerias, dúvidas ou só um oi. Tamo por aqui.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <a href="mailto:tomoversoeditora@gmail.com">
                <Mail className="mr-2 h-4 w-4" />
                tomoversoeditora@gmail.com
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button size="lg" asChild>
          <Link href="/explore">
            Explorar catálogo <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
