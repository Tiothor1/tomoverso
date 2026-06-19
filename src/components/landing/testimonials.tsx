import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const reviews = [
  {
    name: "Lari_Otaku",
    initial: "L",
    role: "Leitora há 6 meses",
    rating: 5,
    text: "Finalmente um lugar pra LN BR séria. Já achei 3 novels aqui que viciaram meu mês. O sistema de tags é perfeito e a comunidade é super ativa nos comentários.",
    color: "bg-purple-500",
  },
  {
    name: "Yuki_Yamato",
    initial: "Y",
    role: "Autora iniciante",
    rating: 5,
    text: "Comecei a postar minha primeira LN aqui em março. Hoje tenho 200 seguidores fixos e meu capítulo 1 já foi lido 4 mil vezes. O painel do autor é simples e dá pra focar no que importa: escrever.",
    color: "bg-pink-500",
  },
  {
    name: "Rafael_Mago",
    initial: "R",
    role: "Leitor e beta reader",
    rating: 5,
    text: "Como beta reader, adoro poder ajudar autores iniciantes com feedback. O site tem um visual lindo, dark mode perfeito, e o feed de descoberta me fez achar pérolas escondidas.",
    color: "bg-blue-500",
  },
  {
    name: "MiaHime",
    initial: "M",
    role: "Leitora casual",
    rating: 4,
    text: "Não sou muito de ler, mas o algoritmo de feed me mostrou uma capa tão bonita que cliquei. Três horas depois, tinha lido 7 capítulos. Virei fã.",
    color: "bg-emerald-500",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-border/40 bg-muted/20">
      <div className="container mx-auto max-w-7xl px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            O que a comunidade diz
          </h2>
          <p className="text-muted-foreground mt-3">
            Autores e leitores compartilhando o que mudou pra eles.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {reviews.map((r, i) => (
            <Card
              key={r.name}
              className="relative overflow-hidden hover:border-primary/30 transition-colors"
            >
              <Quote className="absolute top-3 right-3 h-8 w-8 text-primary/10" />
              <CardContent className="pt-6 space-y-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-4 w-4 ${
                        idx < r.rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed italic">
                  "{r.text}"
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={r.color + " text-white font-semibold"}>
                      {r.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
